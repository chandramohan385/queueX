/**
 * File utilities for previewing, converting, and printing customer documents
 */

export function base64ToBlob(base64Data: string, mimeType: string = 'application/pdf'): Blob {
  try {
    const base64Clean = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const byteCharacters = atob(base64Clean);
    const sliceSize = 1024 * 512; // 512KB chunks for high performance
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Uint8Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(byteNumbers);
    }

    return new Blob(byteArrays as BlobPart[], { type: mimeType });
  } catch (err) {
    console.error('base64ToBlob error:', err);
    return new Blob([], { type: mimeType });
  }
}

export function createBlobUrl(fileUrl: string, mimeType: string = 'application/pdf'): {
  url: string;
  isBlob: boolean;
  cleanup: () => void;
} {
  if (fileUrl.startsWith('data:')) {
    try {
      const detectedMime =
        fileUrl.match(/^data:([^;]+);/)?.[1] || mimeType;
      const blob = base64ToBlob(fileUrl, detectedMime);
      const objectUrl = URL.createObjectURL(blob);
      return {
        url: objectUrl,
        isBlob: true,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      };
    } catch (e) {
      console.error('Failed to create object URL from data URL:', e);
      return { url: fileUrl, isBlob: false, cleanup: () => {} };
    }
  }

  return { url: fileUrl, isBlob: false, cleanup: () => {} };
}

export function printDocument(fileUrl: string, fileName: string, mimeType?: string) {
  const isImage =
    mimeType?.includes('image') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) ||
    fileUrl.startsWith('data:image/');

  const isPdf =
    mimeType?.includes('pdf') ||
    fileName.toLowerCase().endsWith('.pdf') ||
    fileUrl.startsWith('data:application/pdf');

  const { url: targetUrl, isBlob, cleanup } = createBlobUrl(
    fileUrl,
    isPdf ? 'application/pdf' : isImage ? 'image/png' : 'application/octet-stream'
  );

  if (isImage) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print - ${fileName}</title>
            <style>
              @page { size: auto; margin: 5mm; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
              img { max-width: 100%; max-height: 98vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${targetUrl}" onload="window.focus(); window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
      if (isBlob) {
        setTimeout(cleanup, 60000);
      }
    }
    return;
  }

  // For PDF: open blob URL in new tab which brings up Chrome's native PDF print view & triggers print
  const printWindow = window.open(targetUrl, '_blank');
  if (printWindow) {
    printWindow.focus();
    printWindow.addEventListener('load', () => {
      try {
        printWindow.print();
      } catch (e) {
        console.warn('PDF window load print trigger:', e);
      }
    });

    // Fallback trigger in case load event was already consumed
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (e) {
        console.warn('PDF timeout print trigger:', e);
      }
    }, 800);

    if (isBlob) {
      setTimeout(cleanup, 120000); // 2 minute cleanup
    }
  }
}

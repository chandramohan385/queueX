import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
  FileText,
  Image as ImageIcon,
  Printer
} from 'lucide-react';
import type { OrderFile } from '../types';
import { createBlobUrl, printDocument } from '../utils/fileUtils';

interface DocumentPreviewModalProps {
  file: OrderFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [blobState, setBlobState] = useState<{ url: string; isBlob: boolean } | null>(null);

  useEffect(() => {
    if (!file) {
      setBlobState(null);
      return;
    }

    const mime =
      file.mime_type ||
      (file.file_name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

    const { url, isBlob, cleanup } = createBlobUrl(file.file_url, mime);
    setBlobState({ url, isBlob });

    return () => {
      cleanup();
    };
  }, [file]);

  if (!isOpen || !file) return null;

  const displayUrl = blobState ? blobState.url : file.file_url;

  const isPdf =
    file.mime_type?.includes('pdf') ||
    file.file_name.toLowerCase().endsWith('.pdf') ||
    file.file_url.startsWith('data:application/pdf') ||
    file.file_url.toLowerCase().endsWith('.pdf');

  const isImage =
    file.mime_type?.includes('image') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_name) ||
    file.file_url.startsWith('data:image/');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  const handlePrint = () => {
    printDocument(file.file_url, file.file_name, file.mime_type);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Modal Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            {isPdf ? (
              <FileText className="w-5 h-5 text-rose-400 shrink-0" />
            ) : isImage ? (
              <ImageIcon className="w-5 h-5 text-sky-400 shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold truncate leading-tight">
                {file.file_name}
              </h3>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                {file.page_count ? <span>{file.page_count} pages</span> : null}
                {formatFileSize(file.file_size_bytes) && (
                  <>
                    <span>•</span>
                    <span>{formatFileSize(file.file_size_bytes)}</span>
                  </>
                )}
                <span>•</span>
                <span className="uppercase">{isPdf ? 'PDF Document' : isImage ? 'Image' : 'File'}</span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isImage && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-1">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold px-1.5 text-slate-300">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Direct Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Print this document directly"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Open in New Tab Button */}
            <a
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              title="Open document in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            {/* Download Button */}
            <a
              href={displayUrl}
              download={file.file_name}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              title="Download File to device"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white cursor-pointer transition-colors ml-1"
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-2 sm:p-4">
          {!displayUrl ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Preparing document view...</p>
            </div>
          ) : isPdf ? (
            <object
              data={`${displayUrl}#toolbar=1`}
              type="application/pdf"
              className="w-full h-full rounded-xl bg-white border border-slate-300 shadow-inner"
            >
              <iframe
                src={`${displayUrl}#toolbar=1`}
                className="w-full h-full rounded-xl bg-white border border-slate-300 shadow-inner"
                title={file.file_name}
              >
                <div className="p-8 text-center bg-white rounded-xl">
                  <p className="text-xs text-slate-600 mb-3">Your browser does not support inline PDF preview.</p>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg mr-2"
                  >
                    Print Document
                  </button>
                  <a
                    href={displayUrl}
                    download={file.file_name}
                    className="px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg"
                  >
                    Download PDF
                  </a>
                </div>
              </iframe>
            </object>
          ) : isImage ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={displayUrl}
                alt={file.file_name}
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg transition-transform duration-150"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h4 className="text-base font-bold text-slate-800 mb-1">{file.file_name}</h4>
              <p className="text-xs text-slate-500 mb-6">
                Direct in-browser preview is not supported for this file format. You can download or print it directly.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print File</span>
                </button>
                <a
                  href={displayUrl}
                  download={file.file_name}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

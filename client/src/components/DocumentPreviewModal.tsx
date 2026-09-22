import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Download, FileText, Image as ImageIcon } from 'lucide-react';
import type { OrderFile } from '../types';

interface DocumentPreviewModalProps {
  file: OrderFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isOpen || !file) return null;

  const isPdf =
    file.mime_type?.includes('pdf') ||
    file.file_name.toLowerCase().endsWith('.pdf') ||
    file.file_url.toLowerCase().endsWith('.pdf');

  const isImage =
    file.mime_type?.includes('image') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_name) ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.file_url);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

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
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold px-1.5 text-slate-300">
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
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}

            <a
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              title="Open in new window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <a
              href={file.file_url}
              download={file.file_name}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Download File"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

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
          {isPdf ? (
            <iframe
              src={`${file.file_url}#toolbar=1&navpanes=0`}
              className="w-full h-full rounded-xl bg-white border border-slate-300 shadow-inner"
              title={file.file_name}
            />
          ) : isImage ? (
            <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={file.file_url}
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
                Direct in-browser preview is not supported for this file format. You can download or view it externally.
              </p>
              <a
                href={file.file_url}
                download={file.file_name}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createOrder } from '../services/api';
import type { Service } from '../types';
import {
  ShoppingBag,
  Plus,
  Minus,
  FileUp,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  FileText,
  CheckCircle2,
  Copy,
  User,
  Phone,
  FileSpreadsheet,
  Check
} from 'lucide-react';

interface UploadedFileItem {
  name: string;
  size: number;
  pages: number;
  mimeType: string;
  dataUrl: string;
}

export const CustomerOrderPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step: 1 = Upload Files, 2 = Select Services, 3 = Customer Details & Confirm
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Files & Pages State
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [manualPages, setManualPages] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);

  // Step 2: Selected Services State
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Step 3: Customer Details State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Total pages calculation
  const totalDocumentPages = isWalkIn
    ? Math.max(1, manualPages)
    : files.length > 0
    ? files.reduce((sum, f) => sum + (f.pages || 1), 0)
    : 1;

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        const data = await getServices();

        // Priority sort: Regular services first (PRINTING -> FINISHING -> PHOTO -> CARD_PRINT)
        const categoryPriority: Record<string, number> = {
          PRINTING: 1,
          FINISHING: 2,
          PHOTO: 3,
          CARD_PRINT: 4,
        };
        const sorted = [...data].sort((a, b) => {
          const catA = categoryPriority[a.category] || 99;
          const catB = categoryPriority[b.category] || 99;
          if (catA !== catB) return catA - catB;
          return Number(a.base_price) - Number(b.base_price);
        });

        setServices(sorted);
      } catch (err: any) {
        setError(err.message || 'Failed to load services catalog');
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // PDF Page Detector (inspects PDF byte structure for page dictionaries)
  const detectPdfPages = async (file: File): Promise<number> => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return 1;
    }
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('latin1').decode(bytes);

      const countRegex = /\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/;
      const match = text.match(countRegex);
      if (match && match[1]) {
        const p = parseInt(match[1], 10);
        if (p > 0 && p < 5000) return p;
      }

      const countRegex2 = /\/Count\s+(\d+)[^>]*\/Type\s*\/Pages/;
      const match2 = text.match(countRegex2);
      if (match2 && match2[1]) {
        const p = parseInt(match2[1], 10);
        if (p > 0 && p < 5000) return p;
      }

      const pageOccurrences = text.match(/\/Type\s*\/Page\b/g);
      if (pageOccurrences && pageOccurrences.length > 0) {
        return pageOccurrences.length;
      }
    } catch (err) {
      console.warn('PDF page detection failed:', err);
    }
    return Math.max(1, Math.round(file.size / 45000));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    setError(null);
    setIsWalkIn(false);

    Array.from(uploaded).forEach(async (file) => {
      const detectedPages = await detectPdfPages(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = (reader.result as string) || '';
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            pages: detectedPages,
            mimeType: file.type || 'application/pdf',
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFilePagesChange = (index: number, newPages: number) => {
    setFiles((prev) =>
      prev.map((f, idx) => (idx === index ? { ...f, pages: Math.max(1, newPages) } : f))
    );
  };

  // Step 1 -> Step 2 transition
  const handleProceedToServices = () => {
    if (!isWalkIn && files.length === 0) {
      setError('Please upload at least one document or select physical hardcopy walk-in.');
      return;
    }
    setError(null);

    // If no service is selected yet, automatically select the standard B&W Xerox / Printing
    // with quantity = totalDocumentPages * copies
    if (Object.keys(selectedItems).length === 0) {
      const defaultPrintService = services.find(
        (s) =>
          s.category === 'PRINTING' ||
          s.name.toLowerCase().includes('b&w') ||
          s.name.toLowerCase().includes('xerox')
      );
      if (defaultPrintService) {
        setSelectedItems({
          [defaultPrintService.id]: totalDocumentPages * copies,
        });
      }
    } else {
      // Re-sync any printing services to totalDocumentPages * copies
      syncPrintingQuantities(copies);
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize printing services with copies & pages
  const syncPrintingQuantities = (newCopies: number) => {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      services.forEach((s) => {
        if (s.category === 'PRINTING' && updated[s.id] !== undefined) {
          updated[s.id] = totalDocumentPages * newCopies;
        }
      });
      return updated;
    });
  };

  const handleCopiesChange = (delta: number) => {
    const nextCopies = Math.max(1, copies + delta);
    setCopies(nextCopies);
    syncPrintingQuantities(nextCopies);
  };

  const handleQuantityChange = (serviceId: number, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[serviceId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[serviceId];
      } else {
        updated[serviceId] = next;
      }
      return updated;
    });
  };

  const handleToggleService = (service: Service) => {
    setSelectedItems((prev) => {
      const updated = { ...prev };
      if (updated[service.id]) {
        delete updated[service.id];
      } else {
        // If it's a printing service, default to pages * copies, otherwise 1
        if (service.category === 'PRINTING') {
          updated[service.id] = totalDocumentPages * copies;
        } else if (service.category === 'FINISHING') {
          updated[service.id] = copies;
        } else {
          updated[service.id] = 1;
        }
      }
      return updated;
    });
  };

  // Step 2 -> Step 3 transition
  const handleProceedToDetails = () => {
    if (Object.keys(selectedItems).length === 0) {
      setError('Please select at least one service item to proceed.');
      return;
    }
    setError(null);
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Order Submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const items = Object.entries(selectedItems).map(([serviceIdStr, qty]) => ({
      service_id: parseInt(serviceIdStr, 10),
      quantity: qty,
    }));

    if (items.length === 0) {
      setError('Please select at least one service item.');
      setCurrentStep(2);
      return;
    }

    if (!customerName.trim() || customerPhone.trim().length < 10) {
      setError('Please enter your full name and a valid 10-digit mobile number.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        notes: notes.trim(),
        items,
        files: files.map((f) => ({
          file_name: f.name,
          file_url: f.dataUrl,
          file_size_bytes: f.size,
          mime_type: f.mimeType,
          page_count: f.pages,
        })),
      };

      const createdOrder = await createOrder(payload);
      localStorage.setItem('queuex_customer_phone', customerPhone.trim());
      navigate(`/my-orders?token=${encodeURIComponent(createdOrder.token_number)}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
      setSubmitting(false);
    }
  };

  const estimatedTotal = Object.entries(selectedItems).reduce((sum, [serviceIdStr, qty]) => {
    const service = services.find((s) => s.id === parseInt(serviceIdStr, 10));
    if (!service) return sum;
    return sum + parseFloat(String(service.base_price)) * qty;
  }, 0);

  const categoryOrder = ['ALL', 'PRINTING', 'FINISHING', 'PHOTO', 'CARD_PRINT'];
  const rawCategories = Array.from(new Set(services.map((s) => s.category)));
  const categories = [
    'ALL',
    ...categoryOrder.filter((c) => c !== 'ALL' && rawCategories.includes(c)),
    ...rawCategories.filter((c) => !categoryOrder.includes(c)),
  ];
  const filteredServices =
    categoryFilter === 'ALL' ? services : services.filter((s) => s.category === categoryFilter);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-500 font-medium">Loading print counter services...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32">
      
      {/* Step Indicator Wizard Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative max-w-xl mx-auto">
          {/* Progress connecting lines */}
          <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute left-8 top-1/2 -translate-y-1/2 h-0.5 bg-slate-900 transition-all duration-300 -z-0"
            style={{
              width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%',
            }}
          />

          {/* Step 1 Pill */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="flex flex-col items-center gap-1.5 cursor-pointer relative z-10 group"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 1
                  ? 'bg-slate-900 text-white shadow-md ring-4 ring-slate-100'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border-2 border-slate-300 text-slate-400'
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <span
              className={`text-[11px] font-bold ${
                currentStep === 1 ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'
              }`}
            >
              Upload Files
            </span>
          </button>

          {/* Step 2 Pill */}
          <button
            type="button"
            onClick={() => {
              if (files.length > 0 || isWalkIn) setCurrentStep(2);
            }}
            disabled={files.length === 0 && !isWalkIn}
            className={`flex flex-col items-center gap-1.5 relative z-10 ${
              files.length > 0 || isWalkIn ? 'cursor-pointer group' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 2
                  ? 'bg-slate-900 text-white shadow-md ring-4 ring-slate-100'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border-2 border-slate-300 text-slate-400'
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <span
              className={`text-[11px] font-bold ${
                currentStep === 2 ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-900'
              }`}
            >
              Select Services
            </span>
          </button>

          {/* Step 3 Pill */}
          <button
            type="button"
            onClick={() => {
              if (Object.keys(selectedItems).length > 0) setCurrentStep(3);
            }}
            disabled={Object.keys(selectedItems).length === 0}
            className={`flex flex-col items-center gap-1.5 relative z-10 ${
              Object.keys(selectedItems).length > 0 ? 'cursor-pointer group' : 'cursor-not-allowed opacity-60'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 3
                  ? 'bg-slate-900 text-white shadow-md ring-4 ring-slate-100'
                  : 'bg-white border-2 border-slate-300 text-slate-400'
              }`}
            >
              3
            </div>
            <span
              className={`text-[11px] font-bold ${
                currentStep === 3 ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              Details & Token
            </span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================
          STEP 1: UPLOAD DOCUMENTS & PAGE DETECTION
      ======================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6 text-left">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Step 1: Upload Your Documents
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Upload the documents or images you need printed.
            </p>
          </div>

          {/* Drag & Drop File Upload Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <label className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/60 hover:bg-slate-50 group">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 mb-3 shadow-xs group-hover:scale-105 transition-transform">
                <FileUp className="w-6 h-6 text-sky-600" />
              </div>
              <span className="text-sm font-bold text-slate-900 text-center">
                Click or drag & drop files here
              </span>
              <span className="text-xs text-slate-500 mt-1 text-center">
                Supports PDF documents, images (PNG, JPG), Word (DOCX) up to 50MB
              </span>
            </label>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1 border-b border-slate-100 pb-2">
                  <span>Attached Documents ({files.length})</span>
                  <span>Pages to Print</span>
                </div>

                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sky-600 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 truncate">{file.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {(file.size / 1024).toFixed(0)} KB • {file.pages} {file.pages === 1 ? 'page' : 'pages'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      {/* Page Stepper */}
                      <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        <span className="text-[11px] text-slate-500 mr-1 font-medium">Pages:</span>
                        <button
                          type="button"
                          onClick={() => handleFilePagesChange(idx, file.pages - 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          title="Decrease pages"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-slate-900 text-xs">
                          {file.pages}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFilePagesChange(idx, file.pages + 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          title="Increase pages"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Delete File Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold cursor-pointer transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total Pages Summary Banner */}
                <div className="mt-4 p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-sky-700" />
                    <span className="text-xs font-bold text-sky-900">
                      Total Pages:
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-sky-950">
                    {totalDocumentPages} {totalDocumentPages === 1 ? 'page' : 'pages'}
                  </span>
                </div>
              </div>
            )}

            {/* Walk-in Hardcopy Option (For physical document Xerox without uploads) */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-800 block">
                  Have physical papers or an ID card to Xerox?
                </span>
                <span className="text-slate-500 text-[11px]">
                  No file upload needed. Specify hardcopy page count manually.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWalkIn(!isWalkIn);
                  if (!isWalkIn) setFiles([]);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isWalkIn
                    ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isWalkIn ? '✓ Physical Hardcopy Selected' : 'I have physical papers'}
              </button>
            </div>

            {/* Manual Hardcopy Page Count */}
            {isWalkIn && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">
                  Number of physical pages to Xerox:
                </span>
                <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-amber-300 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setManualPages(Math.max(1, manualPages - 1))}
                    className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center font-extrabold text-sm text-slate-900">
                    {manualPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setManualPages(manualPages + 1)}
                    className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 1 Bottom Action */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={handleProceedToServices}
              disabled={files.length === 0 && !isWalkIn}
              className="py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-95"
            >
              <span>Proceed to Select Services</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 2: SERVICE SELECTION & DYNAMIC PAGE PRICING
      ======================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6 text-left">
          
          {/* Header & Document Volume Summary Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-700 tracking-wider block">
                Step 2: Choose Printing & Finishing
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                {isWalkIn ? 'Physical Hardcopy' : `${files.length} Document(s) Attached`}
              </h2>
              <p className="text-xs text-slate-500">
                Total Document Pages: <strong className="text-slate-900">{totalDocumentPages} pages</strong>
              </p>
            </div>

            {/* Copies Multiplier Stepper */}
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold">Copies:</span>
              </div>
              <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleCopiesChange(-1)}
                  className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-7 text-center font-extrabold text-xs text-slate-900">
                  {copies}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopiesChange(1)}
                  className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                ({totalDocumentPages * copies} total prints)
              </span>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredServices.map((service) => {
              const qty = selectedItems[service.id] || 0;
              const isSelected = qty > 0;
              const isPrintCategory = service.category === 'PRINTING';
              const pricePerUnit = parseFloat(String(service.base_price));
              const lineCost = pricePerUnit * qty;

              return (
                <div
                  key={service.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50/40 border-sky-400 shadow-sm ring-1 ring-sky-300/40'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[10px] uppercase text-sky-700 font-bold tracking-wider">
                        {service.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{pricePerUnit.toFixed(2)}
                        <span className="text-slate-500 text-[10px] font-normal">
                          {' '}/{service.unit.replace('per_', '')}
                        </span>
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {service.description}
                      </p>
                    )}

                    {isPrintCategory && (
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        {totalDocumentPages} pages × {copies} {copies === 1 ? 'copy' : 'copies'} ({totalDocumentPages * copies} prints)
                      </p>
                    )}
                  </div>

                  {/* Quantity & Toggle Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      {isSelected ? (
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{lineCost.toFixed(2)}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleService(service)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                        >
                          + Select
                        </button>
                      )}
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(service.id, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer font-bold"
                          title="Decrease"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <span className="w-8 text-center font-bold text-xs text-slate-900">
                          {qty}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleQuantityChange(service.id, 1)}
                          className="w-8 h-8 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs font-bold"
                          title="Increase"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Subtotal Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                Estimated Order Subtotal:
              </span>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                ₹{estimatedTotal.toFixed(2)}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Files</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToDetails}
                disabled={Object.keys(selectedItems).length === 0}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Proceed to Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          STEP 3: CUSTOMER DETAILS & ORDER CONFIRMATION
      ======================================================== */}
      {currentStep === 3 && (
        <form onSubmit={handleSubmitOrder} className="space-y-6 text-left">
          
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Step 3: Confirm Details & Place Order
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Provide your name and phone number so the counter staff can call your token when ready.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Customer Form (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-sky-600" />
                <span>Customer Information</span>
              </h2>

              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1 font-bold tracking-wider">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1 font-bold tracking-wider">
                  Mobile Number (For Queue Token & Pickup) *
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500 text-xs font-bold pointer-events-none">
                    <Phone className="w-3.5 h-3.5" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-16 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1 font-bold tracking-wider">
                  Special Notes / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Duplex / back-to-back, color front page, corner stapled..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pay at counter when picking up your print job (Cash / UPI / Card).</span>
              </div>
            </div>

            {/* Right Column: Review Receipt (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between pb-3 border-b border-slate-100">
                  <span>Order Review</span>
                  <ShoppingBag className="w-4 h-4 text-sky-600" />
                </h2>

                {/* Attached Files & Pages Review */}
                <div className="py-3 border-b border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Documents:</span>
                    <span className="font-bold text-slate-900">
                      {isWalkIn ? 'Physical Hardcopy' : `${files.length} file(s)`}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Pages:</span>
                    <span className="font-bold text-slate-900">{totalDocumentPages} pages</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Copies:</span>
                    <span className="font-bold text-slate-900">{copies} {copies === 1 ? 'copy' : 'copies'}</span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="py-3 space-y-2 text-xs">
                  {Object.entries(selectedItems).map(([idStr, qty]) => {
                    const s = services.find((srv) => srv.id === parseInt(idStr, 10));
                    if (!s) return null;
                    const cost = parseFloat(String(s.base_price)) * qty;
                    return (
                      <div key={idStr} className="flex justify-between items-center text-slate-700">
                        <span className="truncate mr-2 font-medium">
                          {s.name} × {qty}
                        </span>
                        <span className="font-bold text-slate-900">₹{cost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Final Amount & Action Buttons */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">
                    Total Due
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-600">
                    ₹{estimatedTotal.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(2);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 font-bold text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Token...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm & Place Order</span>
                        <ArrowRight className="w-4 h-4 text-sky-400" />
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>

        </form>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices, createOrder } from '../services/api';
import type { Service } from '../types';
import { ShoppingBag, Plus, Minus, FileUp, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const CustomerOrderPage: React.FC = () => {
  const navigate = useNavigate();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State - pre-filled from local storage if previously used
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('queuex_customer_name') || '');
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem('queuex_customer_phone') || '');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  
  // File Upload State
  const [files, setFiles] = useState<Array<{ name: string; size: number; pages: number }>>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

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
        // Default all quantities to 0
        setSelectedItems({});
      } catch (err: any) {
        setError(err.message || 'Failed to load services catalog');
      } finally {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

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

  const handleAddSimulatedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files;
    if (!uploaded || uploaded.length === 0) return;

    const newFiles = Array.from(uploaded).map((file) => ({
      name: file.name,
      size: file.size,
      pages: Math.max(1, Math.round(file.size / 45000)),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const items = Object.entries(selectedItems).map(([serviceIdStr, qty]) => ({
      service_id: parseInt(serviceIdStr, 10),
      quantity: qty,
    }));

    if (items.length === 0) {
      setError('Please select at least one service item.');
      return;
    }

    if (!customerName.trim() || customerPhone.length < 10) {
      setError('Please enter your full name and a valid 10-digit phone number.');
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
          file_url: `https://storage.queuex.local/uploads/${encodeURIComponent(f.name)}`,
          file_size_bytes: f.size,
          mime_type: 'application/pdf',
          page_count: f.pages,
        })),
      };

      const createdOrder = await createOrder(payload);
      localStorage.setItem('queuex_customer_phone', customerPhone.trim());
      localStorage.setItem('queuex_customer_name', customerName.trim());
      navigate(`/my-orders?token=${encodeURIComponent(createdOrder.token_number)}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-slate-500">Connecting to QueueX Service Catalog...</p>
      </div>
    );
  }

  const totalItemsCount = Object.values(selectedItems).reduce((sum, q) => sum + q, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
      
      {/* Hero Intro */}
      <div className="text-left mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs mb-2.5 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
          <span>Walk-In & Remote Counter Desk</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Create Service Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          Select printing or finishing services, attach your files, and generate your live digital queue token.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 text-left">
        
        {/* Left 2 Columns: Services Selection & File Upload */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          
          {/* Category Filter Pills (Edge-to-edge scroll on mobile) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Services Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {filteredServices.map((service) => {
              const qty = selectedItems[service.id] || 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={service.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-sky-50/40 border-sky-400 shadow-sm ring-1 ring-sky-300/40'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[11px] uppercase text-sky-700 font-bold tracking-wider">
                        {service.category}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        ₹{parseFloat(String(service.base_price)).toFixed(2)}
                        <span className="text-slate-500 text-[10px] font-normal"> /{service.unit.replace('per_', '')}</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{service.description}</p>
                    )}
                  </div>

                  {/* Quantity Stepper (Mobile Touch Optimized 36px) */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Quantity</span>
                    <div className="flex items-center gap-2">
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(service.id, -1)}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}

                      <span className="w-8 text-center font-bold text-sm text-slate-900 font-mono">
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(service.id, 1)}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Upload Section */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-sky-600" />
                  Attach Documents / Prints
                </h3>
                <p className="text-xs text-slate-500">PDFs, Word documents, or image files to be processed</p>
              </div>
            </div>

            <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/70">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleAddSimulatedFile}
              />
              <FileUp className="w-7 h-7 text-slate-400 mb-2" />
              <span className="text-xs text-slate-700 font-bold">Click to select files</span>
              <span className="text-[11px] text-slate-500 mt-1">PDF, PNG, JPG up to 50MB</span>
            </label>

            {/* Uploaded File Badges */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                  >
                    <span className="truncate max-w-[200px] font-medium">{f.name}</span>
                    <div className="flex items-center gap-3 shrink-0 text-slate-500">
                      <span>~{f.pages} pages</span>
                      <span>{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Customer Info & Live Checkout Summary */}
        <div id="checkout-form-section" className="space-y-6 scroll-mt-20">
          
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xl space-y-4">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
              <span>Order Summary</span>
              <ShoppingBag className="w-4 h-4 text-sky-600" />
            </h2>

            {/* Customer Inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1 font-bold tracking-wider">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chandra Mohan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1 font-bold tracking-wider">Phone Number (For Pickup)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9392306031"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-600 mb-1 font-bold tracking-wider">Special Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Color print on glossy paper, duplex"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Line Items List */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              {Object.entries(selectedItems).map(([idStr, qty]) => {
                const s = services.find((srv) => srv.id === parseInt(idStr, 10));
                if (!s) return null;
                const cost = parseFloat(String(s.base_price)) * qty;
                return (
                  <div key={idStr} className="flex justify-between items-center text-slate-700">
                    <span className="truncate mr-2 font-medium">{s.name} × {qty}</span>
                    <span className="font-bold text-slate-900 font-mono">₹{cost.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Total Display */}
            <div className="pt-4 border-t border-slate-200 flex items-baseline justify-between">
              <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Estimated Total</span>
              <div className="text-2xl font-extrabold text-emerald-600 font-mono">
                ₹{estimatedTotal.toFixed(2)}
              </div>
            </div>

            {/* Price Shield Security Pill */}
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-start gap-2 text-[11px] text-emerald-900 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Authoritative pricing verified by QueueX database upon token generation.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || Object.keys(selectedItems).length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Issuing Token...</span>
                </>
              ) : (
                <>
                  <span>Generate Queue Token</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </div>

        </div>

      </form>

      {/* Mobile Floating Checkout Bar (Appears when items are selected) */}
      {totalItemsCount > 0 && (
        <div className="lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
            </span>
            <span className="text-lg font-extrabold text-emerald-600 font-mono">
              ₹{estimatedTotal.toFixed(2)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('checkout-form-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Proceed to Token</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>
      )}

    </div>
  );
};

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

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
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
        setServices(data);
        // Pre-select first item with 1 quantity as default convenience
        if (data.length > 0) {
          setSelectedItems({ [data[0].id]: 10 });
        }
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
      pages: Math.max(1, Math.round(file.size / 45000)), // Approximate page count simulation
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  // Client-side instant price estimation
  const estimatedTotal = Object.entries(selectedItems).reduce((sum, [serviceIdStr, qty]) => {
    const service = services.find((s) => s.id === parseInt(serviceIdStr, 10));
    if (!service) return sum;
    return sum + parseFloat(String(service.base_price)) * qty;
  }, 0);

  const categories = ['ALL', ...Array.from(new Set(services.map((s) => s.category)))];
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
      // Immediately navigate to the digital ticket tracking screen
      navigate(`/track/${createdOrder.token_number}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-mono text-xs text-zinc-400">Connecting to QueueX Service Catalog...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Hero Intro */}
      <div className="text-left mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Walk-In & Remote Counter Desk</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Create Service Order
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Select printing or finishing services, attach your files, and generate your live digital queue token.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        
        {/* Left 2 Columns: Services Selection & File Upload */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Services Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredServices.map((service) => {
              const qty = selectedItems[service.id] || 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={service.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-900/90 border-sky-500/80 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                      : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-mono uppercase text-sky-400 font-semibold tracking-wider">
                        {service.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-white">
                        ₹{parseFloat(String(service.base_price)).toFixed(2)}
                        <span className="text-zinc-500 text-[10px] font-normal"> /{service.unit.replace('per_', '')}</span>
                      </span>
                    </div>

                    <h3 className="font-semibold text-sm text-zinc-100">{service.name}</h3>
                    {service.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{service.description}</p>
                    )}
                  </div>

                  {/* Quantity Stepper */}
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">Quantity</span>
                    <div className="flex items-center gap-2">
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(service.id, -1)}
                          className="w-7 h-7 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <span className="w-8 text-center font-mono font-bold text-sm text-white">
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(service.id, 1)}
                        className="w-7 h-7 rounded-md bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Document Upload Section */}
          <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-sky-400" />
                  Attach Documents / Prints
                </h3>
                <p className="text-xs text-zinc-400">PDFs, Word documents, or image files to be processed</p>
              </div>
            </div>

            <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-zinc-950/40">
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleAddSimulatedFile}
              />
              <FileUp className="w-7 h-7 text-zinc-500 mb-2" />
              <span className="text-xs font-mono text-zinc-300 font-medium">Click to select files</span>
              <span className="text-[11px] text-zinc-400 mt-1">PDF, PNG, JPG up to 50MB</span>
            </label>

            {/* Uploaded File Badges */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300"
                  >
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-zinc-400">~{f.pages} pages</span>
                      <span className="text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Customer Info & Live Checkout Summary */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
              <span>Order Summary</span>
              <ShoppingBag className="w-4 h-4 text-sky-400" />
            </h2>

            {/* Customer Inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chandra Mohan"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Phone Number (For Pickup)</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9392306031"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">Special Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Color print on glossy paper, duplex"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Line Items List */}
            <div className="pt-4 border-t border-zinc-800 space-y-2 text-xs font-mono">
              {Object.entries(selectedItems).map(([idStr, qty]) => {
                const s = services.find((srv) => srv.id === parseInt(idStr, 10));
                if (!s) return null;
                const cost = parseFloat(String(s.base_price)) * qty;
                return (
                  <div key={idStr} className="flex justify-between items-center text-zinc-300">
                    <span className="truncate mr-2">{s.name} × {qty}</span>
                    <span className="font-semibold text-zinc-100">₹{cost.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Total Display */}
            <div className="pt-4 border-t border-zinc-800 flex items-baseline justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400">Estimated Total</span>
              <div className="text-2xl font-extrabold font-mono text-emerald-400">
                ₹{estimatedTotal.toFixed(2)}
              </div>
            </div>

            {/* Price Shield Security Pill */}
            <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex items-start gap-2 text-[11px] text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Authoritative pricing verified by QueueX database upon token generation.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || Object.keys(selectedItems).length === 0}
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-800 disabled:text-zinc-600 font-mono font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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

    </div>
  );
};

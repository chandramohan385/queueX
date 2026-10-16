import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  RefreshCw,
  User,
  Phone,
  Calendar,
  Printer,
  Share2,
  Eye,
  FileDown,
} from 'lucide-react';
import type { Order, OrderFile } from '../types';
import { StatusBadge } from './StatusBadge';
import { generateThermalReceipt } from '../utils/receiptGenerator';
import { printThermalReceiptDirect } from '../utils/thermalPrinter';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DigitalTicketStubProps {
  order: Order;
  onOrderUpdated?: (order: Order) => void;
}

export const DigitalTicketStub: React.FC<DigitalTicketStubProps> = ({ order }) => {
  const [previewFile, setPreviewFile] = useState<OrderFile | null>(null);

  const steps = [
    { key: 'QUEUED', label: 'Order Placed', desc: 'Logged in queue', icon: Clock },
    { key: 'PROCESSING', label: 'Printing', desc: 'Job being printed', icon: RefreshCw },
    { key: 'READY', label: 'Ready for Pickup', desc: 'Waiting at pickup counter', icon: CheckCircle2 },
    { key: 'COMPLETED', label: 'Completed', desc: 'Collected at counter', icon: Printer },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return 0;
      case 'PROCESSING':
        return 1;
      case 'READY':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);
  const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const isPaid = order.payment_status === 'PAID';

  const handleShareWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const trackingUrl = `${origin}/orders?token=${encodeURIComponent(order.token_number)}`;
    const message =
      `*QueueX Print Token: #${order.token_number}*\n` +
      `Customer: ${order.customer_name}\n` +
      `Status: ${order.status}\n` +
      `Amount: ₹${parseFloat(String(order.total_amount)).toFixed(2)} (${isPaid ? 'PAID' : 'Pay at counter'})\n` +
      `Track Live: ${trackingUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="w-full max-w-lg mx-auto my-2 sm:my-6 text-left">
      
      {/* Outer Card with subtle industrial ticket border */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden transition-all">
        
        {/* 1. Header & Live Token Header */}
        <div className="p-4 sm:p-8 bg-slate-50/70 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block animate-pulse" />
              <span className="text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold">
                QueueX Service Token
              </span>
            </div>
            <StatusBadge status={order.status} size="sm" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mt-1 sm:mt-2">
            <div>
              <span className="text-[10px] sm:text-xs uppercase text-slate-400 font-bold tracking-wider">Token ID</span>
              <h1 className="text-3xl sm:text-5xl font-extrabold font-mono text-slate-900 tracking-tight">
                {order.token_number}
              </h1>
            </div>
            
            {/* Amount & Payment Status */}
            <div className="text-left sm:text-right">
              <span className="text-[10px] sm:text-xs uppercase text-slate-400 font-bold tracking-wider">Estimated Total</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
                ₹{parseFloat(String(order.total_amount)).toFixed(2)}
              </div>
              
              <div className="mt-1">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>PAID</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Pay at Counter</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Meta Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate font-medium">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium font-mono">{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* 2. Perforated Tear Line with Semicircle Notches */}
        <div className="relative flex items-center justify-center py-2 bg-slate-100/70 overflow-hidden">
          <div className="ticket-notch-left -translate-y-1/2 top-1/2 border-r border-slate-200" />
          <div className="w-full border-t-2 border-dashed border-slate-300 mx-6" />
          <div className="ticket-notch-right -translate-y-1/2 top-1/2 border-l border-slate-200" />
        </div>

        {/* 3. Live Order Progress Stepper */}
        <div className="p-4 sm:p-8 bg-white border-b border-slate-200">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-5 font-bold">
            Live Production Status
          </h3>

          <div className="relative flex flex-col gap-5">
            {steps.map((s, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              const Icon = s.icon;

              return (
                <div key={s.key} className="flex items-start gap-4 relative">
                  {/* Step Connector Line */}
                  {idx < steps.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 w-0.5 h-7 -translate-x-1/2 ${
                        isPast ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Icon Circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 transition-all z-10 ${
                      isPast
                        ? 'bg-emerald-600 text-white font-bold'
                        : isCurrent
                        ? 'bg-sky-600 text-white font-bold ring-4 ring-sky-100 animate-pulse'
                        : 'bg-slate-100 border border-slate-200 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Details */}
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between">
                      <span
                        className={`text-sm font-bold ${
                          isCurrent ? 'text-sky-600' : isPast ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          Active State
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Itemized Summary & Actions */}
        <div className="p-4 sm:p-8 bg-slate-50/50">
          <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-bold">
            Itemized Services
          </h3>

          <div className="divide-y divide-slate-200/80 border-y border-slate-200 text-xs">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      {item.service_name || item.name || `Service #${item.service_id}`}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.quantity} units @ ₹{parseFloat(String(item.unit_price)).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    ₹{parseFloat(String(item.subtotal)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-2.5 text-slate-500 italic">No line items breakdown available</div>
            )}
          </div>

          {/* Uploaded Documents List if any */}
          {order.files && order.files.length > 0 && (
            <div className="mt-5">
              <h4 className="text-[11px] uppercase tracking-wider text-slate-500 mb-2 font-bold">
                Attached Source Documents ({order.files.length})
              </h4>
              <div className="space-y-1.5">
                {order.files.map((file, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50/30 text-xs text-slate-700 shadow-xs transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-sky-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="truncate font-medium group-hover:text-sky-800">{file.file_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-slate-400">
                        {file.page_count ? `${file.page_count} pgs` : 'Document'}
                      </span>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes if any */}
          {order.notes && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
              <span className="font-bold block mb-0.5 text-[11px] uppercase tracking-wider">
                Special Instructions:
              </span>
              <p className="italic">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons: 80mm Print & WhatsApp Share */}
          <div className="mt-6 space-y-2.5">
            {/* Direct 80mm Thermal Print */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => printThermalReceiptDirect(order)}
                className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Direct 80mm Continuous Thermal Slip"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Print POS Slip</span>
              </button>

              <button
                type="button"
                onClick={() => generateThermalReceipt(order)}
                className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 text-slate-800 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                title="Download 80mm PDF Receipt"
              >
                <FileDown className="w-4 h-4 text-slate-600" />
                <span>Download PDF</span>
              </button>
            </div>

            {/* 1-Tap WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Token via WhatsApp</span>
            </button>
          </div>

          {/* 5. Scannable Barcode simulation footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col items-center justify-center gap-2">
            <div className="h-8 sm:h-10 w-44 sm:w-48 barcode-pattern rounded opacity-90" />
            <span className="font-mono text-[11px] tracking-widest text-slate-600 uppercase font-bold">
              *{order.token_number}*
            </span>
            <p className="text-[11px] text-slate-500 text-center mt-1">
              Keep this screen open or save your token number. Show it at the counter for pickup.
            </p>
          </div>

        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        file={previewFile}
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
};

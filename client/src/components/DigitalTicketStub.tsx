import React from 'react';
import { FileText, CheckCircle2, Clock, Cpu, User, Phone, Calendar, Printer } from 'lucide-react';
import type { Order } from '../types';
import { StatusBadge } from './StatusBadge';

interface DigitalTicketStubProps {
  order: Order;
}

export const DigitalTicketStub: React.FC<DigitalTicketStubProps> = ({ order }) => {
  const steps = [
    { key: 'QUEUED', label: 'Ticket Issued', desc: 'Order logged at counter', icon: Clock },
    { key: 'PROCESSING', label: 'In Production', desc: 'Printing & finishing job', icon: Cpu },
    { key: 'READY', label: 'Ready for Pickup', desc: 'Waiting at pickup shelf', icon: CheckCircle2 },
    { key: 'COMPLETED', label: 'Collected', desc: 'Payment settled & closed', icon: Printer },
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
  const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full max-w-xl mx-auto my-6 text-left">
      {/* Outer Card Container */}
      <div className="relative bg-white border border-slate-200/90 rounded-2xl shadow-xl overflow-hidden">
        
        {/* 1. Header Portion: Brand & Big Token */}
        <div className="p-6 sm:p-8 bg-slate-50/80 border-b border-slate-200">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block animate-pulse" />
              <span className="text-xs uppercase tracking-widest font-mono text-slate-500 font-semibold">
                QueueX Service Token
              </span>
            </div>
            <StatusBadge status={order.status} size="md" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-2">
            <div>
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold">Token ID</span>
              <h1 className="text-4xl sm:text-5xl font-extrabold font-mono text-slate-900 tracking-tight">
                {order.token_number}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-mono uppercase text-slate-400 font-semibold">Estimated Total</span>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600">
                ₹{parseFloat(String(order.total_amount)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Customer Meta Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{formattedDate}</span>
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
        <div className="p-6 sm:p-8 bg-white border-b border-slate-200">
          <h3 className="text-xs uppercase font-mono tracking-widest text-slate-500 mb-5 font-bold">
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

                  {/* Step Icon Pill */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono shrink-0 transition-colors z-10 ${
                      isCurrent
                        ? 'bg-amber-50 text-amber-700 border-2 border-amber-500 shadow-sm'
                        : isPast
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-500'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Description */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold ${
                          isCurrent ? 'text-amber-900' : isPast ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {s.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold">
                          Current Step
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

        {/* 4. Itemized Service Breakdown */}
        <div className="p-6 sm:p-8 bg-slate-50/50">
          <h3 className="text-xs uppercase font-mono tracking-widest text-slate-500 mb-4 font-bold">
            Service Specifications
          </h3>

          <div className="divide-y divide-slate-200 text-xs font-mono">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 truncate">
                  <span className="font-bold text-slate-800 truncate block">
                    {item.service_name || item.name || `Service #${item.service_id}`}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {item.quantity} units @ ₹{parseFloat(String(item.unit_price)).toFixed(2)}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  ₹{parseFloat(String(item.subtotal)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Attached Files Section */}
          {order.files && order.files.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-200">
              <h4 className="text-[11px] uppercase font-mono text-slate-500 mb-2 font-bold">
                Attached Documents ({order.files.length})
              </h4>
              <div className="flex flex-col gap-1.5">
                {order.files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 font-mono shadow-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate font-medium">{file.file_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {file.page_count ? `${file.page_count} pgs` : 'Document'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes if any */}
          {order.notes && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
              <span className="font-semibold block mb-0.5 font-mono text-[11px] uppercase">
                Special Instructions:
              </span>
              <p className="italic">{order.notes}</p>
            </div>
          )}

          {/* 5. Scannable Barcode simulation footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center justify-center gap-2">
            <div className="h-10 w-48 barcode-pattern rounded opacity-90" />
            <span className="font-mono text-[11px] tracking-widest text-slate-600 uppercase font-bold">
              *{order.token_number}*
            </span>
            <p className="text-[11px] text-slate-500 text-center mt-1 font-mono">
              Keep this screen open or save your token number. Show it at the counter for pickup.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

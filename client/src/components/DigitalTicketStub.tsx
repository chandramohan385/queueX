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
      <div className="relative bg-zinc-900/90 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        
        {/* 1. Header Portion: Brand & Big Token */}
        <div className="p-6 sm:p-8 bg-zinc-950/60 border-b border-zinc-800">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block animate-pulse" />
              <span className="text-xs uppercase tracking-widest font-mono text-zinc-400 font-semibold">
                QueueX Service Token
              </span>
            </div>
            <StatusBadge status={order.status} size="md" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-2">
            <div>
              <span className="text-xs font-mono uppercase text-zinc-500">Token ID</span>
              <h1 className="text-4xl sm:text-5xl font-extrabold font-mono text-white tracking-tight">
                {order.token_number}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-mono uppercase text-zinc-500">Estimated Total</span>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                ₹{parseFloat(String(order.total_amount)).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Customer Meta Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">{order.customer_name}</span>
            </div>
            <div className="flex items-center gap-1.5 truncate">
              <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{order.customer_phone}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
              <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* 2. Perforated Tear Line with Semicircle Notches */}
        <div className="relative flex items-center justify-center py-2 bg-zinc-950/80 overflow-hidden">
          <div className="ticket-notch-left -translate-y-1/2 top-1/2 shadow-inner border-r border-zinc-700/80" />
          <div className="w-full border-t-2 border-dashed border-zinc-800/90 mx-6" />
          <div className="ticket-notch-right -translate-y-1/2 top-1/2 shadow-inner border-l border-zinc-700/80" />
        </div>

        {/* 3. Live Order Progress Stepper */}
        <div className="p-6 sm:p-8 bg-zinc-900/60 border-b border-zinc-800">
          <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-400 mb-5 font-semibold">
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
                        isPast ? 'bg-emerald-500' : 'bg-zinc-800'
                      }`}
                    />
                  )}

                  {/* Step Icon Pill */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono shrink-0 transition-colors z-10 ${
                      isCurrent
                        ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : isPast
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Step Description */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-semibold ${
                          isCurrent ? 'text-amber-300' : isPast ? 'text-zinc-200' : 'text-zinc-500'
                        }`}
                      >
                        {s.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Current Step
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Itemized Service Breakdown */}
        <div className="p-6 sm:p-8 bg-zinc-950/40">
          <h3 className="text-xs uppercase font-mono tracking-widest text-zinc-400 mb-4 font-semibold">
            Service Specifications
          </h3>

          <div className="divide-y divide-zinc-800/80 text-xs font-mono">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 truncate">
                  <span className="font-semibold text-zinc-200 truncate block">
                    {item.service_name || item.name || `Service #${item.service_id}`}
                  </span>
                  <span className="text-zinc-500 text-[11px]">
                    {item.quantity} units @ ₹{parseFloat(String(item.unit_price)).toFixed(2)}
                  </span>
                </div>
                <div className="font-bold text-zinc-200 text-sm">
                  ₹{parseFloat(String(item.subtotal)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Attached Files Section */}
          {order.files && order.files.length > 0 && (
            <div className="mt-5 pt-4 border-t border-zinc-800">
              <h4 className="text-[11px] uppercase font-mono text-zinc-500 mb-2 font-semibold">
                Attached Documents ({order.files.length})
              </h4>
              <div className="flex flex-col gap-1.5">
                {order.files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 font-mono"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{file.file_name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 shrink-0 ml-2">
                      {file.page_count ? `${file.page_count} pgs` : 'Document'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes if any */}
          {order.notes && (
            <div className="mt-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-300 block mb-0.5">Special Instructions:</span>
              <p className="italic">{order.notes}</p>
            </div>
          )}

          {/* 5. Scannable Barcode simulation footer */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80 flex flex-col items-center justify-center gap-2">
            <div className="h-10 w-48 barcode-pattern rounded opacity-80" />
            <span className="font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
              *{order.token_number}*
            </span>
            <p className="text-[11px] text-zinc-500 text-center mt-1">
              Keep this screen open or save your token number. Show it at the counter for pickup.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

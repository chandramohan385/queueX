import React from 'react';
import { Clock, Cpu, CheckCircle2, Check, AlertCircle } from 'lucide-react';
import type { OrderStatus } from '../types';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showPulse = true }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'QUEUED':
        return {
          label: 'In Queue',
          bgColor: 'bg-slate-100 text-slate-700 border-slate-300',
          dotColor: 'bg-slate-500',
          icon: <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />,
        };
      case 'PROCESSING':
        return {
          label: 'Processing / Printing',
          bgColor: 'bg-amber-50 text-amber-900 border-amber-300',
          dotColor: 'bg-amber-500',
          icon: <Cpu className="w-3.5 h-3.5 mr-1 text-amber-600 animate-spin" />,
        };
      case 'READY':
        return {
          label: 'Ready for Collection',
          bgColor: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          dotColor: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
        };
      case 'COMPLETED':
        return {
          label: 'Completed & Paid',
          bgColor: 'bg-sky-50 text-sky-900 border-sky-300',
          dotColor: 'bg-sky-500',
          icon: <Check className="w-3.5 h-3.5 mr-1 text-sky-600" />,
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bgColor: 'bg-rose-50 text-rose-900 border-rose-300',
          dotColor: 'bg-rose-500',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />,
        };
      default:
        return {
          label: status,
          bgColor: 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: 'bg-slate-400',
          icon: null,
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-sm font-semibold px-3 py-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wider font-semibold ${config.bgColor} ${sizeClasses}`}
    >
      {showPulse && (
        <span className="relative flex h-2 w-2 mr-1.5">
          {status === 'READY' || status === 'PROCESSING' ? (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dotColor}`}
            />
          ) : null}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
        </span>
      )}
      {config.icon}
      {config.label}
    </span>
  );
};

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
          bgColor: 'bg-zinc-800/90 text-zinc-300 border-zinc-700',
          dotColor: 'bg-zinc-400',
          icon: <Clock className="w-3.5 h-3.5 mr-1 text-zinc-400" />,
        };
      case 'PROCESSING':
        return {
          label: 'Processing / Printing',
          bgColor: 'bg-amber-950/70 text-amber-300 border-amber-800/60',
          dotColor: 'bg-amber-400',
          icon: <Cpu className="w-3.5 h-3.5 mr-1 text-amber-400 animate-spin" />,
        };
      case 'READY':
        return {
          label: 'Ready for Collection',
          bgColor: 'bg-emerald-950/70 text-emerald-300 border-emerald-700/70',
          dotColor: 'bg-emerald-400',
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />,
        };
      case 'COMPLETED':
        return {
          label: 'Completed & Paid',
          bgColor: 'bg-sky-950/60 text-sky-300 border-sky-800/60',
          dotColor: 'bg-sky-400',
          icon: <Check className="w-3.5 h-3.5 mr-1 text-sky-400" />,
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          bgColor: 'bg-rose-950/70 text-rose-300 border-rose-800/60',
          dotColor: 'bg-rose-400',
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />,
        };
      default:
        return {
          label: status,
          bgColor: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          dotColor: 'bg-zinc-500',
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
      className={`inline-flex items-center rounded-full border font-mono uppercase tracking-wider ${config.bgColor} ${sizeClasses}`}
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

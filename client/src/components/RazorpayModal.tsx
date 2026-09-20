import React, { useState } from 'react';
import { createPaymentOrder, simulateRazorpayPayment, verifyPayment } from '../services/api';
import type { Order } from '../types';
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Lock,
} from 'lucide-react';

interface RazorpayModalProps {
  isOpen: boolean;
  orderId: number;
  tokenNumber: string;
  amount: number;
  customerName?: string;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  orderId,
  tokenNumber,
  amount,
  customerName,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('customer@okaxis');

  if (!isOpen) return null;

  const handlePay = async (simulateFailure = false) => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Create gateway order
      const gatewayOrder = await createPaymentOrder(orderId);

      if (simulateFailure) {
        // Attempt verification with intentionally corrupted signature
        await verifyPayment({
          order_id: orderId,
          razorpay_order_id: gatewayOrder.razorpay_order_id,
          razorpay_payment_id: 'pay_tampered_9999',
          razorpay_signature: 'fake_tampered_signature_that_fails_hmac_check',
        });
        return;
      }

      // Step 2: Simulate Razorpay server signature generation
      const sim = await simulateRazorpayPayment(gatewayOrder.razorpay_order_id);

      // Step 3: Verify HMAC signature on backend
      const verifiedOrder = await verifyPayment({
        order_id: orderId,
        razorpay_order_id: sim.razorpay_order_id,
        razorpay_payment_id: sim.razorpay_payment_id,
        razorpay_signature: sim.razorpay_signature,
      });

      onSuccess(verifiedOrder);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment failed or was cancelled');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 text-left">
        
        {/* Top Razorpay Header (Authentic Razorpay Navy #0c2340) */}
        <div className="bg-[#0c2340] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center font-black text-white text-xs">
              R
            </div>
            <div>
              <span className="text-xs font-bold tracking-wider text-sky-300 uppercase">Razorpay Checkout</span>
              <p className="text-[11px] text-slate-300">QueueX Smart Counter Services</p>
            </div>
          </div>

          <div className="flex items-baseline justify-between mt-2 pt-3 border-t border-white/10">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                Token #{tokenNumber}
              </span>
              <span className="text-xs text-slate-200">{customerName || 'Walk-In Customer'}</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-white">₹{amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Selection Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('upi')}
            className={`py-3 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'upi'
                ? 'bg-white text-sky-600 font-bold border-b-2 border-sky-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>UPI / QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`py-3 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'card'
                ? 'bg-white text-sky-600 font-bold border-b-2 border-sky-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('netbanking')}
            className={`py-3 flex flex-col items-center gap-1 transition-all ${
              activeTab === 'netbanking'
                ? 'bg-white text-sky-600 font-bold border-b-2 border-sky-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>NetBanking</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Tab 1: UPI */}
          {activeTab === 'upi' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-white border border-slate-300 flex items-center justify-center p-1 shrink-0">
                  <QrCode className="w-12 h-12 text-slate-800" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Scan QR Code</span>
                  <p className="text-[11px] text-slate-500">Scan with Google Pay, PhonePe, or Paytm.</p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Or enter your UPI ID
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Card */}
          {activeTab === 'card' && (
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Card Number</label>
                <input
                  type="text"
                  disabled
                  value="•••• •••• •••• 4242 (Test Visa Card)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Expiry</label>
                  <input
                    type="text"
                    disabled
                    value="12/28"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">CVV</label>
                  <input
                    type="password"
                    disabled
                    value="•••"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: NetBanking */}
          {activeTab === 'netbanking' && (
            <div className="space-y-2 text-xs">
              <span className="block font-medium text-slate-600">Select Popular Banks:</span>
              <div className="grid grid-cols-2 gap-2">
                {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank'].map((bank, i) => (
                  <div
                    key={bank}
                    className={`p-2.5 rounded-lg border text-center font-medium cursor-pointer transition-all ${
                      i === 0 ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    {bank}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => handlePay(false)}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verifying HMAC Signature...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Payment of ₹{amount.toFixed(2)}</span>
              </>
            )}
          </button>

          {/* Tamper Test Simulation Link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => handlePay(true)}
              disabled={loading}
              className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors underline"
              title="Tests server HMAC rejection by submitting a corrupted signature"
            >
              Simulate Tampered Signature (Security Guardrail Test)
            </button>
          </div>

        </div>

        {/* Modal Footer Security Guarantee */}
        <div className="py-3 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <div className="flex items-center gap-1 text-slate-600">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>256-Bit SSL Secured</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-sky-600" />
            <span>Razorpay Sandbox Simulation</span>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where to go after login (defaults to /admin)
  const from = (location.state as any)?.from || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 text-left">
      
      {/* Return to Public Desk */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Customer Counter</span>
      </button>

      {/* Main Login Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Card Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 mb-4 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Staff & Owner Login
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to access the QueueX Live Counter POS, dispatch orders, and view shop telemetry.
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Staff Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@queuex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Sign In to POS</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Credentials */}
          <div className="pt-4 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Demo Fill Credentials:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillCredentials('admin@queuex.com', 'QueueX@2026')}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-left transition-colors"
              >
                <span className="block text-[11px] font-bold text-slate-900">Admin (Owner)</span>
                <span className="block text-[10px] text-slate-500 truncate">admin@queuex.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleFillCredentials('staff@queuex.com', 'Staff@2026')}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-left transition-colors"
              >
                <span className="block text-[11px] font-bold text-slate-900">Staff (Operator)</span>
                <span className="block text-[10px] text-slate-500 truncate">staff@queuex.com</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

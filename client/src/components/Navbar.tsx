import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, Clock, LayoutDashboard, PlusCircle, LogOut, User, Lock, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const navItems = [
    { label: 'Create Order', path: '/', icon: PlusCircle },
    { label: 'My Orders', path: '/my-orders', icon: Clock },
    {
      label: 'Operator POS',
      path: '/admin',
      icon: LayoutDashboard,
      requiresAuth: true,
    },
    ...(isOwner
      ? [
          {
            label: 'Analytics',
            path: '/admin/analytics',
            icon: BarChart3,
            requiresAuth: true,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 group-hover:bg-sky-100 transition-all">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">QueueX</span>
              <span className="text-[10px] uppercase bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 font-bold">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-normal">Smart Counter & Queue Dispatch</p>
          </div>
        </Link>

        {/* Desktop Navigation Tabs (Hidden on mobile) */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.requiresAuth && !isAuthenticated && (
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action: Auth Status or Live Pill */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800">
                <User className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold max-w-[120px] truncate hidden sm:inline">{user?.name}</span>
                <span
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                    user?.role === 'OWNER'
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {user?.role}
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Staff Login</span>
            </Link>
          )}

          {/* Database Live Ping */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-slate-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
            </span>
            <span>Cloud DB</span>
          </div>
        </div>

      </div>

      {/* Mobile Bottom Navigation Dock (Visible only on mobile devices) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-bottom shadow-lg">
        <div className={`grid ${navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} h-14`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 py-1 transition-all ${
                  isActive ? 'text-sky-600 font-bold' : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600 stroke-[2.5]' : 'text-slate-500'}`} />
                  {item.requiresAuth && !isAuthenticated && (
                    <Lock className="w-2.5 h-2.5 text-slate-400 absolute -top-1 -right-2" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};

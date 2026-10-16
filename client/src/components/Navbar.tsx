import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Printer, Clock, LayoutDashboard, PlusCircle, LogOut, User, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Navigation items:
  // If authenticated as Admin, show all 4 management links
  // If not authenticated (Customer public view), show ONLY customer links: Create Order & My Orders
  // ZERO login buttons, ZERO lock icons, ZERO staff/operator cues on the customer public view.
  const navItems = isAuthenticated
    ? [
        { label: 'Create Order', path: '/', icon: PlusCircle },
        { label: 'My Orders', path: '/my-orders', icon: Clock },
        { label: 'Counter POS', path: '/admin', icon: LayoutDashboard },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      ]
    : [
        { label: 'Create Order', path: '/', icon: PlusCircle },
        { label: 'My Orders', path: '/my-orders', icon: Clock },
      ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition-all">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">QueueX</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">Print & Xerox Counter</p>
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action: Auth Status */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-800">
                <User className="w-3.5 h-3.5 text-slate-700" />
                <span className="font-semibold max-w-[120px] truncate hidden sm:inline">{user?.name}</span>
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-slate-200 text-slate-800 border border-slate-300">
                  ADMIN
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}
        </div>

      </div>

      {/* Mobile Bottom Navigation Dock (Visible only on mobile devices) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-bottom shadow-lg">
        <div className={`grid ${navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-2'} h-14`}>
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
                <Icon className={`w-5 h-5 ${isActive ? 'text-sky-600 stroke-[2.5]' : 'text-slate-500'}`} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
};

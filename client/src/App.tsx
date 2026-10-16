import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerOrdersPage } from './pages/CustomerOrdersPage';
import { OperatorQueuePage } from './pages/OperatorQueuePage';
import { OwnerAnalyticsPage } from './pages/OwnerAnalyticsPage';
import { LoginPage } from './pages/LoginPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
          
          {/* Navigation */}
          <Navbar />

          {/* Main Content Area (With bottom padding on mobile for dock) */}
          <main className="flex-1 pb-16 sm:pb-0">
            <Routes>
              {/* Public Customer Routes */}
              <Route path="/" element={<CustomerOrderPage />} />
              <Route path="/my-orders" element={<CustomerOrdersPage />} />
              <Route path="/track" element={<Navigate to="/my-orders" replace />} />
              <Route path="/track/:token" element={<Navigate to="/my-orders" replace />} />
              
              {/* Staff Authentication */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Staff POS Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <OperatorQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/queue"
                element={
                  <ProtectedRoute>
                    <OperatorQueuePage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Shop Owner Analytics Route */}
              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute>
                    <OwnerAnalyticsPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 pb-24 sm:pb-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>© {new Date().getFullYear()} QueueX — Print & Xerox Counter</p>
              <p>
                Developed by{' '}
                <a
                  href="https://github.com/chandramohan385"
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-900 hover:text-sky-600 underline decoration-slate-300 underline-offset-4 transition-colors font-semibold"
                >
                  Avuram Chandra Mohan Reddy
                </a>
              </p>
            </div>
          </footer>

        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

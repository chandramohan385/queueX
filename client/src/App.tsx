import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerTrackPage } from './pages/CustomerTrackPage';
import { OperatorQueuePage } from './pages/OperatorQueuePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        
        {/* Navigation */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<CustomerOrderPage />} />
            <Route path="/track" element={<CustomerTrackPage />} />
            <Route path="/track/:token" element={<CustomerTrackPage />} />
            <Route path="/admin" element={<OperatorQueuePage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>QueueX — Smart Service & Order Management Platform</p>
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
  );
};

export default App;

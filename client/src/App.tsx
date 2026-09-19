import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CustomerOrderPage } from './pages/CustomerOrderPage';
import { CustomerTrackPage } from './pages/CustomerTrackPage';
import { OperatorQueuePage } from './pages/OperatorQueuePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#090d16] text-zinc-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
        
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
        <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-center text-xs font-mono text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>QueueX — Smart Service & Order Management Platform</p>
            <p>
              Developed by{' '}
              <a
                href="https://github.com/chandramohan385"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-300 hover:text-sky-400 underline decoration-zinc-700 underline-offset-4 transition-colors"
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

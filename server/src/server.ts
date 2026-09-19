import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import serviceRoutes from './routes/serviceRoutes';
import orderRoutes from './routes/orderRoutes';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware 1: CORS - Allows our frontend (Vite on port 5173) to communicate with this server
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Middleware 2: JSON Body Parser - Parses incoming request bodies containing application/json
app.use(express.json());

// API Routes
app.use('/api/services', serviceRoutes);
app.use('/api/orders', orderRoutes);

// Health Check Endpoint - Allows us and cloud platforms (Vercel/Render) to verify server status
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'QueueX API',
    timestamp: new Date().toISOString(),
  });
});

// Start listening for incoming HTTP requests
app.listen(PORT, () => {
  console.log(`🚀 QueueX Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check available at: http://localhost:${PORT}/api/health`);
});

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sseManager from '../services/sseManager';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'queuex_super_secret_jwt_auth_key_2026_secure';

/**
 * GET /api/events/orders
 * Protected SSE stream for the Counter Operator POS.
 * Since standard browser EventSource cannot send custom headers,
 * this accepts JWT via either 'Authorization' header or '?token=' query parameter.
 */
router.get('/orders', (req: Request, res: Response): void => {
  const token =
    (req.query.token as string) ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Authentication token is required to access operator SSE stream',
    });
    return;
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
    return;
  }

  const clientId = crypto.randomUUID();
  sseManager.addOperatorClient(clientId, res);

  // Clean up when connection closes
  req.on('close', () => {
    sseManager.removeOperatorClient(clientId);
  });
});

/**
 * GET /api/events/orders/:tokenOrId
 * Public SSE stream for a specific customer tracking their digital ticket.
 * e.g., /api/events/orders/PX-001
 */
router.get('/orders/:tokenOrId', (req: Request, res: Response): void => {
  const { tokenOrId } = req.params;
  if (!tokenOrId) {
    res.status(400).json({ success: false, message: 'Token or ID is required' });
    return;
  }

  const clientId = crypto.randomUUID();
  sseManager.addTokenClient(tokenOrId, clientId, res);

  // Clean up on disconnect
  req.on('close', () => {
    sseManager.removeTokenClient(tokenOrId, clientId);
  });
});

export default router;

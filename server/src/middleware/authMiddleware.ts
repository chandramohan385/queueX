import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include user payload
export interface AuthUserPayload {
  id: number;
  name: string;
  email: string;
  role: 'OWNER' | 'OPERATOR';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'queuex_super_secret_jwt_auth_key_2026_secure';

/**
 * Middleware: Verifies the JWT Bearer token in the Authorization header.
 * Attaches decoded user payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. Valid Bearer authentication token is required.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session. Please log in again.',
    });
    return;
  }
}

/**
 * Middleware: Requires specific role(s) to access endpoint.
 */
export function requireRole(allowedRoles: Array<'OWNER' | 'OPERATOR'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: This operation requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

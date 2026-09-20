import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/index';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'queuex_super_secret_jwt_auth_key_2026_secure';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/**
 * POST /api/auth/login
 * Authenticates staff or owner with email and password.
 * Issues a signed 7-day JWT.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.format(),
    });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const userRes = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active 
       FROM staff_users 
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
      return;
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        message: 'This staff account has been deactivated. Please contact the owner.',
      });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
      return;
    }

    // Sign 7-day JWT
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}`,
      token,
      user: payload,
    });
  } catch (error: any) {
    console.error('Error during staff login:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service encountered an unexpected error',
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated staff session profile.
 */
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;

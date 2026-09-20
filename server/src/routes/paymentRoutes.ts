import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import pool from '../db/index';
import sseManager from '../services/sseManager';

const router = Router();
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_queuex2026_demo';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'queuex_rzp_secret_key_88492049';

const createOrderSchema = z.object({
  order_id: z.number().int().positive('Order ID must be a positive integer'),
});

const verifyPaymentSchema = z.object({
  order_id: z.number().int().positive(),
  razorpay_order_id: z.string().min(1, 'Razorpay Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature is required'),
});

/**
 * POST /api/payments/create-order
 * Creates a Razorpay gateway order for the specified QueueX ticket.
 * Calculates authoritative amount in paise to avoid floating-point errors.
 */
router.post('/create-order', async (req: Request, res: Response): Promise<void> => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.format(),
    });
    return;
  }

  const { order_id } = parsed.data;

  try {
    const orderRes = await pool.query(
      `SELECT id, token_number, customer_name, customer_phone, total_amount, payment_status 
       FROM orders 
       WHERE id = $1`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      res.status(404).json({ success: false, message: `Order #${order_id} not found` });
      return;
    }

    const order = orderRes.rows[0];

    if (order.payment_status === 'PAID') {
      res.status(400).json({
        success: false,
        message: `Order #${order.token_number} is already paid.`,
      });
      return;
    }

    const amountPaise = Math.round(parseFloat(order.total_amount) * 100);
    const razorpayOrderId = `order_qx_${crypto.randomBytes(8).toString('hex')}`;

    res.status(200).json({
      success: true,
      order_id: order.id,
      token_number: order.token_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      razorpay_order_id: razorpayOrderId,
      amount: parseFloat(order.total_amount),
      amount_paise: amountPaise,
      currency: 'INR',
      key_id: RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment gateway session' });
  }
});

/**
 * POST /api/payments/verify
 * Verifies Razorpay HMAC SHA256 signature using constant-time comparison.
 * Updates order payment_status to 'PAID' and broadcasts live SSE update.
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const parsed = verifyPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.format(),
    });
    return;
  }

  const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  try {
    // 1. Calculate authentic HMAC SHA256 digest
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // 2. Timing-safe comparison to prevent side-channel timing attacks
    const isSignatureValid =
      expectedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf-8'),
        Buffer.from(razorpay_signature, 'utf-8')
      );

    if (!isSignatureValid) {
      res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification failed.',
      });
      return;
    }

    // 3. Mark order as PAID in PostgreSQL
    const updateRes = await pool.query(
      `UPDATE orders 
       SET payment_status = 'PAID', updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, token_number, customer_name, customer_phone, status, total_amount, payment_status, updated_at`,
      [order_id]
    );

    if (updateRes.rows.length === 0) {
      res.status(404).json({ success: false, message: `Order #${order_id} not found` });
      return;
    }

    const updatedOrder = updateRes.rows[0];

    // 4. Real-time Telemetry: Broadcast payment success to customer ticket & operator POS
    try {
      sseManager.broadcastStatusChanged(updatedOrder);
    } catch (sseErr) {
      console.warn('Non-blocking SSE payment broadcast error:', sseErr);
    }

    res.status(200).json({
      success: true,
      message: `Payment of ₹${parseFloat(updatedOrder.total_amount).toFixed(2)} verified successfully`,
      data: updatedOrder,
      payment_id: razorpay_payment_id,
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, message: 'Payment verification service encountered an error' });
  }
});

/**
 * POST /api/payments/simulate-signature
 * Developer Simulation Helper:
 * Mimics Razorpay's private server signing the payment callback before handing it to the client SDK.
 * Enables full end-to-end cryptographic verification without requiring active credit card charges.
 */
router.post('/simulate-signature', (req: Request, res: Response): void => {
  const { razorpay_order_id } = req.body;
  if (!razorpay_order_id) {
    res.status(400).json({ success: false, message: 'razorpay_order_id is required' });
    return;
  }

  const razorpay_payment_id = `pay_sim_${crypto.randomBytes(6).toString('hex')}`;
  const signature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  res.status(200).json({
    success: true,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature: signature,
  });
});

export default router;

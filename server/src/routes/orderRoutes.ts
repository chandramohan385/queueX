import { Router, Request, Response } from 'express';
import { z } from 'zod';
import pool from '../db/index';

const router = Router();

// Finite State Machine: Defines strictly legal order status transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

// Zod Schema for Order Creation (Runtime input validation)
const createOrderItemSchema = z.object({
  service_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  specifications: z.record(z.any()).optional().default({}),
});

const createOrderFileSchema = z.object({
  file_name: z.string().min(1),
  file_url: z.string().url(),
  file_size_bytes: z.number().int().nonnegative().optional(),
  mime_type: z.string().optional(),
  page_count: z.number().int().positive().optional().default(1),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters'),
  customer_phone: z.string().min(10, 'Valid contact number is required'),
  notes: z.string().optional().default(''),
  items: z.array(createOrderItemSchema).min(1, 'Order must include at least one service item'),
  files: z.array(createOrderFileSchema).optional().default([]),
});

/**
 * Helper: Generates a human-friendly sequential daily token
 * e.g., PX-001, PX-002, resets each day
 */
async function generateDailyToken(client: any): Promise<string> {
  const countRes = await client.query(
    `SELECT COUNT(*) FROM orders WHERE created_at >= CURRENT_DATE`
  );
  const nextNumber = parseInt(countRes.rows[0].count, 10) + 1;
  return `PX-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * POST /api/orders
 * Creates a new order with atomic database transactions & server-side price recalculation.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: parsed.error.format(),
    });
    return;
  }

  const { customer_name, customer_phone, notes, items, files } = parsed.data;

  const client = await pool.connect();

  try {
    // 1. Start an ACID Transaction
    await client.query('BEGIN');

    // 2. Fetch authoritative prices from the database (Price Shield)
    const serviceIds = items.map((i) => i.service_id);
    const servicesRes = await client.query(
      `SELECT id, name, base_price, is_active FROM services WHERE id = ANY($1)`,
      [serviceIds]
    );

    const serviceMap = new Map<number, { name: string; base_price: number; is_active: boolean }>();
    servicesRes.rows.forEach((s) => {
      serviceMap.set(s.id, {
        name: s.name,
        base_price: parseFloat(s.base_price),
        is_active: s.is_active,
      });
    });

    // Validate that every requested service exists and is active
    let calculatedTotal = 0;
    const validatedItems: Array<{
      service_id: number;
      name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
      specifications: Record<string, any>;
    }> = [];

    for (const item of items) {
      const service = serviceMap.get(item.service_id);
      if (!service || !service.is_active) {
        throw new Error(`Service ID ${item.service_id} is inactive or does not exist`);
      }

      const subtotal = service.base_price * item.quantity;
      calculatedTotal += subtotal;

      validatedItems.push({
        service_id: item.service_id,
        name: service.name,
        quantity: item.quantity,
        unit_price: service.base_price,
        subtotal: parseFloat(subtotal.toFixed(2)),
        specifications: item.specifications,
      });
    }

    calculatedTotal = parseFloat(calculatedTotal.toFixed(2));

    // 3. Generate sequential token (e.g. PX-001)
    const tokenNumber = await generateDailyToken(client);

    // 4. Insert Master Order Row
    const orderInsertRes = await client.query(
      `INSERT INTO orders (token_number, customer_name, customer_phone, notes, status, total_amount)
       VALUES ($1, $2, $3, $4, 'QUEUED', $5)
       RETURNING id, token_number, customer_name, customer_phone, status, total_amount, payment_status, notes, created_at`,
      [tokenNumber, customer_name, customer_phone, notes, calculatedTotal]
    );

    const createdOrder = orderInsertRes.rows[0];
    const orderId = createdOrder.id;

    // 5. Insert Order Items Rows
    for (const item of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, service_id, quantity, unit_price, subtotal, specifications)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.service_id, item.quantity, item.unit_price, item.subtotal, JSON.stringify(item.specifications)]
      );
    }

    // 6. Insert Uploaded Files (if any)
    for (const file of files) {
      await client.query(
        `INSERT INTO order_files (order_id, file_name, file_url, file_size_bytes, mime_type, page_count)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, file.file_name, file.file_url, file.file_size_bytes || 0, file.mime_type || 'application/octet-stream', file.page_count || 1]
      );
    }

    // 7. Commit Transaction permanently
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Order created successfully with token ${tokenNumber}`,
      data: {
        ...createdOrder,
        items: validatedItems,
        files,
      },
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Failed to create order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/orders/stats/summary
 * Summary metrics for the operator counter dashboard.
 */
router.get('/stats/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const statsRes = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'QUEUED') as queued_count,
        COUNT(*) FILTER (WHERE status = 'PROCESSING') as processing_count,
        COUNT(*) FILTER (WHERE status = 'READY') as ready_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED' AND created_at >= CURRENT_DATE) as completed_today_count,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'COMPLETED' AND created_at >= CURRENT_DATE), 0) as today_revenue
      FROM orders
    `);

    res.status(200).json({
      success: true,
      data: statsRes.rows[0],
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue statistics' });
  }
});

/**
 * GET /api/orders
 * Operator queue view. Supports filtering by status and search query.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT 
        o.id,
        o.token_number,
        o.customer_name,
        o.customer_phone,
        o.status,
        o.total_amount,
        o.payment_status,
        o.notes,
        o.created_at,
        o.updated_at,
        COUNT(DISTINCT oi.id) as item_count,
        COUNT(DISTINCT of.id) as file_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN order_files of ON of.order_id = o.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'ALL') {
      params.push(status.toUpperCase());
      query += ` AND o.status = $${params.length}`;
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      params.push(`%${search.trim().toUpperCase()}%`);
      query += ` AND (UPPER(o.customer_name) LIKE $${params.length} OR o.token_number LIKE $${params.length} OR o.customer_phone LIKE $${params.length})`;
    }

    query += `
      GROUP BY o.id
      ORDER BY 
        CASE o.status
          WHEN 'READY' THEN 1
          WHEN 'PROCESSING' THEN 2
          WHEN 'QUEUED' THEN 3
          WHEN 'COMPLETED' THEN 4
          WHEN 'CANCELLED' THEN 5
        END ASC,
        o.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching orders queue:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch queue' });
  }
});

/**
 * GET /api/orders/:tokenOrId
 * Customer Ticket Tracking & Order Detail View.
 * Matches either by numerical ID or token string (e.g. PX-001).
 */
router.get('/:tokenOrId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenOrId } = req.params;

    // Check if searching by ID or token string
    const isNumeric = /^\d+$/.test(tokenOrId);
    const orderRes = await pool.query(
      isNumeric
        ? 'SELECT * FROM orders WHERE id = $1'
        : 'SELECT * FROM orders WHERE token_number = $1',
      [isNumeric ? parseInt(tokenOrId, 10) : tokenOrId.toUpperCase()]
    );

    if (orderRes.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: `Order '${tokenOrId}' not found`,
      });
      return;
    }

    const order = orderRes.rows[0];

    // Fetch line items with service names
    const itemsRes = await pool.query(
      `SELECT oi.id, oi.service_id, s.name as service_name, s.category, oi.quantity, oi.unit_price, oi.subtotal, oi.specifications
       FROM order_items oi
       JOIN services s ON s.id = oi.service_id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [order.id]
    );

    // Fetch attached files
    const filesRes = await pool.query(
      `SELECT id, file_name, file_url, file_size_bytes, mime_type, page_count, uploaded_at
       FROM order_files
       WHERE order_id = $1
       ORDER BY id ASC`,
      [order.id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...order,
        items: itemsRes.rows,
        files: filesRes.rows,
      },
    });
  } catch (error) {
    console.error(`Error fetching order details for ${req.params.tokenOrId}:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Advances the order status according to the Finite State Machine rules.
 */
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status: targetStatus } = req.body;

    if (!targetStatus || typeof targetStatus !== 'string') {
      res.status(400).json({ success: false, message: 'Status field is required' });
      return;
    }

    const nextStatus = targetStatus.toUpperCase();

    // 1. Fetch current order
    const currentOrderRes = await pool.query('SELECT id, token_number, status FROM orders WHERE id = $1', [id]);
    if (currentOrderRes.rows.length === 0) {
      res.status(404).json({ success: false, message: `Order with ID ${id} not found` });
      return;
    }

    const currentOrder = currentOrderRes.rows[0];
    const currentStatus = currentOrder.status;

    // 2. Validate state machine transition
    const validNextStates = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!validNextStates.includes(nextStatus)) {
      res.status(400).json({
        success: false,
        message: `Illegal state transition: Cannot change order from '${currentStatus}' to '${nextStatus}'.`,
        allowed_transitions: validNextStates.length > 0 ? validNextStates : 'None (Terminal State)',
      });
      return;
    }

    // 3. Perform the status update
    const updateRes = await pool.query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, token_number, customer_name, status, total_amount, updated_at`,
      [nextStatus, id]
    );

    res.status(200).json({
      success: true,
      message: `Order ${currentOrder.token_number} transitioned from ${currentStatus} to ${nextStatus}`,
      data: updateRes.rows[0],
    });
  } catch (error) {
    console.error(`Error updating status for order ${req.params.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

export default router;

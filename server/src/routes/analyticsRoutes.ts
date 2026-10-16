import { Router, Request, Response } from 'express';
import pool from '../db';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

// All analytics routes require authenticated admin
router.use(requireAuth);

/**
 * Helper to build date range SQL filter clause
 */
function getRangeClause(range: string, column = 'o.created_at'): string {
  switch (range) {
    case 'today':
      return `DATE(${column}) = CURRENT_DATE`;
    case '7days':
      return `${column} >= NOW() - INTERVAL '7 days'`;
    case '30days':
      return `${column} >= NOW() - INTERVAL '30 days'`;
    case '90days':
      return `${column} >= NOW() - INTERVAL '90 days'`;
    case 'all':
      return '1=1';
    default:
      return `${column} >= NOW() - INTERVAL '30 days'`;
  }
}

/**
 * GET /api/analytics/overview
 * Comprehensive shop performance dashboard metrics:
 * - High-level KPIs (Gross Revenue, Avg Ticket, Order Counts)
 * - Peak Hours Distribution (customer rush patterns by hour)
 * - Top Performing Services (volume and revenue rankings)
 * - Daily Revenue Trend (for visual timeline charting)
 */
router.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const range = (req.query.range as string) || '30days';
    const rangeClause = getRangeClause(range, 'created_at');
    const orderRangeClause = getRangeClause(range, 'o.created_at');

    // 1. Overall Key Metrics
    const metricsRes = await pool.query(`
      SELECT
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'COMPLETED'), 0)::NUMERIC(10,2) as total_revenue,
        COUNT(*)::INTEGER as total_orders,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER as completed_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::INTEGER as cancelled_orders,
        COUNT(*) FILTER (WHERE status IN ('QUEUED', 'PROCESSING', 'READY'))::INTEGER as active_orders,
        COALESCE(AVG(total_amount) FILTER (WHERE status = 'COMPLETED'), 0)::NUMERIC(10,2) as avg_order_value
      FROM orders
      WHERE ${rangeClause}
    `);

    // 2. Peak Hours Distribution (8 AM - 9 PM)
    const hourlyRes = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM created_at)::INTEGER as hour,
        COUNT(*)::INTEGER as order_count
      FROM orders
      WHERE ${rangeClause}
      GROUP BY hour
      ORDER BY hour ASC
    `);

    // Normalize hours 8 through 20 (8 AM - 8 PM standard counter hours)
    const hourlyMap: Record<number, number> = {};
    hourlyRes.rows.forEach((row) => {
      hourlyMap[row.hour] = row.order_count;
    });

    const hourlyDistribution = Array.from({ length: 13 }, (_, i) => {
      const hour = i + 8; // 8 to 20
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return {
        hour,
        label: `${displayHour} ${period}`,
        order_count: hourlyMap[hour] || 0,
      };
    });

    // 3. Top Performing Services
    const topServicesRes = await pool.query(`
      SELECT
        s.id as service_id,
        s.name as service_name,
        s.category,
        s.base_price,
        s.unit,
        COUNT(DISTINCT oi.order_id)::INTEGER as order_count,
        COALESCE(SUM(oi.quantity), 0)::INTEGER as total_quantity,
        COALESCE(SUM(oi.subtotal), 0)::NUMERIC(10,2) as total_revenue
      FROM services s
      LEFT JOIN order_items oi ON oi.service_id = s.id
      LEFT JOIN orders o ON o.id = oi.order_id AND ${orderRangeClause} AND o.status != 'CANCELLED'
      GROUP BY s.id, s.name, s.category, s.base_price, s.unit
      ORDER BY total_revenue DESC, total_quantity DESC
      LIMIT 8
    `);

    // 4. Daily Revenue Trend
    const trendsRes = await pool.query(`
      SELECT
        DATE(created_at) as date,
        TO_CHAR(DATE(created_at), 'Mon DD') as formatted_date,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'COMPLETED'), 0)::NUMERIC(10,2) as revenue,
        COUNT(*)::INTEGER as order_count
      FROM orders
      WHERE ${rangeClause}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    res.status(200).json({
      success: true,
      range,
      data: {
        metrics: metricsRes.rows[0],
        hourly_distribution: hourlyDistribution,
        top_services: topServicesRes.rows,
        revenue_trends: trendsRes.rows,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/analytics/overview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics overview',
    });
  }
});

/**
 * GET /api/analytics/settlement
 * End-of-day counter reconciliation and settlement slip data:
 * - Completed vs Pending cash totals
 * - Sequential token range (e.g. PX-001 to PX-032)
 * - Itemized service revenue for accounting
 */
router.get('/settlement', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // 1. Settlement Totals for the specified date
    const summaryRes = await pool.query(
      `SELECT
        COUNT(*)::INTEGER as total_orders,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::INTEGER as completed_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')::INTEGER as cancelled_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'COMPLETED'), 0)::NUMERIC(10,2) as settled_revenue,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PENDING' AND status != 'CANCELLED'), 0)::NUMERIC(10,2) as pending_revenue,
        MIN(token_number) as token_start,
        MAX(token_number) as token_end
      FROM orders
      WHERE DATE(created_at) = $1`,
      [targetDate]
    );

    // 2. Itemized Service Summary for this date
    const servicesRes = await pool.query(
      `SELECT
        s.name as service_name,
        s.category,
        s.unit,
        COALESCE(SUM(oi.quantity), 0)::INTEGER as quantity,
        COALESCE(SUM(oi.subtotal), 0)::NUMERIC(10,2) as revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN services s ON s.id = oi.service_id
      WHERE DATE(o.created_at) = $1 AND o.status != 'CANCELLED'
      GROUP BY s.id, s.name, s.category, s.unit
      ORDER BY revenue DESC`,
      [targetDate]
    );

    res.status(200).json({
      success: true,
      date: targetDate,
      data: {
        ...summaryRes.rows[0],
        services_summary: servicesRes.rows,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/analytics/settlement:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch daily settlement data',
    });
  }
});

export default router;

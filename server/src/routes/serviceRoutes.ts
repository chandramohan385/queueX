import { Router, Request, Response } from 'express';
import pool from '../db/index';

const router = Router();

/**
 * GET /api/services
 * Fetches all active services from the catalog for the customer menu & price calculator.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT id, name, category, description, base_price, unit 
      FROM services 
      WHERE is_active = true 
      ORDER BY 
        CASE category 
          WHEN 'PRINTING' THEN 1 
          WHEN 'FINISHING' THEN 2 
          WHEN 'PHOTO' THEN 3 
          WHEN 'CARD_PRINT' THEN 4 
          ELSE 5 
        END ASC, 
        base_price ASC, 
        id ASC
    `);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services catalog',
    });
  }
});

/**
 * GET /api/services/:id
 * Fetches details of a single service by ID.
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, name, category, description, base_price, unit FROM services WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: `Service with ID ${id} not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`Error fetching service ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service details',
    });
  }
});

export default router;

import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { getRows, getRow, runQuery } from '../database/database'

const router = Router()

// Get all trips
router.get('/', async (req: Request, res: Response) => {
  try {
    const trips = await getRows(`
      SELECT 
        t.*,
        u.name as driver_name,
        COUNT(tb.id) as current_passengers
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN trip_bookings tb ON t.id = tb.trip_id AND tb.status = 'confirmed'
      GROUP BY t.id
      ORDER BY t.date DESC, t.time ASC
    `)

    res.json({
      success: true,
      data: trips
    })
  } catch (error) {
    console.error('Error fetching trips:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get trip by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const trip = await getRow(`
      SELECT 
        t.*,
        u.name as driver_name,
        COUNT(tb.id) as current_passengers
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN trip_bookings tb ON t.id = tb.trip_id AND tb.status = 'confirmed'
      WHERE t.id = ?
      GROUP BY t.id
    `, [id])

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Trip not found'
        }
      })
    }

    // Get passengers for this trip
    const passengers = await getRows(`
      SELECT u.id, u.name, u.email, u.phone
      FROM trip_bookings tb
      JOIN users u ON tb.user_id = u.id
      WHERE tb.trip_id = ? AND tb.status = 'confirmed'
    `, [id])

    res.json({
      success: true,
      data: {
        ...trip,
        passengers
      }
    })
  } catch (error) {
    console.error('Error fetching trip:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Create new trip
router.post('/', [
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  body('date').isISO8601().withMessage('Must be a valid date'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/).withMessage('Must be a valid time format (HH:MM AM/PM)'),
  body('max_passengers').optional().isInt({ min: 1, max: 50 }).withMessage('Max passengers must be between 1 and 50'),
  body('driver_id').optional().isInt().withMessage('Driver ID must be a valid integer')
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      })
    }

    const { destination, date, time, max_passengers = 15, driver_id } = req.body

    // Check if driver exists (if provided)
    if (driver_id) {
      const driver = await getRow('SELECT id FROM users WHERE id = ?', [driver_id])
      if (!driver) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Driver not found'
          }
        })
      }
    }

    const result = await runQuery(
      'INSERT INTO trips (destination, date, time, max_passengers, driver_id) VALUES (?, ?, ?, ?, ?)',
      [destination, date, time, max_passengers, driver_id]
    )

    const newTrip = await getRow('SELECT * FROM trips WHERE id = ?', [result.id])

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: newTrip
    })
  } catch (error) {
    console.error('Error creating trip:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Update trip
router.put('/:id', [
  body('destination').optional().trim().notEmpty().withMessage('Destination cannot be empty'),
  body('date').optional().isISO8601().withMessage('Must be a valid date'),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/).withMessage('Must be a valid time format'),
  body('max_passengers').optional().isInt({ min: 1, max: 50 }).withMessage('Max passengers must be between 1 and 50'),
  body('status').optional().isIn(['scheduled', 'in-progress', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('driver_id').optional().isInt().withMessage('Driver ID must be a valid integer')
], async (req: Request, res: Response) => {
  try {
    // Check validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      })
    }

    const { id } = req.params
    const updateData = req.body

    // Check if trip exists
    const existingTrip = await getRow('SELECT id FROM trips WHERE id = ?', [id])
    if (!existingTrip) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Trip not found'
        }
      })
    }

    // Check if driver exists (if provided)
    if (updateData.driver_id) {
      const driver = await getRow('SELECT id FROM users WHERE id = ?', [updateData.driver_id])
      if (!driver) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Driver not found'
          }
        })
      }
    }

    // Build update query dynamically
    const fields = Object.keys(updateData).filter(key => key !== 'id')
    const setClause = fields.map(field => `${field} = ?`).join(', ')
    const values = fields.map(field => updateData[field])

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No fields to update'
        }
      })
    }

    await runQuery(
      `UPDATE trips SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    )

    const updatedTrip = await getRow('SELECT * FROM trips WHERE id = ?', [id])

    res.json({
      success: true,
      message: 'Trip updated successfully',
      data: updatedTrip
    })
  } catch (error) {
    console.error('Error updating trip:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Delete trip
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // Check if trip exists
    const existingTrip = await getRow('SELECT id FROM trips WHERE id = ?', [id])
    if (!existingTrip) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Trip not found'
        }
      })
    }

    // Delete related bookings first
    await runQuery('DELETE FROM trip_bookings WHERE trip_id = ?', [id])
    
    // Delete trip
    await runQuery('DELETE FROM trips WHERE id = ?', [id])

    res.json({
      success: true,
      message: 'Trip deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting trip:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

export default router

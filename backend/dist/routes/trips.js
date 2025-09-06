"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../database/database");
const router = (0, express_1.Router)();
// Get all trips
router.get('/', async (req, res) => {
    try {
        const trips = await (0, database_1.getRows)(`
      SELECT 
        t.*,
        u.name as driver_name,
        COUNT(tb.id) as current_passengers
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN trip_bookings tb ON t.id = tb.trip_id AND tb.status = 'confirmed'
      GROUP BY t.id
      ORDER BY t.date DESC, t.time ASC
    `);
        res.json({
            success: true,
            data: trips
        });
    }
    catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Get trip by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await (0, database_1.getRow)(`
      SELECT 
        t.*,
        u.name as driver_name,
        COUNT(tb.id) as current_passengers
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN trip_bookings tb ON t.id = tb.trip_id AND tb.status = 'confirmed'
      WHERE t.id = ?
      GROUP BY t.id
    `, [id]);
        if (!trip) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Trip not found'
                }
            });
        }
        // Get passengers for this trip
        const passengers = await (0, database_1.getRows)(`
      SELECT u.id, u.name, u.email, u.phone
      FROM trip_bookings tb
      JOIN users u ON tb.user_id = u.id
      WHERE tb.trip_id = ? AND tb.status = 'confirmed'
    `, [id]);
        res.json({
            success: true,
            data: {
                ...trip,
                passengers
            }
        });
    }
    catch (error) {
        console.error('Error fetching trip:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Create new trip
router.post('/', [
    (0, express_validator_1.body)('destination').trim().notEmpty().withMessage('Destination is required'),
    (0, express_validator_1.body)('date').isISO8601().withMessage('Must be a valid date'),
    (0, express_validator_1.body)('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/).withMessage('Must be a valid time format (HH:MM AM/PM)'),
    (0, express_validator_1.body)('max_passengers').optional().isInt({ min: 1, max: 50 }).withMessage('Max passengers must be between 1 and 50'),
    (0, express_validator_1.body)('driver_id').optional().isInt().withMessage('Driver ID must be a valid integer')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }
        const { destination, date, time, max_passengers = 15, driver_id } = req.body;
        // Check if driver exists (if provided)
        if (driver_id) {
            const driver = await (0, database_1.getRow)('SELECT id FROM users WHERE id = ?', [driver_id]);
            if (!driver) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Driver not found'
                    }
                });
            }
        }
        const result = await (0, database_1.runQuery)('INSERT INTO trips (destination, date, time, max_passengers, driver_id) VALUES (?, ?, ?, ?, ?)', [destination, date, time, max_passengers, driver_id]);
        const newTrip = await (0, database_1.getRow)('SELECT * FROM trips WHERE id = ?', [result.id]);
        res.status(201).json({
            success: true,
            message: 'Trip created successfully',
            data: newTrip
        });
    }
    catch (error) {
        console.error('Error creating trip:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Update trip
router.put('/:id', [
    (0, express_validator_1.body)('destination').optional().trim().notEmpty().withMessage('Destination cannot be empty'),
    (0, express_validator_1.body)('date').optional().isISO8601().withMessage('Must be a valid date'),
    (0, express_validator_1.body)('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9] (AM|PM)$/).withMessage('Must be a valid time format'),
    (0, express_validator_1.body)('max_passengers').optional().isInt({ min: 1, max: 50 }).withMessage('Max passengers must be between 1 and 50'),
    (0, express_validator_1.body)('status').optional().isIn(['scheduled', 'in-progress', 'completed', 'cancelled']).withMessage('Invalid status'),
    (0, express_validator_1.body)('driver_id').optional().isInt().withMessage('Driver ID must be a valid integer')
], async (req, res) => {
    try {
        // Check validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Validation failed',
                    details: errors.array()
                }
            });
        }
        const { id } = req.params;
        const updateData = req.body;
        // Check if trip exists
        const existingTrip = await (0, database_1.getRow)('SELECT id FROM trips WHERE id = ?', [id]);
        if (!existingTrip) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Trip not found'
                }
            });
        }
        // Check if driver exists (if provided)
        if (updateData.driver_id) {
            const driver = await (0, database_1.getRow)('SELECT id FROM users WHERE id = ?', [updateData.driver_id]);
            if (!driver) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Driver not found'
                    }
                });
            }
        }
        // Build update query dynamically
        const fields = Object.keys(updateData).filter(key => key !== 'id');
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => updateData[field]);
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'No fields to update'
                }
            });
        }
        await (0, database_1.runQuery)(`UPDATE trips SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
        const updatedTrip = await (0, database_1.getRow)('SELECT * FROM trips WHERE id = ?', [id]);
        res.json({
            success: true,
            message: 'Trip updated successfully',
            data: updatedTrip
        });
    }
    catch (error) {
        console.error('Error updating trip:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Delete trip
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if trip exists
        const existingTrip = await (0, database_1.getRow)('SELECT id FROM trips WHERE id = ?', [id]);
        if (!existingTrip) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Trip not found'
                }
            });
        }
        // Delete related bookings first
        await (0, database_1.runQuery)('DELETE FROM trip_bookings WHERE trip_id = ?', [id]);
        // Delete trip
        await (0, database_1.runQuery)('DELETE FROM trips WHERE id = ?', [id]);
        res.json({
            success: true,
            message: 'Trip deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting trip:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=trips.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database/database");
const router = (0, express_1.Router)();
// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await (0, database_1.getRows)(`
      SELECT 
        id, name, email, phone, status, created_at, updated_at
      FROM users
      ORDER BY name ASC
    `);
        res.json({
            success: true,
            data: users
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await (0, database_1.getRow)(`
      SELECT 
        id, name, email, phone, status, created_at, updated_at
      FROM users
      WHERE id = ?
    `, [id]);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found'
                }
            });
        }
        // Get user's trip history
        const tripHistory = await (0, database_1.getRows)(`
      SELECT 
        t.id, t.destination, t.date, t.time, t.status,
        tb.status as booking_status
      FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      WHERE tb.user_id = ?
      ORDER BY t.date DESC, t.time DESC
    `, [id]);
        res.json({
            success: true,
            data: {
                ...user,
                tripHistory
            }
        });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Update user
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail().withMessage('Must be a valid email'),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any').withMessage('Must be a valid phone number'),
    (0, express_validator_1.body)('status').optional().isIn(['active', 'inactive']).withMessage('Status must be either active or inactive')
], async (req, res) => {
    try {
        // Check validation errors - forcing refresh
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
        // Check if user exists
        const existingUser = await (0, database_1.getRow)('SELECT id FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found'
                }
            });
        }
        // Check if email is already taken by another user
        if (updateData.email) {
            const userWithEmail = await (0, database_1.getRow)('SELECT id FROM users WHERE email = ? AND id != ?', [updateData.email, id]);
            if (userWithEmail) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Email is already taken by another user'
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
        await (0, database_1.runQuery)(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
        const updatedUser = await (0, database_1.getRow)(`
      SELECT id, name, email, phone, status, created_at, updated_at
      FROM users WHERE id = ?
    `, [id]);
        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await (0, database_1.getRow)('SELECT id FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found'
                }
            });
        }
        // Check if user has any active trip bookings
        const activeBookings = await (0, database_1.getRow)(`
      SELECT COUNT(*) as count
      FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      WHERE tb.user_id = ? AND t.status IN ('scheduled', 'in-progress')
    `, [id]);
        if (activeBookings.count > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Cannot delete user with active trip bookings'
                }
            });
        }
        // Delete user's trip bookings
        await (0, database_1.runQuery)('DELETE FROM trip_bookings WHERE user_id = ?', [id]);
        // Delete user
        await (0, database_1.runQuery)('DELETE FROM users WHERE id = ?', [id]);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Get user statistics
router.get('/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if user exists
        const existingUser = await (0, database_1.getRow)('SELECT id FROM users WHERE id = ?', [id]);
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'User not found'
                }
            });
        }
        // Get user statistics
        const stats = await (0, database_1.getRow)(`
      SELECT 
        COUNT(*) as total_trips,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled_trips,
        COUNT(CASE WHEN t.status = 'in-progress' THEN 1 END) as active_trips
      FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      WHERE tb.user_id = ?
    `, [id]);
        // Get favorite destinations
        const favoriteDestinations = await (0, database_1.getRows)(`
      SELECT 
        t.destination,
        COUNT(*) as visit_count
      FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      WHERE tb.user_id = ? AND t.status = 'completed'
      GROUP BY t.destination
      ORDER BY visit_count DESC
      LIMIT 5
    `, [id]);
        res.json({
            success: true,
            data: {
                stats,
                favoriteDestinations
            }
        });
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Get user profile (requires authentication)
router.get('/profile', async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Access denied. No token provided.'
                }
            });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const userId = decoded.userId;
            const user = await (0, database_1.getRow)('SELECT id, name, email, city, mailing_address, referral, created_at FROM users WHERE id = ?', [userId]);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'User not found'
                    }
                });
            }
            // Get user's reading progress
            const progress = await (0, database_1.getRow)('SELECT COUNT(*) as completed_days FROM reading_progress WHERE user_id = ? AND completed = 1', [userId]);
            const progressPercentage = Math.round((progress.completed_days / 365) * 100);
            // Get user's current group
            const currentGroup = await (0, database_1.getRow)(`SELECT bg.name, bg.start_date, bg.end_date 
         FROM group_members gm 
         JOIN bible_groups bg ON gm.group_id = bg.id 
         WHERE gm.user_id = ? AND bg.status = 'active' 
         ORDER BY bg.start_date DESC LIMIT 1`, [userId]);
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        city: user.city,
                        mailing_address: user.mailing_address,
                        referral: user.referral,
                        created_at: user.created_at
                    },
                    progress: progressPercentage,
                    currentGroup: currentGroup ? currentGroup.name : 'Not assigned',
                    nextMilestone: getNextMilestone(progress.completed_days)
                }
            });
        }
        catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid token'
                }
            });
        }
    }
    catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Helper function to get next milestone
function getNextMilestone(completedDays) {
    const milestones = [
        { days: 7, text: 'Week 1 Complete!' },
        { days: 30, text: 'Month 1 Complete!' },
        { days: 100, text: '100 Days Complete!' },
        { days: 180, text: 'Halfway There!' },
        { days: 365, text: 'Journey Complete!' }
    ];
    for (const milestone of milestones) {
        if (completedDays < milestone.days) {
            return `${milestone.text} (${milestone.days - completedDays} days to go)`;
        }
    }
    return 'All milestones completed! 🎉';
}
exports.default = router;
//# sourceMappingURL=users.js.map
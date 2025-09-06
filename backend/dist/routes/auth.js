"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const database_1 = require("../database/database");
const emailService_1 = require("../utils/emailService");
const groupService_1 = require("../services/groupService");
const messageService_1 = require("../services/messageService");
const userInteractionService_1 = require("../services/userInteractionService");
const userAuth_1 = require("../middleware/userAuth");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Register new user
router.post('/register', [
    (0, express_validator_1.body)('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('any').withMessage('Must be a valid phone number')
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
        const { name, email, phone, city, mailing_address, referral } = req.body;
        // Check if user already exists (case-insensitive)
        const existingUser = await (0, database_1.getRow)('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'User with this email already exists'
                }
            });
        }
        // Create user (without password)
        const result = await (0, database_1.runQuery)('INSERT INTO users (name, email, phone, city, mailing_address, referral) VALUES (?, ?, ?, ?, ?, ?)', [name, email, phone, city, mailing_address, referral]);
        // Assign user to current active group
        const groupAssignment = await groupService_1.GroupService.assignUserToGroup(result.lastID);
        if (!groupAssignment.success) {
            // If group assignment fails, delete the user and return error
            await (0, database_1.runQuery)('DELETE FROM users WHERE id = ?', [result.lastID]);
            return res.status(400).json({
                success: false,
                error: {
                    message: groupAssignment.message
                }
            });
        }
        // Get group details
        const group = await groupService_1.GroupService.getGroupById(groupAssignment.groupId);
        res.status(201).json({
            success: true,
            message: 'User registered successfully and assigned to group',
            data: {
                user: {
                    id: result.lastID,
                    name,
                    email,
                    phone,
                    city,
                    mailing_address,
                    referral
                },
                group: {
                    id: group?.id,
                    name: group?.name,
                    start_date: group?.start_date,
                    registration_deadline: group?.registration_deadline
                },
                message: groupAssignment.message
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Login user
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required')
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
        const { email, name } = req.body;
        // Find user by email (case-insensitive)
        const user = await (0, database_1.getRow)('SELECT id, name, email, phone, password_hash, status, role FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password'
                }
            });
        }
        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Account is not active'
                }
            });
        }
        // Verify name matches (case-insensitive)
        if (user.name.toLowerCase() !== name.toLowerCase()) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or name'
                }
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role
                },
                token
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Admin login
router.post('/admin/login', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Must be a valid email'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required')
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
        const { email, password } = req.body;
        // Find admin user by email
        const user = await (0, database_1.getRow)('SELECT id, name, email, password_hash, status, role FROM users WHERE email = ? AND role = ?', [email, 'admin']);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password'
                }
            });
        }
        // Check if user is active
        if (user.status !== 'active') {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Account is not active'
                }
            });
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'Invalid email or password'
                }
            });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    }
    catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Change password (requires authentication)
router.post('/change-password', [
    (0, express_validator_1.body)('currentPassword').notEmpty().withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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
        const { currentPassword, newPassword } = req.body;
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
            // Get current user
            const user = await (0, database_1.getRow)('SELECT password_hash FROM users WHERE id = ?', [userId]);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'User not found'
                    }
                });
            }
            // Verify current password
            const isValidPassword = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Current password is incorrect'
                    }
                });
            }
            // Hash new password
            const saltRounds = 12;
            const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
            // Update password
            await (0, database_1.runQuery)('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, userId]);
            res.json({
                success: true,
                message: 'Password changed successfully'
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
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Reset password (no authentication required)
router.post('/reset-password', [
    (0, express_validator_1.body)('email').isEmail().withMessage('Must be a valid email')
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
        const { email } = req.body;
        // Check if user exists
        const user = await (0, database_1.getRow)('SELECT id, name FROM users WHERE email = ?', [email]);
        if (!user) {
            // For security reasons, don't reveal if user exists or not
            return res.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent'
            });
        }
        // Generate a secure reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        // Store the reset token in the database
        await (0, database_1.runQuery)('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, resetToken, expiresAt.toISOString()]);
        // Send the password reset email
        const emailSent = await (0, emailService_1.sendPasswordResetEmail)(email, resetToken, user.name);
        if (emailSent) {
            console.log(`✅ Password reset email sent successfully to: ${user.name} (${email})`);
            res.json({
                success: true,
                message: 'Password reset email sent! Check your inbox.'
            });
        }
        else {
            // If email fails, remove the token
            await (0, database_1.runQuery)('DELETE FROM password_reset_tokens WHERE token = ?', [resetToken]);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to send password reset email. Please try again.'
                }
            });
        }
    }
    catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Reset password with token
router.post('/reset-password-confirm', [
    (0, express_validator_1.body)('token').notEmpty().withMessage('Reset token is required'),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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
        const { token, newPassword } = req.body;
        // Find the reset token
        const resetToken = await (0, database_1.getRow)('SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > datetime("now")', [token]);
        if (!resetToken) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid or expired reset token. Please request a new password reset.'
                }
            });
        }
        // Hash the new password
        const saltRounds = 12;
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        // Update the user's password
        await (0, database_1.runQuery)('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, resetToken.user_id]);
        // Mark the token as used
        await (0, database_1.runQuery)('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [resetToken.id]);
        res.json({
            success: true,
            message: 'Password reset successfully! You can now log in with your new password.'
        });
    }
    catch (error) {
        console.error('❌ Password reset confirmation error:', error);
        console.error('❌ Error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : 'Unknown'
        });
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// ===== USER GROUP MESSAGES =====
// Get messages for user's current group
router.get('/my-group-messages', userAuth_1.userAuth, async (req, res) => {
    try {
        // Get user's group from the request (this would be set by middleware)
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { message: 'User not authenticated' }
            });
        }
        // Get user's current group
        const userGroup = await (0, database_1.getRow)(`
      SELECT gm.group_id, bg.name as group_name
      FROM group_members gm
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId]);
        if (!userGroup) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not assigned to any active group' }
            });
        }
        // Get messages for the user's group
        const messages = await messageService_1.MessageService.getMessagesByGroup(userGroup.group_id, 50);
        res.json({
            success: true,
            data: {
                group: {
                    id: userGroup.group_id,
                    name: userGroup.group_name
                },
                messages
            }
        });
    }
    catch (error) {
        console.error('Error fetching user group messages:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch group messages' }
        });
    }
});
// Get messages by type for user's group
router.get('/my-group-messages/:type', userAuth_1.userAuth, async (req, res) => {
    try {
        const messageType = req.params.type;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { message: 'User not authenticated' }
            });
        }
        // Get user's current group
        const userGroup = await (0, database_1.getRow)(`
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId]);
        if (!userGroup) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not assigned to any active group' }
            });
        }
        // Get messages by type for the user's group
        const messages = await messageService_1.MessageService.getMessagesByType(userGroup.group_id, messageType, 20);
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('Error fetching user group messages by type:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch group messages' }
        });
    }
});
// ===== USER INTERACTIONS =====
// Get all messages (admin + user) for user's group with comments
router.get('/my-group-all-messages', userAuth_1.userAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: { message: 'User not authenticated' }
            });
        }
        // Get user's current group
        const userGroup = await (0, database_1.getRow)(`
      SELECT gm.group_id, bg.name as group_name
      FROM group_members gm
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId]);
        if (!userGroup) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not assigned to any active group' }
            });
        }
        // Get all messages (admin + user) with comments
        const messages = await userInteractionService_1.UserInteractionService.getAllGroupMessages(userGroup.group_id);
        res.json({
            success: true,
            data: {
                group: {
                    id: userGroup.group_id,
                    name: userGroup.group_name
                },
                messages
            }
        });
    }
    catch (error) {
        console.error('Error fetching all group messages:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch group messages' }
        });
    }
});
// Add a comment to a message
router.post('/add-comment', userAuth_1.userAuth, [
    (0, express_validator_1.body)('messageId').isInt().withMessage('Message ID must be a number'),
    (0, express_validator_1.body)('content').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
], async (req, res) => {
    try {
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
        const userId = req.user?.id;
        const { messageId, content } = req.body;
        // Add the comment
        const result = await userInteractionService_1.UserInteractionService.addComment(messageId, userId, content);
        res.json({
            success: true,
            message: 'Comment added successfully',
            data: { commentId: result.id }
        });
    }
    catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to add comment' }
        });
    }
});
// Create a new user message
router.post('/create-message', userAuth_1.userAuth, [
    (0, express_validator_1.body)('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
    (0, express_validator_1.body)('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters'),
    (0, express_validator_1.body)('messageType').optional().isIn(['encouragement', 'prayer', 'testimony', 'question']).withMessage('Invalid message type')
], async (req, res) => {
    try {
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
        const userId = req.user?.id;
        const { title, content, messageType = 'encouragement' } = req.body;
        // Get user's current group
        const userGroup = await (0, database_1.getRow)(`
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId]);
        if (!userGroup) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not assigned to any active group' }
            });
        }
        // Create the message
        const result = await userInteractionService_1.UserInteractionService.createUserMessage(userGroup.group_id, userId, title, content, messageType);
        res.json({
            success: true,
            message: 'Message created successfully',
            data: { messageId: result.id }
        });
    }
    catch (error) {
        console.error('Error creating user message:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to create message' }
        });
    }
});
// Get user's own messages
router.get('/my-messages', userAuth_1.userAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        // Get user's current group
        const userGroup = await (0, database_1.getRow)(`
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId]);
        if (!userGroup) {
            return res.status(404).json({
                success: false,
                error: { message: 'User not assigned to any active group' }
            });
        }
        // Get user's own messages
        const messages = await userInteractionService_1.UserInteractionService.getUserOwnMessages(userId, userGroup.group_id);
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('Error fetching user messages:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch user messages' }
        });
    }
});
// Delete user's own message
router.delete('/my-messages/:messageId', userAuth_1.userAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const messageId = parseInt(req.params.messageId);
        if (isNaN(messageId)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid message ID' }
            });
        }
        // Delete the message
        const result = await userInteractionService_1.UserInteractionService.deleteUserMessage(messageId, userId);
        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: { message: 'Message not found or not authorized to delete' }
            });
        }
        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user message:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to delete message' }
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
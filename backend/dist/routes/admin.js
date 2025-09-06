"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../database/database");
const adminAuth_1 = require("../middleware/adminAuth");
const groupService_1 = require("../services/groupService");
const cronService_1 = require("../services/cronService");
const messageService_1 = require("../services/messageService");
const router = (0, express_1.Router)();
// Apply admin authentication to all admin routes
router.use(adminAuth_1.adminAuth);
// Get all groups with member counts
router.get('/groups', async (req, res) => {
    try {
        const groups = await groupService_1.GroupService.getAllGroupsWithMemberCounts();
        res.json({
            success: true,
            data: groups
        });
    }
    catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch groups' }
        });
    }
});
// Get group details by ID
router.get('/groups/:id', async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const group = await groupService_1.GroupService.getGroupById(groupId);
        if (!group) {
            return res.status(404).json({
                success: false,
                error: { message: 'Group not found' }
            });
        }
        const members = await groupService_1.GroupService.getGroupMembers(groupId);
        res.json({
            success: true,
            data: {
                group,
                members
            }
        });
    }
    catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch group' }
        });
    }
});
// Manually trigger cron jobs (for testing)
router.post('/cron/run', async (req, res) => {
    try {
        await cronService_1.CronService.runAllCronJobs();
        res.json({
            success: true,
            message: 'Cron jobs executed successfully'
        });
    }
    catch (error) {
        console.error('Error running cron jobs:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to run cron jobs' }
        });
    }
});
// Normalize all groups to quarterly anchors (Admin maintenance action)
router.post('/groups/normalize', async (req, res) => {
    try {
        const result = await groupService_1.GroupService.normalizeAllGroups();
        res.json({ success: true, message: 'Groups normalized', data: result });
    }
    catch (error) {
        console.error('Error normalizing groups:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to normalize groups' } });
    }
});
// Create a new group (admin action)
router.post('/groups', [
    (0, express_validator_1.body)('start_date').isISO8601().withMessage('start_date must be YYYY-MM-DD'),
    (0, express_validator_1.body)('max_members').optional().isInt({ min: 1 }).withMessage('max_members must be a positive integer'),
    (0, express_validator_1.body)('status').optional().isIn(['upcoming', 'active', 'closed', 'completed']).withMessage('Invalid status'),
    (0, express_validator_1.body)('name').optional().isString().isLength({ min: 3, max: 200 }).withMessage('name must be 3-200 chars')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } });
        }
        const { start_date, max_members, status, name } = req.body;
        const group = await groupService_1.GroupService.createGroupWithStart(start_date, max_members, status, name);
        res.status(201).json({ success: true, message: 'Group created', data: group });
    }
    catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to create group' } });
    }
});
// Get current active group
router.get('/groups/current/active', async (req, res) => {
    try {
        const currentGroup = await groupService_1.GroupService.getCurrentActiveGroup();
        res.json({
            success: true,
            data: currentGroup
        });
    }
    catch (error) {
        console.error('Error fetching current group:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch current group' }
        });
    }
});
// Get next upcoming group
router.get('/groups/next/upcoming', async (req, res) => {
    try {
        const nextGroup = await groupService_1.GroupService.getNextUpcomingGroup();
        res.json({
            success: true,
            data: nextGroup
        });
    }
    catch (error) {
        console.error('Error fetching next group:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch next group' }
        });
    }
});
// Get all users with their group memberships
router.get('/users', async (req, res) => {
    try {
        const users = await (0, database_1.getRows)(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.status, u.city,
        u.created_at, u.updated_at,
        GROUP_CONCAT(bg.name) as group_names
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN bible_groups bg ON gm.group_id = bg.id
      GROUP BY u.id
      ORDER BY u.name ASC
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
// Get reading progress for all users
router.get('/progress', async (req, res) => {
    try {
        const progress = await (0, database_1.getRows)(`
      SELECT 
        u.name as user_name,
        bg.name as group_name,
        COUNT(rp.day_number) as days_completed,
        MAX(rp.day_number) as last_day_read,
        rp.submitted_at as last_activity
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN bible_groups bg ON gm.group_id = bg.id
      LEFT JOIN reading_progress rp ON u.id = rp.user_id AND bg.id = rp.group_id
      WHERE bg.status = 'active'
      GROUP BY u.id, bg.id
      ORDER BY bg.start_date DESC, u.name ASC
    `);
        res.json({
            success: true,
            data: progress
        });
    }
    catch (error) {
        console.error('Error fetching progress:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Create admin message/announcement
router.post('/messages', [
    (0, express_validator_1.body)('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    (0, express_validator_1.body)('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
    (0, express_validator_1.body)('type').isIn(['encouragement', 'milestone', 'announcement', 'reminder']).withMessage('Invalid message type'),
    (0, express_validator_1.body)('target_group_id').optional().isInt().withMessage('Target group ID must be a valid integer')
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
        const { title, message, type, target_group_id } = req.body;
        const adminUser = req.user;
        const result = await (0, database_1.runQuery)('INSERT INTO admin_messages (title, message, type, target_group_id, created_by) VALUES (?, ?, ?, ?, ?)', [title, message, type, target_group_id, adminUser.id]);
        const newMessage = await (0, database_1.getRow)('SELECT * FROM admin_messages WHERE id = ?', [result.id]);
        res.status(201).json({
            success: true,
            message: 'Admin message created successfully',
            data: newMessage
        });
    }
    catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Get all admin messages
router.get('/messages', async (req, res) => {
    try {
        const messages = await (0, database_1.getRows)(`
      SELECT 
        am.id, am.title, am.message, am.type, am.created_at,
        bg.name as target_group_name,
        u.name as created_by_name
      FROM admin_messages am
      LEFT JOIN bible_groups bg ON am.target_group_id = bg.id
      LEFT JOIN users u ON am.created_by = u.id
      ORDER BY am.created_at DESC
    `);
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// Get donation reports
router.get('/donations', async (req, res) => {
    try {
        const donations = await (0, database_1.getRows)(`
      SELECT 
        id, donor_name, donor_email, amount, type, anonymous, status, created_at
      FROM donations
      ORDER BY created_at DESC
    `);
        const totalAmount = donations.reduce((sum, donation) => sum + parseFloat(donation.amount), 0);
        const monthlyAmount = donations
            .filter(d => new Date(d.created_at).getMonth() === new Date().getMonth())
            .reduce((sum, donation) => sum + parseFloat(donation.amount), 0);
        res.json({
            success: true,
            data: {
                donations,
                summary: {
                    total: totalAmount,
                    monthly: monthlyAmount,
                    count: donations.length
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching donations:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Internal server error'
            }
        });
    }
});
// ===== GROUP MESSAGE MANAGEMENT =====
// Create a new group message
router.post('/group-messages', [
    (0, express_validator_1.body)('group_id').isInt().withMessage('Group ID must be a valid integer'),
    (0, express_validator_1.body)('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    (0, express_validator_1.body)('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
    (0, express_validator_1.body)('message_type').isIn(['encouragement', 'reminder', 'announcement', 'milestone']).withMessage('Invalid message type'),
    (0, express_validator_1.body)('priority').isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
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
        const { group_id, title, content, message_type, priority } = req.body;
        const adminUser = req.user;
        const message = await messageService_1.MessageService.createMessage({
            group_id,
            title,
            content,
            message_type,
            priority,
            created_by: adminUser.id
        });
        res.status(201).json({
            success: true,
            message: 'Group message created successfully',
            data: message
        });
    }
    catch (error) {
        console.error('Error creating group message:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to create group message' }
        });
    }
});
// Get all group messages (admin view)
router.get('/group-messages', async (req, res) => {
    try {
        const messages = await messageService_1.MessageService.getAllMessages();
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('Error fetching group messages:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch group messages' }
        });
    }
});
// Get messages for a specific group
router.get('/group-messages/group/:groupId', async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const messages = await messageService_1.MessageService.getMessagesByGroup(groupId);
        res.json({
            success: true,
            data: messages
        });
    }
    catch (error) {
        console.error('Error fetching group messages:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch group messages' }
        });
    }
});
// Update a group message
router.put('/group-messages/:id', [
    (0, express_validator_1.body)('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
    (0, express_validator_1.body)('content').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
    (0, express_validator_1.body)('message_type').optional().isIn(['encouragement', 'reminder', 'announcement', 'milestone']).withMessage('Invalid message type'),
    (0, express_validator_1.body)('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
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
        const messageId = parseInt(req.params.id);
        const updates = req.body;
        const success = await messageService_1.MessageService.updateMessage(messageId, updates);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { message: 'Message not found' }
            });
        }
        const updatedMessage = await messageService_1.MessageService.getMessageById(messageId);
        res.json({
            success: true,
            message: 'Message updated successfully',
            data: updatedMessage
        });
    }
    catch (error) {
        console.error('Error updating group message:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to update group message' }
        });
    }
});
// Delete a group message
router.delete('/group-messages/:id', async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const success = await messageService_1.MessageService.deleteMessage(messageId);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: { message: 'Message not found' }
            });
        }
        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting group message:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to delete group message' }
        });
    }
});
// Get message statistics for a group
router.get('/group-messages/stats/:groupId', async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const stats = await messageService_1.MessageService.getGroupMessageStats(groupId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching message stats:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Failed to fetch message statistics' }
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map
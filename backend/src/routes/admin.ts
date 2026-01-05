import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import { getRows, getRow, runQuery } from '../database/database'
import { adminAuth } from '../middleware/adminAuth'
import { GroupService } from '../services/groupService'
import { CronService } from '../services/cronService'
import { MessageService } from '../services/messageService'
import { UserInteractionService } from '../services/userInteractionService'

const router = Router()

// Apply admin authentication to all admin routes
router.use(adminAuth)

// Get all groups with member counts
router.get('/groups', async (req: Request, res: Response) => {
  try {
    const groups = await GroupService.getAllGroupsWithMemberCounts()
    
    res.json({
      success: true,
      data: groups
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch groups' }
    })
  }
})

// Get group details by ID
router.get('/groups/:id', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id)
    const group = await GroupService.getGroupById(groupId)
    
    if (!group) {
      return res.status(404).json({
        success: false,
        error: { message: 'Group not found' }
      })
    }
    
    const members = await GroupService.getGroupMembers(groupId)
    
    res.json({
      success: true,
      data: {
        group,
        members
      }
    })
  } catch (error) {
    console.error('Error fetching group:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch group' }
    })
  }
})

// Add a user to a group (admin)
router.post('/groups/:id/members', [
  body('user_id').isInt({ min: 1 }).withMessage('user_id is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const groupId = parseInt(req.params.id)
    const { user_id } = req.body
    const result = await GroupService.addMemberToGroup(groupId, Number(user_id))
    if (!result.success) return res.status(400).json({ success: false, error: { message: result.message } })
    const members = await GroupService.getGroupMembers(groupId)
    res.json({ success: true, message: result.message, data: { members } })
  } catch (error) {
    console.error('Error adding member to group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to add member' } })
  }
})

// Remove a user from a group (admin)
router.delete('/groups/:id/members/:userId', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id)
    const userId = parseInt(req.params.userId)
    const result = await GroupService.removeMemberFromGroup(groupId, userId)
    if (!result.success) return res.status(404).json({ success: false, error: { message: result.message } })
    const members = await GroupService.getGroupMembers(groupId)
    res.json({ success: true, message: result.message, data: { members } })
  } catch (error) {
    console.error('Error removing member from group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to remove member' } })
  }
})

// Toggle invitation acceptance status for a member
router.post('/groups/:id/members/:userId/toggle-invitation', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id)
    const userId = parseInt(req.params.userId)
    
    // Get current status
    const member = await getRow(`
      SELECT invitation_accepted_at 
      FROM group_members 
      WHERE group_id = ? AND user_id = ? AND status = 'active'
    `, [groupId, userId])
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Member not found' } 
      })
    }
    
    // Toggle: if accepted, set to NULL; if not accepted, set to current timestamp
    if (member.invitation_accepted_at) {
      await runQuery(`
        UPDATE group_members 
        SET invitation_accepted_at = NULL 
        WHERE group_id = ? AND user_id = ? AND status = 'active'
      `, [groupId, userId])
    } else {
      await runQuery(`
        UPDATE group_members 
        SET invitation_accepted_at = CURRENT_TIMESTAMP 
        WHERE group_id = ? AND user_id = ? AND status = 'active'
      `, [groupId, userId])
    }
    
    // Return updated members list
    const members = await GroupService.getGroupMembers(groupId)
    res.json({ 
      success: true, 
      message: member.invitation_accepted_at ? 'Invitation acceptance removed' : 'Invitation marked as accepted',
      data: { members } 
    })
  } catch (error) {
    console.error('Error toggling invitation acceptance:', error)
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to toggle invitation acceptance' } 
    })
  }
})

// Toggle WhatsApp join status for a member
router.post('/groups/:id/members/:userId/toggle-whatsapp', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id)
    const userId = parseInt(req.params.userId)
    
    // Get current status
    const member = await getRow(`
      SELECT whatsapp_joined 
      FROM group_members 
      WHERE group_id = ? AND user_id = ? AND status = 'active'
    `, [groupId, userId])
    
    if (!member) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Member not found' } 
      })
    }
    
    // Toggle: if joined (1), set to 0; if not joined (0), set to 1
    const newStatus = member.whatsapp_joined ? 0 : 1
    await runQuery(`
      UPDATE group_members 
      SET whatsapp_joined = ? 
      WHERE group_id = ? AND user_id = ? AND status = 'active'
    `, [newStatus, groupId, userId])
    
    // Return updated members list
    const members = await GroupService.getGroupMembers(groupId)
    res.json({ 
      success: true, 
      message: member.whatsapp_joined ? 'WhatsApp join status removed' : 'WhatsApp marked as joined',
      data: { members } 
    })
  } catch (error) {
    console.error('Error toggling WhatsApp join status:', error)
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to toggle WhatsApp join status' } 
    })
  }
})

// Manually trigger cron jobs (for testing)
router.post('/cron/run', async (req: Request, res: Response) => {
  try {
    await CronService.runAllCronJobs()
    
    res.json({
      success: true,
      message: 'Cron jobs executed successfully'
    })
  } catch (error) {
    console.error('Error running cron jobs:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to run cron jobs' }
    })
  }
})

// Normalize all groups to quarterly anchors (Admin maintenance action)
router.post('/groups/normalize', async (req: Request, res: Response) => {
  try {
    const result = await GroupService.normalizeAllGroups()
    res.json({ success: true, message: 'Groups normalized', data: result })
  } catch (error) {
    console.error('Error normalizing groups:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to normalize groups' } })
  }
})

// Create a new group (admin action)
router.post('/groups', [
  body('start_date').isISO8601().withMessage('start_date must be YYYY-MM-DD'),
  body('max_members').optional().isInt({ min: 1 }).withMessage('max_members must be a positive integer'),
  body('status').optional().isIn(['upcoming','active','closed','completed']).withMessage('Invalid status'),
  body('name').optional().isString().isLength({ min: 3, max: 200 }).withMessage('name must be 3-200 chars'),
  body('whatsapp_invite_url').optional().isURL().withMessage('Invalid WhatsApp URL'),
  body('youversion_plan_url').optional().isURL().withMessage('Invalid YouVersion URL')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }

    const { start_date, max_members, status, name, whatsapp_invite_url, youversion_plan_url } = req.body
    const group = await GroupService.createGroupWithStart(start_date, max_members, status, name)
    if (group?.id && (whatsapp_invite_url || youversion_plan_url)) {
      await runQuery('UPDATE bible_groups SET whatsapp_invite_url = COALESCE(?, whatsapp_invite_url), youversion_plan_url = COALESCE(?, youversion_plan_url) WHERE id = ?', [whatsapp_invite_url || null, youversion_plan_url || null, (group as any).id || (group as any)?.data?.id])
    }
    res.status(201).json({ success: true, message: 'Group created', data: group })
  } catch (error) {
    console.error('Error creating group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to create group' } })
  }
})

// Backfill quarterly groups in sequence
router.post('/groups/backfill-quarterly', [
  body('start_date').isISO8601().withMessage('start_date must be YYYY-MM-DD'),
  body('count').isInt({ min: 1, max: 100 }).withMessage('count must be 1-100'),
  body('status').optional().isIn(['upcoming','active','closed','completed']).withMessage('Invalid status')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const { start_date, count, status } = req.body as { start_date: string; count: number; status?: any }
    const created: any[] = []
    let d = new Date(start_date)
    for (let i = 0; i < count; i++) {
      const iso = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().split('T')[0]
      const g = await GroupService.createGroupWithStart(iso, 50, status || 'completed')
      created.push(g)
      d.setUTCMonth(d.getUTCMonth() + 3)
    }
    // Refresh statuses based on today
    await GroupService.updateGroupStatuses()
    res.json({ success: true, message: 'Quarterly groups created', data: { count: created.length } })
  } catch (error) {
    console.error('Error backfilling quarterly groups:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to backfill groups' } })
  }
})

// Update a group (name, status, start_date, max_members)
router.put('/groups/:id', [
  body('name').optional().isString().isLength({ min: 3, max: 200 }).withMessage('name must be 3-200 chars'),
  body('status').optional().isIn(['upcoming','active','closed','completed']).withMessage('Invalid status'),
  body('start_date').optional().isISO8601().withMessage('start_date must be YYYY-MM-DD'),
  body('max_members').optional().isInt({ min: 1 }).withMessage('max_members must be a positive integer'),
  body('whatsapp_invite_url').optional().isURL(),
  body('youversion_plan_url').optional().isURL()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }

    const id = parseInt(req.params.id)
    const updated = await GroupService.updateGroup(id, req.body)
    if (!updated) {
      return res.status(404).json({ success: false, error: { message: 'Group not found' } })
    }
    // Apply link updates if provided (bypass alignment)
    const { whatsapp_invite_url, youversion_plan_url } = req.body
    if (whatsapp_invite_url !== undefined || youversion_plan_url !== undefined) {
      await runQuery('UPDATE bible_groups SET whatsapp_invite_url = COALESCE(?, whatsapp_invite_url), youversion_plan_url = COALESCE(?, youversion_plan_url) WHERE id = ?', [whatsapp_invite_url ?? null, youversion_plan_url ?? null, id])
    }
    const fresh = await GroupService.getGroupById(id)
    res.json({ success: true, message: 'Group updated', data: fresh })
  } catch (error) {
    console.error('Error updating group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to update group' } })
  }
})

// Update only status for a group (safe - no date/name changes)
router.post('/groups/:id/status', [
  body('status').isIn(['upcoming','active','closed','completed']).withMessage('Invalid status')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const id = parseInt(req.params.id)
    const group = await GroupService.getGroupById(id)
    if (!group) return res.status(404).json({ success: false, error: { message: 'Group not found' } })
    await runQuery('UPDATE bible_groups SET status = ?, created_at = created_at WHERE id = ?', [req.body.status, id])
    const updated = await GroupService.getGroupById(id)
    res.json({ success: true, message: 'Status updated', data: updated })
  } catch (error) {
    console.error('Error updating group status:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to update group status' } })
  }
})

// Set manual sort order for groups
router.post('/groups/sort-order', [
  body('order').isArray({ min: 1 }).withMessage('order must be a non-empty array'),
  body('order.*').isInt({ min: 1 }).withMessage('group ids must be integers')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const { order } = req.body as { order: number[] }
    await GroupService.setSortOrder(order)
    res.json({ success: true, message: 'Sort order saved' })
  } catch (error) {
    console.error('Error setting sort order:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to set sort order' } })
  }
})

// Get current active group
router.get('/groups/current/active', async (req: Request, res: Response) => {
  try {
    const currentGroup = await GroupService.getCurrentActiveGroup()
    
    res.json({
      success: true,
      data: currentGroup
    })
  } catch (error) {
    console.error('Error fetching current group:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch current group' }
    })
  }
})

// Get next upcoming group
router.get('/groups/next/upcoming', async (req: Request, res: Response) => {
  try {
    const nextGroup = await GroupService.getNextUpcomingGroup()
    
    res.json({
      success: true,
      data: nextGroup
    })
  } catch (error) {
    console.error('Error fetching next group:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch next group' }
    })
  }
})

// Get all users with their group memberships
router.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await getRows(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.status, u.city,
        u.mailing_address, u.referral,
        u.award_approved, u.avatar_url, u.trophies_count,
        u.created_at, u.updated_at,
        GROUP_CONCAT(bg.name) as group_names
      FROM users u
      LEFT JOIN group_members gm ON u.id = gm.user_id
      LEFT JOIN bible_groups bg ON gm.group_id = bg.id
      GROUP BY u.id
      ORDER BY u.name ASC
    `)

    res.json({
      success: true,
      data: users
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Create a new user (admin action)
router.post('/users', [
  body('name').isString().trim().isLength({ min: 2, max: 200 }).withMessage('Name must be 2-200 chars'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').optional().isString().trim().isLength({ max: 50 }),
  body('role').optional().isIn(['user','admin']).withMessage('Invalid role'),
  body('status').optional().isIn(['active','inactive']).withMessage('Invalid status'),
  body('award_approved').optional().isBoolean(),
  body('avatar_url').optional().isURL().withMessage('avatar_url must be a valid URL'),
  body('city').optional().isString().trim().isLength({ max: 200 }),
  body('mailing_address').optional().isString().trim().isLength({ max: 400 }),
  body('referral').optional().isString().trim().isLength({ max: 200 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }

    const { name, email, phone, role = 'user', status = 'active', award_approved = 0, avatar_url, city, mailing_address, referral } = req.body

    // Insert user (passwordless members; admins should set password separately)
    await runQuery(`
      INSERT INTO users (name, email, phone, role, status, award_approved, avatar_url, city, mailing_address, referral)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, email, phone || null, role, status, award_approved ? 1 : 0, avatar_url || null, city || null, mailing_address || null, referral || null])

    const user = await getRow('SELECT * FROM users WHERE email = ?', [email])
    res.status(201).json({ success: true, message: 'User created', data: user })
  } catch (error: any) {
    if (error && error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(409).json({ success: false, error: { message: 'Email already exists' } })
    }
    console.error('Error creating user:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to create user' } })
  }
})

// Update user fields (admin action)
router.put('/users/:id', [
  body('name').optional().isString().trim().isLength({ min: 2, max: 200 }),
  body('email').optional().isEmail(),
  body('phone').optional().isString().trim().isLength({ max: 50 }),
  body('role').optional().isIn(['user','admin']),
  body('status').optional().isIn(['active','inactive']),
  body('trophies_count').optional().isInt({ min: 0 }).withMessage('trophies_count must be >= 0'),
  body('city').optional().isString().trim().isLength({ max: 200 }),
  body('award_approved').optional().isBoolean(),
  body('avatar_url').optional().isURL(),
  body('mailing_address').optional().isString().trim().isLength({ max: 400 }),
  body('referral').optional().isString().trim().isLength({ max: 200 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const id = parseInt(req.params.id)
    const existing = await getRow('SELECT * FROM users WHERE id = ?', [id])
    if (!existing) return res.status(404).json({ success: false, error: { message: 'User not found' } })

    const allowed = ['name','email','phone','role','status','award_approved','avatar_url','city','mailing_address','referral','trophies_count'] as const
    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (key in req.body && req.body[key] !== undefined) {
        if (key === 'award_approved') {
          updates[key] = req.body[key] ? 1 : 0
        } else {
          updates[key] = req.body[key]
        }
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'No changes', data: existing })
    }
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ')
    const params = [...Object.values(updates), id]
    await runQuery(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params)
    const updated = await getRow('SELECT * FROM users WHERE id = ?', [id])
    res.json({ success: true, message: 'User updated', data: updated })
  } catch (error: any) {
    if (error && error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(409).json({ success: false, error: { message: 'Email already exists' } })
    }
    console.error('Error updating user:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to update user' } })
  }
})

// Adjust user trophies (increment, decrement, or set)
router.post('/users/:id/trophies', [
  body('op').isIn(['increment','decrement','set']).withMessage('Invalid operation'),
  body('value').optional().isInt({ min: 0 }).withMessage('value must be a non-negative integer')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const id = parseInt(req.params.id)
    const user = await getRow('SELECT id, trophies_count FROM users WHERE id = ?', [id])
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } })

    const { op, value } = req.body as { op: 'increment'|'decrement'|'set'; value?: number }
    let newCount = Number(user.trophies_count || 0)
    if (op === 'increment') newCount = newCount + 1
    else if (op === 'decrement') newCount = Math.max(0, newCount - 1)
    else if (op === 'set') newCount = Math.max(0, Number(value || 0))

    await runQuery('UPDATE users SET trophies_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newCount, id])
    const updated = await getRow('SELECT id, name, email, trophies_count FROM users WHERE id = ?', [id])
    res.json({ success: true, message: 'Trophies updated', data: updated })
  } catch (error) {
    console.error('Error adjusting trophies:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to update trophies' } })
  }
})

// Mark a member as completed for a specific group and increment trophies
router.post('/groups/:groupId/members/:userId/complete', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId)
    const userId = parseInt(req.params.userId)
    if (Number.isNaN(groupId) || Number.isNaN(userId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid ids' } })
    }
    const membership = await getRow('SELECT id, completed_at FROM group_members WHERE group_id = ? AND user_id = ? AND status = "active"', [groupId, userId])
    if (!membership) {
      return res.status(404).json({ success: false, error: { message: 'Membership not found' } })
    }
    const nowIso = new Date().toISOString()
    await runQuery('UPDATE group_members SET completed_at = ? WHERE id = ?', [nowIso, membership.id])
    await runQuery('UPDATE users SET trophies_count = COALESCE(trophies_count,0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [userId])
    const updated = await getRow('SELECT id, name, email, trophies_count FROM users WHERE id = ?', [userId])
    res.json({ success: true, message: 'Member marked completed and trophy awarded', data: updated })
  } catch (error) {
    console.error('Error marking completion:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to mark completion' } })
  }
})

// Enable/Disable user
router.post('/users/:id/status', [
  body('status').isIn(['active','inactive']).withMessage('Invalid status')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors.array() } })
    }
    const id = parseInt(req.params.id)
    const { status } = req.body
    const user = await getRow('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } })
    await runQuery('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id])
    res.json({ success: true, message: `User ${status === 'active' ? 'enabled' : 'disabled'}` })
  } catch (error) {
    console.error('Error updating user status:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to update user status' } })
  }
})

// Delete user (and related data)
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id)
    const user = await getRow('SELECT * FROM users WHERE id = ?', [id])
    if (!user) return res.status(404).json({ success: false, error: { message: 'User not found' } })

    // Remove related records
    await runQuery('DELETE FROM group_members WHERE user_id = ?', [id])
    await runQuery('DELETE FROM message_comments WHERE user_id = ?', [id])
    await runQuery('DELETE FROM user_messages WHERE user_id = ?', [id])
    await runQuery('DELETE FROM password_reset_tokens WHERE user_id = ?', [id])
    await runQuery('DELETE FROM users WHERE id = ?', [id])

    res.json({ success: true, message: 'User deleted' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to delete user' } })
  }
})

// Get reading progress for all users
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const progress = await getRows(`
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
    `)

    res.json({
      success: true,
      data: progress
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get milestone progress for all users
router.get('/milestone-progress', async (req: Request, res: Response) => {
  try {
    const milestoneProgress = await getRows(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        bg.name as group_name,
        bg.status as group_status,
        u.trophies_count,
        tar.id as trophy_request_id,
        tar.type as trophy_request_type,
        tar.status as trophy_request_status,
        tar.requested_at as trophy_requested_at,
        COUNT(mp.id) as milestones_tracked,
        SUM(CASE WHEN mp.completed = 1 THEN 1 ELSE 0 END) as milestones_completed,
        AVG(mp.percentage) as avg_percentage,
        MAX(mp.updated_at) as last_milestone_update
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN bible_groups bg ON gm.group_id = bg.id
      LEFT JOIN trophy_approval_requests tar ON u.id = tar.user_id AND tar.type = 'journey_completion'
      LEFT JOIN milestone_progress mp ON u.id = mp.user_id AND bg.id = mp.group_id
      WHERE bg.status = 'active'
      GROUP BY u.id, bg.id
      ORDER BY bg.start_date DESC, u.name ASC
    `)

    res.json({
      success: true,
      data: milestoneProgress
    })
  } catch (error) {
    console.error('Error fetching milestone progress:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get progress grouped by group with latest milestone for each member
router.get('/progress-by-group', async (req: Request, res: Response) => {
  try {
    // First, get all active/closed groups with their members
    const groups = await getRows(`
      SELECT DISTINCT
        bg.id as group_id,
        bg.name as group_name,
        bg.status as group_status,
        bg.start_date,
        bg.end_date
      FROM bible_groups bg
      JOIN group_members gm ON bg.id = gm.group_id
      WHERE bg.status IN ('active', 'closed')
        AND gm.status = 'active'
      ORDER BY bg.start_date DESC
    `)

    // For each group, get members with their latest milestone progress
    const groupsWithMembers = await Promise.all(groups.map(async (group: any) => {
      const members = await getRows(`
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.trophies_count,
          mp.milestone_id,
          mp.milestone_name,
          mp.day_number,
          mp.days_completed,
          mp.percentage,
          mp.grade,
          mp.completed,
          mp.updated_at as last_updated
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN milestone_progress mp ON u.id = mp.user_id AND gm.group_id = mp.group_id
        WHERE gm.group_id = ? AND gm.status = 'active'
          AND (mp.id IS NULL OR mp.id = (
            SELECT mp2.id 
            FROM milestone_progress mp2 
            WHERE mp2.user_id = u.id 
              AND mp2.group_id = gm.group_id 
            ORDER BY mp2.updated_at DESC 
            LIMIT 1
          ))
        ORDER BY u.name ASC
      `, [group.group_id])

      // Process members to get latest milestone
      const processedMembers = members.map((member: any) => {
        if (member.milestone_id) {
          return {
            user_id: member.user_id,
            user_name: member.user_name,
            user_email: member.user_email,
            trophies_count: member.trophies_count || 0,
            latest_milestone: {
              milestone_id: member.milestone_id,
              milestone_name: member.milestone_name,
              day_number: member.day_number,
              days_completed: member.days_completed,
              percentage: member.percentage,
              grade: member.grade,
              completed: member.completed === 1,
              updated_at: member.last_updated
            }
          }
        } else {
          return {
            user_id: member.user_id,
            user_name: member.user_name,
            user_email: member.user_email,
            trophies_count: member.trophies_count || 0,
            latest_milestone: null
          }
        }
      })

      return {
        group_id: group.group_id,
        group_name: group.group_name,
        group_status: group.group_status,
        start_date: group.start_date,
        end_date: group.end_date,
        members: processedMembers
      }
    }))

    res.json({
      success: true,
      data: groupsWithMembers
    })
  } catch (error) {
    console.error('Error fetching progress by group:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Send progress reminders to users with no milestone progress (October 2025 and newer groups only)
router.post('/send-progress-reminders', async (req: Request, res: Response) => {
  // Set a longer timeout for this endpoint (5 minutes)
  req.setTimeout(300000) // 5 minutes
  
  try {
    // Find all users in active/closed groups who have no milestone progress
    // Only include "Bible Bus October 2025 Travelers" and groups created after October 2025
    const usersWithoutProgress = await getRows(`
      SELECT DISTINCT
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        bg.id as group_id,
        bg.name as group_name,
        bg.start_date
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      JOIN bible_groups bg ON gm.group_id = bg.id
      LEFT JOIN milestone_progress mp ON u.id = mp.user_id AND bg.id = mp.group_id
      WHERE bg.status IN ('active', 'closed')
        AND gm.status = 'active'
        AND u.status = 'active'
        AND mp.id IS NULL
        AND (
          bg.name = 'Bible Bus October 2025 Travelers'
          OR bg.start_date >= '2025-10-01'
        )
      ORDER BY bg.start_date DESC, u.name ASC
    `)

    if (usersWithoutProgress.length === 0) {
      return res.json({
        success: true,
        message: 'All members in October 2025+ groups have progress recorded',
        data: { sent: 0, total: 0, groups: [] }
      })
    }

    const { sendProgressReminderEmail } = await import('../utils/emailService')
    let sentCount = 0
    let failedCount = 0

    // Send emails in batches of 5 to avoid timeout
    const batchSize = 5
    const batches = []
    for (let i = 0; i < usersWithoutProgress.length; i += batchSize) {
      batches.push(usersWithoutProgress.slice(i, i + batchSize))
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      // Send all emails in the current batch in parallel
      const batchPromises = batch.map(async (user: any) => {
        try {
          const emailSent = await sendProgressReminderEmail(
            user.user_email,
            user.user_name,
            user.group_name
          )
          if (emailSent) {
            sentCount++
            console.log(`Progress reminder sent to: ${user.user_email} (${user.group_name})`)
            return { success: true, email: user.user_email }
          } else {
            failedCount++
            return { success: false, email: user.user_email }
          }
        } catch (error) {
          failedCount++
          console.error(`Failed to send to ${user.user_email}:`, error)
          return { success: false, email: user.user_email, error }
        }
      })

      // Wait for all emails in this batch to complete
      await Promise.all(batchPromises)

      // Add a delay between batches (except after the last batch) to avoid overwhelming the service
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)) // 500ms delay between batches
      }
    }

    const groups = [...new Set(usersWithoutProgress.map((u: any) => u.group_name))]

    res.json({
      success: true,
      message: `Progress reminders sent to ${sentCount} member${sentCount !== 1 ? 's' : ''} in October 2025+ groups`,
      data: {
        sent: sentCount,
        failed: failedCount,
        total: usersWithoutProgress.length,
        groups: groups
      }
    })
  } catch (error) {
    console.error('Error sending progress reminders:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Create admin message/announcement
router.post('/messages', [
  body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
  body('type').isIn(['encouragement', 'milestone', 'announcement', 'reminder']).withMessage('Invalid message type'),
  body('target_group_id').optional().isInt().withMessage('Target group ID must be a valid integer')
], async (req: Request, res: Response) => {
  try {
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

    const { title, message, type, target_group_id } = req.body
    const adminUser = (req as any).user

    const result = await runQuery(
      'INSERT INTO admin_messages (title, message, type, target_group_id, created_by) VALUES (?, ?, ?, ?, ?)',
      [title, message, type, target_group_id, adminUser.id]
    )

    const newMessage = await getRow('SELECT * FROM admin_messages WHERE id = ?', [result.id])

    res.status(201).json({
      success: true,
      message: 'Admin message created successfully',
      data: newMessage
    })
  } catch (error) {
    console.error('Error creating message:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get all admin messages
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const messages = await getRows(`
      SELECT 
        am.id, am.title, am.message, am.type, am.created_at,
        bg.name as target_group_name,
        u.name as created_by_name
      FROM admin_messages am
      LEFT JOIN bible_groups bg ON am.target_group_id = bg.id
      LEFT JOIN users u ON am.created_by = u.id
      ORDER BY am.created_at DESC
    `)

    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get donation reports
router.get('/donations', async (req: Request, res: Response) => {
  try {
    const donations = await getRows(`
      SELECT 
        id, donor_name, donor_email, amount, type, anonymous, status, created_at
      FROM donations
      ORDER BY created_at DESC
    `)

    const totalAmount = donations.reduce((sum, donation) => sum + parseFloat(donation.amount), 0)
    const monthlyAmount = donations
      .filter(d => new Date(d.created_at).getMonth() === new Date().getMonth())
      .reduce((sum, donation) => sum + parseFloat(donation.amount), 0)

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
    })
  } catch (error) {
    console.error('Error fetching donations:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// ===== GROUP MESSAGE MANAGEMENT =====

// Create a new group message
router.post('/group-messages', [
  body('group_id').isInt().withMessage('Group ID must be a valid integer'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
  body('message_type').isIn(['encouragement', 'reminder', 'announcement', 'milestone']).withMessage('Invalid message type'),
  body('priority').isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
], async (req: Request, res: Response) => {
  try {
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

    const { group_id, title, content, message_type, priority } = req.body
    const adminUser = (req as any).user

    const message = await MessageService.createMessage({
      group_id,
      title,
      content,
      message_type,
      priority,
      created_by: adminUser.id
    })

    res.status(201).json({
      success: true,
      message: 'Group message created successfully',
      data: message
    })
  } catch (error) {
    console.error('Error creating group message:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create group message' }
    })
  }
})

// Get all group messages (admin view)
router.get('/group-messages', async (req: Request, res: Response) => {
  try {
    const messages = await MessageService.getAllMessages()
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching group messages:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch group messages' }
    })
  }
})

// Get all user messages (messages from members)
router.get('/user-messages', async (req: Request, res: Response) => {
  try {
    const messages = await getRows(`
      SELECT 
        um.id,
        um.title,
        um.content,
        um.message_type,
        um.status,
        um.visibility,
        um.created_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        bg.id as group_id,
        bg.name as group_name
      FROM user_messages um
      JOIN users u ON um.user_id = u.id
      LEFT JOIN bible_groups bg ON um.group_id = bg.id
      ORDER BY um.created_at DESC
    `)

    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching user messages:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Admin: delete a user-submitted message
router.delete('/user-messages/:id', async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id)
    await UserInteractionService.adminDeleteUserMessage(messageId)
    res.json({ success: true, message: 'User message deleted successfully' })
  } catch (error) {
    console.error('Error deleting user message (admin):', error)
    res.status(500).json({ success: false, error: { message: 'Failed to delete user message' } })
  }
})

// Get messages for a specific group
router.get('/group-messages/group/:groupId', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId)
    const messages = await MessageService.getMessagesByGroup(groupId)
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching group messages:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch group messages' }
    })
  }
})

// Update a group message
router.put('/group-messages/:id', [
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('content').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
  body('message_type').optional().isIn(['encouragement', 'reminder', 'announcement', 'milestone']).withMessage('Invalid message type'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
], async (req: Request, res: Response) => {
  try {
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

    const messageId = parseInt(req.params.id)
    const updates = req.body

    const success = await MessageService.updateMessage(messageId, updates)
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found' }
      })
    }

    const updatedMessage = await MessageService.getMessageById(messageId)
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: updatedMessage
    })
  } catch (error) {
    console.error('Error updating group message:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update group message' }
    })
  }
})

// Delete a group message
router.delete('/group-messages/:id', async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.id)
    const success = await MessageService.deleteMessage(messageId)
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found' }
      })
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting group message:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete group message' }
    })
  }
})

// Get message statistics for a group
router.get('/group-messages/stats/:groupId', async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.groupId)
    const stats = await MessageService.getGroupMessageStats(groupId)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching message stats:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch message statistics' }
    })
  }
})

// Get trophy approval requests
router.get('/trophy-requests', async (req: Request, res: Response) => {
  try {
    const requests = await getRows(`
      SELECT 
        tar.id,
        tar.user_id,
        u.name as user_name,
        u.email as user_email,
        tar.type,
        tar.description,
        tar.status,
        tar.requested_at,
        tar.approved_at,
        approver.name as approved_by_name
      FROM trophy_approval_requests tar
      JOIN users u ON tar.user_id = u.id
      LEFT JOIN users approver ON tar.approved_by = approver.id
      ORDER BY tar.requested_at DESC
    `)

    res.json({
      success: true,
      data: requests
    })
  } catch (error) {
    console.error('Error fetching trophy requests:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch trophy requests' }
    })
  }
})

// Approve or reject trophy request
router.post('/trophy-requests/:id/:action', async (req: Request, res: Response) => {
  try {
    const { id, action } = req.params
    const adminId = (req as any).user?.id

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid action. Must be approve or reject' }
      })
    }

    // Get the request
    const request = await getRow(
      'SELECT * FROM trophy_approval_requests WHERE id = ? AND status = "pending"',
      [id]
    )

    if (!request) {
      return res.status(404).json({
        success: false,
        error: { message: 'Request not found or already processed' }
      })
    }

    if (action === 'approve') {
      // Award the trophy
      await runQuery(
        'INSERT INTO user_trophies (user_id, type, description, awarded_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [request.user_id, request.type, request.description]
      )

      // Update user's trophy count (increment existing count by 1)
      // COALESCE handles cases where trophies_count is NULL, treating it as 0
      await runQuery(
        'UPDATE users SET trophies_count = COALESCE(trophies_count, 0) + 1 WHERE id = ?',
        [request.user_id]
      )
    }

    // Update request status
    await runQuery(
      'UPDATE trophy_approval_requests SET status = ?, approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?',
      [action === 'approve' ? 'approved' : 'rejected', adminId, id]
    )

    res.json({
      success: true,
      message: `Trophy request ${action}d successfully`
    })
  } catch (error) {
    console.error('Error processing trophy request:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process trophy request' }
    })
  }
})

// Bulk approve users with trophies for Awards page
router.post('/approve-users-with-trophies', async (req: Request, res: Response) => {
  try {
    // Find all active users with trophies_count > 0 and award_approved = 0
    const usersToApprove = await getRows(`
      SELECT id, name, email, trophies_count
      FROM users
      WHERE status = 'active' 
      AND COALESCE(trophies_count, 0) > 0
      AND COALESCE(award_approved, 0) = 0
    `)

    if (usersToApprove.length === 0) {
      return res.json({
        success: true,
        message: 'No users found to approve',
        data: { approved: 0, total: 0 }
      })
    }

    // Update all found users to award_approved = 1
    const userIds = usersToApprove.map((u: any) => u.id)
    const placeholders = userIds.map(() => '?').join(',')
    
    await runQuery(
      `UPDATE users SET award_approved = 1 WHERE id IN (${placeholders})`,
      userIds
    )

    res.json({
      success: true,
      message: `Approved ${usersToApprove.length} user(s) for Awards page`,
      data: {
        approved: usersToApprove.length,
        users: usersToApprove.map((u: any) => ({ id: u.id, name: u.name, trophies_count: u.trophies_count }))
      }
    })
  } catch (error) {
    console.error('Error bulk approving users:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get all pending registrations grouped by group identifier
router.get('/pending-registrations', async (req: Request, res: Response) => {
  try {
    // Optional search query parameter
    const searchQuery = req.query.search as string | undefined
    
    let query = `
      SELECT 
        id,
        name,
        email,
        phone,
        city,
        mailing_address,
        referral,
        pending_group_identifier,
        created_at,
        status
      FROM users
      WHERE pending_group_identifier IS NOT NULL
      AND (
        status = 'pending' 
        OR (status = 'active' AND id NOT IN (
          SELECT DISTINCT user_id FROM group_members WHERE status = 'active'
        ))
      )
    `
    const params: any[] = []
    
    // If search query provided, filter by name or email
    if (searchQuery && searchQuery.trim()) {
      query += ` AND (LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))`
      const searchTerm = `%${searchQuery.trim()}%`
      params.push(searchTerm, searchTerm)
    }
    
    query += ` ORDER BY pending_group_identifier, created_at DESC`
    
    const pendingUsers = await getRows(query, params)

    // Group by pending_group_identifier
    const grouped: { [key: string]: any[] } = {}
    pendingUsers.forEach((user: any) => {
      const groupId = user.pending_group_identifier
      if (!grouped[groupId]) {
        grouped[groupId] = []
      }
      grouped[groupId].push(user)
    })

    res.json({
      success: true,
      data: grouped,
      total: pendingUsers.length,
      searchQuery: searchQuery || null
    })
  } catch (error) {
    console.error('Error fetching pending registrations:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Approve pending registration and add to group
router.post('/pending-registrations/:userId/approve', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId)
    if (Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID' }
      })
    }

    // Get user with pending group identifier (allow both pending and active status)
    // This handles cases where user was activated from Users tab but not added to group
    const user = await getRow(`
      SELECT id, name, email, pending_group_identifier, status
      FROM users
      WHERE id = ? AND pending_group_identifier IS NOT NULL
    `, [userId])

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User with pending group identifier not found' }
      })
    }

    // Find the group by name (case-insensitive, trimmed, handle "The" prefix)
    const searchName = (user.pending_group_identifier || '').trim()
    console.log(`[Approve Pending] Looking for group: "${searchName}"`)
    
    // Try exact match first
    let group = await getRow(`
      SELECT id, name, max_members
      FROM bible_groups
      WHERE name = ?
    `, [searchName])

    // If not found, try case-insensitive match
    if (!group) {
      group = await getRow(`
        SELECT id, name, max_members
        FROM bible_groups
        WHERE LOWER(TRIM(name)) = LOWER(?)
      `, [searchName])
    }

    // If still not found, try with/without "The" prefix
    if (!group) {
      // Try adding "The" prefix if not present
      const withThe = searchName.startsWith('The ') ? searchName : `The ${searchName}`
      group = await getRow(`
        SELECT id, name, max_members
        FROM bible_groups
        WHERE LOWER(TRIM(name)) = LOWER(?)
      `, [withThe])
    }

    if (!group) {
      // Try removing "The" prefix if present
      const withoutThe = searchName.replace(/^The\s+/i, '').trim()
      if (withoutThe !== searchName) {
        group = await getRow(`
          SELECT id, name, max_members
          FROM bible_groups
          WHERE LOWER(TRIM(name)) = LOWER(?)
        `, [withoutThe])
      }
    }

    // If still not found, try LIKE match (for partial matches)
    if (!group) {
      group = await getRow(`
        SELECT id, name, max_members
        FROM bible_groups
        WHERE LOWER(TRIM(name)) LIKE LOWER(?)
      `, [`%${searchName.replace(/^The\s+/i, '')}%`])
    }

    // If still not found, list available groups for debugging
    if (!group) {
      const availableGroups = await getRows(`
        SELECT id, name, start_date, status
        FROM bible_groups
        ORDER BY start_date DESC
        LIMIT 10
      `)
      console.log(`[Approve Pending] Available groups:`, availableGroups)
      
      return res.status(404).json({
        success: false,
        error: { 
          message: `Group "${searchName}" not found. Available groups: ${availableGroups.map((g: any) => g.name).join(', ')}`
        }
      })
    }
    
    console.log(`[Approve Pending] Found group: ${group.name} (ID: ${group.id})`)

    // Check group capacity
    const memberCountRow = await getRow(`
      SELECT COUNT(*) as count 
      FROM group_members 
      WHERE group_id = ? AND status = 'active'
    `, [group.id])
    const memberCount = memberCountRow?.count || 0

    if (memberCount >= group.max_members) {
      return res.status(400).json({
        success: false,
        error: { message: `Group "${group.name}" is full (${memberCount}/${group.max_members} members)` }
      })
    }

    // Check if user is already in this group
    const existingMember = await getRow(`
      SELECT id 
      FROM group_members 
      WHERE group_id = ? AND user_id = ? AND status = 'active'
    `, [group.id, userId])

    if (existingMember) {
      // User is already in group, just update status and clear pending_group_identifier
      await runQuery(`
        UPDATE users 
        SET status = 'active', pending_group_identifier = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userId])

      return res.json({
        success: true,
        message: 'User activated. Already a member of this group.',
        data: {
          userId,
          groupId: group.id,
          groupName: group.name
        }
      })
    }

    // Update user status and clear pending_group_identifier
    await runQuery(`
      UPDATE users 
      SET status = 'active', pending_group_identifier = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId])

    // Add user to group
    const todayIso = new Date().toISOString().split('T')[0]
    await runQuery(`
      INSERT INTO group_members (group_id, user_id, join_date, status)
      VALUES (?, ?, ?, 'active')
    `, [group.id, userId, todayIso])

    res.json({
      success: true,
      message: `User approved and added to ${group.name}`,
      data: {
        userId,
        groupId: group.id,
        groupName: group.name
      }
    })
  } catch (error) {
    console.error('Error approving pending registration:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Get status/statistics for all groups and members
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get all active groups
    const groups = await getRows(`
      SELECT id, name, start_date, registration_deadline, status
      FROM bible_groups
      WHERE status IN ('active', 'upcoming')
      ORDER BY start_date DESC
    `)
    
    const statusData = []
    
    for (const group of groups) {
      // Get total members
      const totalMembers = await getRow(`
        SELECT COUNT(*) as count
        FROM group_members
        WHERE group_id = ? AND status = 'active'
      `, [group.id])
      
      // Get WhatsApp joined count
      const whatsappJoined = await getRow(`
        SELECT COUNT(*) as count
        FROM group_members
        WHERE group_id = ? AND status = 'active' AND COALESCE(whatsapp_joined, 0) = 1
      `, [group.id])
      
      // Get invitation accepted count
      const invitationAccepted = await getRow(`
        SELECT COUNT(*) as count
        FROM group_members
        WHERE group_id = ? AND status = 'active' AND invitation_accepted_at IS NOT NULL
      `, [group.id])
      
      // Get progress updated count (members with milestone progress)
      const progressUpdated = await getRow(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM milestone_progress
        WHERE group_id = ?
      `, [group.id])
      
      // Get members who completed journey
      const journeyCompleted = await getRow(`
        SELECT COUNT(*) as count
        FROM group_members
        WHERE group_id = ? AND status = 'active' AND completed_at IS NOT NULL
      `, [group.id])
      
      // Get recent activity (last 7 days)
      const recentWhatsApp = await getRow(`
        SELECT COUNT(*) as count
        FROM group_members
        WHERE group_id = ? AND status = 'active' 
          AND whatsapp_joined = 1
          AND join_date >= date('now', '-7 days')
      `, [group.id])
      
      const recentInvitation = await getRow(`
        SELECT COUNT(*) as count
        FROM group_members
        WHERE group_id = ? AND status = 'active' 
          AND invitation_accepted_at IS NOT NULL
          AND date(invitation_accepted_at) >= date('now', '-7 days')
      `, [group.id])
      
      const recentProgress = await getRow(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM milestone_progress
        WHERE group_id = ?
          AND date(updated_at) >= date('now', '-7 days')
      `, [group.id])
      
      statusData.push({
        group_id: group.id,
        group_name: group.name,
        start_date: group.start_date,
        registration_deadline: group.registration_deadline,
        status: group.status,
        total_members: totalMembers?.count || 0,
        whatsapp_joined: whatsappJoined?.count || 0,
        invitation_accepted: invitationAccepted?.count || 0,
        progress_updated: progressUpdated?.count || 0,
        journey_completed: journeyCompleted?.count || 0,
        recent_activity: {
          whatsapp_joined: recentWhatsApp?.count || 0,
          invitation_accepted: recentInvitation?.count || 0,
          progress_updated: recentProgress?.count || 0
        },
        percentages: {
          whatsapp: totalMembers?.count > 0 ? Math.round((whatsappJoined?.count || 0) / totalMembers.count * 100) : 0,
          invitation: totalMembers?.count > 0 ? Math.round((invitationAccepted?.count || 0) / totalMembers.count * 100) : 0,
          progress: totalMembers?.count > 0 ? Math.round((progressUpdated?.count || 0) / totalMembers.count * 100) : 0,
          completed: totalMembers?.count > 0 ? Math.round((journeyCompleted?.count || 0) / totalMembers.count * 100) : 0
        }
      })
    }
    
    // Overall statistics
    const overallStats = {
      total_groups: groups.length,
      total_members: statusData.reduce((sum, g) => sum + g.total_members, 0),
      total_whatsapp_joined: statusData.reduce((sum, g) => sum + g.whatsapp_joined, 0),
      total_invitation_accepted: statusData.reduce((sum, g) => sum + g.invitation_accepted, 0),
      total_progress_updated: statusData.reduce((sum, g) => sum + g.progress_updated, 0),
      total_journey_completed: statusData.reduce((sum, g) => sum + g.journey_completed, 0)
    }
    
    res.json({
      success: true,
      data: {
        overall: overallStats,
        groups: statusData
      }
    })
  } catch (error) {
    console.error('Error fetching status:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch status' }
    })
  }
})

// Backfill invitation_accepted_at for existing members
// Useful for marking existing members who have already accepted invitations
router.post('/backfill-invitation-accepted', async (req: Request, res: Response) => {
  try {
    const { groupId, markAll } = req.body
    
    let query = `
      UPDATE group_members 
      SET invitation_accepted_at = join_date 
      WHERE invitation_accepted_at IS NULL 
        AND status = 'active'
        AND join_date IS NOT NULL
    `
    const params: any[] = []
    
    if (groupId) {
      // Backfill for specific group
      query += ' AND group_id = ?'
      params.push(groupId)
    }
    
    if (!markAll) {
      // Only mark members who joined before today (default behavior)
      const today = new Date().toISOString().split('T')[0]
      query += ' AND join_date < ?'
      params.push(today)
    }
    // If markAll is true, mark all members regardless of join date
    
    const result = await runQuery(query, params)
    
    // Get count of updated members
    const countQuery = groupId 
      ? 'SELECT COUNT(*) as count FROM group_members WHERE invitation_accepted_at IS NOT NULL AND status = "active" AND group_id = ?'
      : 'SELECT COUNT(*) as count FROM group_members WHERE invitation_accepted_at IS NOT NULL AND status = "active"'
    const countParams = groupId ? [groupId] : []
    const countResult = await getRow(countQuery, countParams)
    
    res.json({
      success: true,
      message: `Backfilled invitation_accepted_at for members`,
      data: {
        updated: result.changes || 0,
        total_marked: countResult?.count || 0,
        group_id: groupId || 'all groups'
      }
    })
  } catch (error) {
    console.error('Error backfilling invitation_accepted_at:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to backfill invitation_accepted_at' }
    })
  }
})

export default router

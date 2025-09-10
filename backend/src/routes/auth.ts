import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { getRow, getRows, runQuery } from '../database/database'
import { sendPasswordResetEmail } from '../utils/emailService'
import { GroupService } from '../services/groupService'
import { MessageService } from '../services/messageService'
import { UserInteractionService } from '../services/userInteractionService'
import { userAuth } from '../middleware/userAuth'
import crypto from 'crypto'

const router = Router()

// Helper to convert trophy count to tier
const getTrophyTier = (count: number): 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' => {
  if (count >= 10) return 'diamond'
  if (count >= 7 && count <= 9) return 'platinum'
  if (count >= 4 && count <= 6) return 'gold'
  if (count >= 2 && count <= 3) return 'silver'
  return 'bronze'
}
// Public: list all members' trophy counts with tiers (only active users)
router.get('/public/trophies', async (req: Request, res: Response) => {
  try {
    const rows = await getRows(`
      SELECT id, name, COALESCE(trophies_count, 0) as trophies_count, COALESCE(award_approved, 0) as award_approved, avatar_url
      FROM users
      WHERE status = 'active' AND COALESCE(award_approved, 0) = 1
      ORDER BY trophies_count DESC, name ASC
    `)
    const data = rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      trophies_count: r.trophies_count,
      tier: getTrophyTier(Number(r.trophies_count)),
      avatar_url: r.avatar_url || null
    }))
    res.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching public trophies:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to load trophies' } })
  }
})

// Request trophy approval for journey completion
router.post('/request-trophy-approval', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const { type, description } = req.body

    if (type !== 'journey_completion') {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Invalid trophy type' } 
      })
    }

    // Check if user already has a pending request for this trophy type
    const existingRequest = await getRow(
      'SELECT id FROM trophy_approval_requests WHERE user_id = ? AND type = ? AND status = "pending"',
      [userId, type]
    )

    if (existingRequest) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Trophy approval request already pending' } 
      })
    }

    // Check if user already has this trophy type (to prevent duplicates)
    const existingTrophy = await getRow(
      'SELECT id FROM user_trophies WHERE user_id = ? AND type = ?',
      [userId, type]
    )

    if (existingTrophy) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Trophy already awarded' } 
      })
    }

    // Create trophy approval request
    await runQuery(
      'INSERT INTO trophy_approval_requests (user_id, type, description, status, requested_at) VALUES (?, ?, ?, "pending", CURRENT_TIMESTAMP)',
      [userId, type, description]
    )

    res.json({ 
      success: true, 
      message: 'Trophy approval request submitted successfully'
    })
  } catch (error) {
    console.error('Error requesting trophy approval:', error)
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to submit trophy approval request' } 
    })
  }
})

// Save milestone progress
router.post('/milestone-progress', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const { groupId, milestoneId, milestoneName, dayNumber, totalDays, missingDays, daysCompleted, percentage, grade, completed } = req.body

    // Get user's current group if groupId not provided
    let currentGroupId = groupId
    if (!currentGroupId) {
      const userGroup = await getRow(`
        SELECT gm.group_id 
        FROM group_members gm 
        JOIN bible_groups bg ON gm.group_id = bg.id 
        WHERE gm.user_id = ? AND bg.status = 'active' 
        ORDER BY bg.start_date DESC 
        LIMIT 1
      `, [userId])
      if (!userGroup) {
        return res.status(400).json({ success: false, error: { message: 'User not in any active group' } })
      }
      currentGroupId = userGroup.group_id
    }

    // Upsert milestone progress
    await runQuery(`
      INSERT OR REPLACE INTO milestone_progress 
      (user_id, group_id, milestone_id, milestone_name, day_number, total_days, missing_days, days_completed, percentage, grade, completed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [userId, currentGroupId, milestoneId, milestoneName, dayNumber, totalDays, missingDays, daysCompleted, percentage, grade, completed ? 1 : 0])

    res.json({ success: true, message: 'Milestone progress saved successfully' })
  } catch (error) {
    console.error('Error saving milestone progress:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to save milestone progress' } })
  }
})

// Get milestone progress for user
router.get('/milestone-progress', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const { groupId } = req.query

    let query = `
      SELECT * FROM milestone_progress 
      WHERE user_id = ?
    `
    const params = [userId]

    if (groupId) {
      query += ' AND group_id = ?'
      params.push(groupId)
    } else {
      // Get user's current active group
      const userGroup = await getRow(`
        SELECT gm.group_id 
        FROM group_members gm 
        JOIN bible_groups bg ON gm.group_id = bg.id 
        WHERE gm.user_id = ? AND bg.status = 'active' 
        ORDER BY bg.start_date DESC 
        LIMIT 1
      `, [userId])
      if (userGroup) {
        query += ' AND group_id = ?'
        params.push(userGroup.group_id)
      }
    }

    query += ' ORDER BY milestone_id ASC'

    const progress = await getRows(query, params)
    res.json({ success: true, data: progress })
  } catch (error) {
    console.error('Error fetching milestone progress:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to fetch milestone progress' } })
  }
})

// Get the authenticated user's completed groups (awards history)
router.get('/my-awards', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const rows = await getRows(
      `SELECT bg.id, bg.name, bg.start_date, bg.end_date, gm.completed_at
       FROM group_members gm
       JOIN bible_groups bg ON gm.group_id = bg.id
       WHERE gm.user_id = ? AND gm.completed_at IS NOT NULL
       ORDER BY gm.completed_at DESC`,
      [userId]
    )
    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('Error fetching my awards:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to fetch awards' } })
  }
})

// Register new user
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('phone').optional().isMobilePhone('any').withMessage('Must be a valid phone number')
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

    const { name, email, phone, city, mailing_address, referral } = req.body

    // Check if user already exists (case-insensitive)
    const existingUser = await getRow('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email])
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User with this email already exists'
        }
      })
    }

    // Create user (without password)
    const result = await runQuery(
      'INSERT INTO users (name, email, phone, city, mailing_address, referral) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, phone, city, mailing_address, referral]
    )

    // Attempt to assign user to current group, but do NOT delete on failure
    const groupAssignment = await GroupService.assignUserToGroup(result.id)

    // Get group details if assigned
    const group = groupAssignment.success && groupAssignment.groupId
      ? await GroupService.getGroupById(groupAssignment.groupId)
      : null
    
    res.status(201).json({
      success: true,
      message: groupAssignment.success ? 'User registered successfully and assigned to group' : 'User registered successfully. We will place you into a group soon.',
      data: {
        user: {
          id: result.id,
          name,
          email,
          phone,
          city,
          mailing_address,
          referral,
          trophies_count: 0
        },
        group: group ? {
          id: group?.id,
          name: group?.name,
          start_date: group?.start_date,
          registration_deadline: group?.registration_deadline
        } : null,
        message: groupAssignment.message
      }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Must be a valid email'),
  body('name').notEmpty().withMessage('Name is required')
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

    const { email, name } = req.body

    // Find user by email (case-insensitive)
    const user = await getRow(
      'SELECT id, name, email, phone, password_hash, status, role, trophies_count FROM users WHERE LOWER(email) = LOWER(?)',
      [email]
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password'
        }
      })
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is not active'
        }
      })
    }

    // Verify name matches (case-insensitive)
    if (user.name.toLowerCase() !== name.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or name'
        }
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          trophies_count: user.trophies_count || 0
        },
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Admin login
router.post('/admin/login', [
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { email, password } = req.body

    // Find admin user by email
    const user = await getRow(
      'SELECT id, name, email, password_hash, status, role FROM users WHERE email = ? AND role = ?',
      [email, 'admin']
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password'
        }
      })
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is not active'
        }
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password'
        }
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

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
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Change password (requires authentication)
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { currentPassword, newPassword } = req.body
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.'
        }
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
      const userId = decoded.userId

      // Get current user
      const user = await getRow(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
      )

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found'
          }
        })
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Current password is incorrect'
          }
        })
      }

      // Hash new password
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

      // Update password
      await runQuery(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newPasswordHash, userId]
      )

      res.json({
        success: true,
        message: 'Password changed successfully'
      })
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token'
        }
      })
    }
  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Reset password (no authentication required)
router.post('/reset-password', [
  body('email').isEmail().withMessage('Must be a valid email')
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

    const { email } = req.body

    // Check if user exists
    const user = await getRow('SELECT id, name FROM users WHERE email = ?', [email])
    if (!user) {
      // For security reasons, don't reveal if user exists or not
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      })
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store the reset token in the database
    await runQuery(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, resetToken, expiresAt.toISOString()]
    )

    // Send the password reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken, user.name)
    
    if (emailSent) {
      console.log(`✅ Password reset email sent successfully to: ${user.name} (${email})`)
      res.json({
        success: true,
        message: 'Password reset email sent! Check your inbox.'
      })
    } else {
      // If email fails, remove the token
      await runQuery('DELETE FROM password_reset_tokens WHERE token = ?', [resetToken])
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send password reset email. Please try again.'
        }
      })
    }
  } catch (error) {
    console.error('Password reset error:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// Reset password with token
router.post('/reset-password-confirm', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
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

    const { token, newPassword } = req.body

    // Find the reset token
    const resetToken = await getRow(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > datetime("now")',
      [token]
    )

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired reset token. Please request a new password reset.'
        }
      })
    }

    // Hash the new password
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update the user's password
    await runQuery(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, resetToken.user_id]
    )

    // Mark the token as used
    await runQuery(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = ?',
      [resetToken.id]
    )

    res.json({
      success: true,
      message: 'Password reset successfully! You can now log in with your new password.'
    })
  } catch (error) {
    console.error('❌ Password reset confirmation error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error'
      }
    })
  }
})

// ===== USER GROUP MESSAGES =====
// Get user's current group basic info with links
router.get('/my-group', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const group = await getRow(`
      SELECT bg.id, bg.name, bg.start_date, bg.status, bg.whatsapp_invite_url, bg.youversion_plan_url
      FROM group_members gm
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId])
    res.json({ success: true, data: group || null })
  } catch (error) {
    console.error('Error fetching my group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to fetch group' } })
  }
})

// Get messages for user's current group
router.get('/my-group-messages', userAuth, async (req: Request, res: Response) => {
  try {
    // Get user's group from the request (this would be set by middleware)
    const userId = (req as any).user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' }
      })
    }

    // Get user's current group
    const userGroup = await getRow(`
      SELECT gm.group_id, bg.name as group_name
      FROM group_members gm
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId])

    if (!userGroup) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not assigned to any active group' }
      })
    }

    // Get messages for the user's group
    const messages = await MessageService.getMessagesByGroup(userGroup.group_id, 50)
    
    res.json({
      success: true,
      data: {
        group: {
          id: userGroup.group_id,
          name: userGroup.group_name
        },
        messages
      }
    })
  } catch (error) {
    console.error('Error fetching user group messages:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch group messages' }
    })
  }
})

// Get messages by type for user's group
router.get('/my-group-messages/:type', userAuth, async (req: Request, res: Response) => {
  try {
    const messageType = req.params.type
    const userId = (req as any).user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' }
      })
    }

    // Get user's current group
    const userGroup = await getRow(`
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId])

    if (!userGroup) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not assigned to any active group' }
      })
    }

    // Get messages by type for the user's group
    const messages = await MessageService.getMessagesByType(userGroup.group_id, messageType, 20)
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching user group messages by type:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch group messages' }
    })
  }
})

// ===== USER INTERACTIONS =====

// Get all messages (admin + user) for user's group with comments
router.get('/my-group-all-messages', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' }
      })
    }

    // Get user's current group
    const userGroup = await getRow(`
      SELECT gm.group_id, bg.name as group_name
      FROM group_members gm
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId])

    if (!userGroup) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not assigned to any active group' }
      })
    }

    // Get all messages (admin + user) with comments
    let messages = await UserInteractionService.getAllGroupMessages(userGroup.group_id)
    // Filter visibility: if message has visibility = 'new_user', only show to users with no prior memberships
    const prior = await getRow(`
      SELECT COUNT(*) as c FROM group_members gm
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.user_id = ? AND bg.start_date < (
        SELECT start_date FROM bible_groups WHERE id = ?
      )
    `, [userId, userGroup.group_id])
    const isNewUser = !prior || Number(prior.c) === 0
    messages = messages.filter((m: any) => !m.visibility || m.visibility !== 'new_user' || isNewUser)
    
    res.json({
      success: true,
      data: {
        group: {
          id: userGroup.group_id,
          name: userGroup.group_name
        },
        messages
      }
    })
  } catch (error) {
    console.error('Error fetching all group messages:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch group messages' }
    })
  }
})

// Add a comment to a message
router.post('/add-comment', userAuth, [
  body('messageId').isInt().withMessage('Message ID must be a number'),
  body('content').trim().isLength({ min: 1, max: 500 }).withMessage('Comment must be between 1 and 500 characters')
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

    const userId = (req as any).user?.id
    const { messageId, content } = req.body

    // Add the comment
    const result = await UserInteractionService.addComment(messageId, userId, content)
    
    res.json({
      success: true,
      message: 'Comment added successfully',
      data: { commentId: result.id }
    })
  } catch (error) {
    console.error('Error adding comment:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add comment' }
    })
  }
})

// Create a new user message
router.post('/create-message', userAuth, [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Content must be between 1 and 1000 characters')
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

    const userId = (req as any).user?.id
    const { content } = req.body

    // Get user's current group
    const userGroup = await getRow(`
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId])

    if (!userGroup) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not assigned to any active group' }
      })
    }

    // Create the message
    const result = await UserInteractionService.createUserMessage(
      userGroup.group_id,
      userId,
      null,
      content,
      'encouragement'
    )
    
    res.json({
      success: true,
      message: 'Message created successfully',
      data: { messageId: result.id }
    })
  } catch (error) {
    console.error('Error creating user message:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create message' }
    })
  }
})

// Get user's own messages
router.get('/my-messages', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id

    // Get user's current group
    const userGroup = await getRow(`
      SELECT gm.group_id
      FROM group_members gm
      WHERE gm.user_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date DESC
      LIMIT 1
    `, [userId])

    if (!userGroup) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not assigned to any active group' }
      })
    }

    // Get user's own messages
    const messages = await UserInteractionService.getUserOwnMessages(userId, userGroup.group_id)
    
    res.json({
      success: true,
      data: messages
    })
  } catch (error) {
    console.error('Error fetching user messages:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch user messages' }
    })
  }
})

// Delete user's own message
router.delete('/my-messages/:messageId', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const messageId = parseInt(req.params.messageId)

    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid message ID' }
      })
    }

    // Delete the message
    const result = await UserInteractionService.deleteUserMessage(messageId, userId)
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Message not found or not authorized to delete' }
      })
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user message:', error)
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete message' }
    })
  }
})

// ===== NEXT GROUP JOIN FLOW =====

// Get the next upcoming group and the user's join status
router.get('/next-group', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const group = await GroupService.getNextUpcomingGroup()
    if (!group) {
      return res.json({ success: true, data: null })
    }

    // Capacity
    const memberCountRow = await getRow(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = "active"',
      [group.id]
    )
    const member_count = memberCountRow?.count || 0

    // Already joined?
    const existing = await getRow(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = "active"',
      [group.id, userId]
    )

    const today = new Date().toISOString().split('T')[0]
    const canJoin = group.status === 'upcoming' && group.registration_deadline >= today && member_count < group.max_members

    res.json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        start_date: group.start_date,
        registration_deadline: group.registration_deadline,
        max_members: group.max_members,
        member_count,
        alreadyJoined: !!existing,
        canJoin
      }
    })
  } catch (error) {
    console.error('Error fetching next group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to fetch next group' } })
  }
})

// Join the specified upcoming group
router.post('/groups/:id/join', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const groupId = parseInt(req.params.id)
    if (Number.isNaN(groupId)) return res.status(400).json({ success: false, error: { message: 'Invalid group id' } })

    const group = await GroupService.getGroupById(groupId)
    if (!group) return res.status(404).json({ success: false, error: { message: 'Group not found' } })

    const today = new Date().toISOString().split('T')[0]
    if (!(group.status === 'upcoming' && group.registration_deadline >= today)) {
      return res.status(400).json({ success: false, error: { message: 'Registration is closed for this group' } })
    }

    // Capacity check
    const memberCountRow = await getRow('SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = "active"', [groupId])
    const member_count = memberCountRow?.count || 0
    if (member_count >= group.max_members) {
      return res.status(400).json({ success: false, error: { message: 'Group is full' } })
    }

    // Duplicate check
    const existing = await getRow('SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = "active"', [groupId, userId])
    if (existing) {
      return res.json({ success: true, message: 'Already joined', data: { group_id: groupId } })
    }

    const todayIso = new Date().toISOString().split('T')[0]
    await runQuery(
      'INSERT INTO group_members (group_id, user_id, join_date, status) VALUES (?, ?, ?, "active")',
      [groupId, userId, todayIso]
    )

    res.json({ success: true, message: 'Joined next group', data: { group_id: groupId } })
  } catch (error) {
    console.error('Error joining group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to join group' } })
  }
})

// Cancel joining the specified upcoming group
router.post('/groups/:id/cancel', userAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id
    const groupId = parseInt(req.params.id)
    if (Number.isNaN(groupId)) return res.status(400).json({ success: false, error: { message: 'Invalid group id' } })

    // Only allow cancel for upcoming groups (safety)
    const group = await GroupService.getGroupById(groupId)
    if (!group) return res.status(404).json({ success: false, error: { message: 'Group not found' } })
    if (group.status !== 'upcoming') {
      return res.status(400).json({ success: false, error: { message: 'Cannot cancel for non-upcoming group' } })
    }

    await runQuery('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId])
    res.json({ success: true, message: 'Cancelled for next group', data: { group_id: groupId } })
  } catch (error) {
    console.error('Error cancelling next group:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to cancel next group' } })
  }
})

// Create donation with payment intent (public endpoint)
router.post('/donations', [
  body('donor_name').trim().isLength({ min: 2 }).withMessage('Donor name must be at least 2 characters'),
  body('donor_email').isEmail().withMessage('Must be a valid email'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least $1'),
  body('type').optional().isIn(['one-time', 'monthly']).withMessage('Type must be one-time or monthly'),
  body('anonymous').optional().isBoolean().withMessage('Anonymous must be boolean')
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

    const { donor_name, donor_email, amount, type = 'one-time', anonymous = false } = req.body

    // Create donation record first
    const result = await runQuery(
      'INSERT INTO donations (donor_name, donor_email, amount, type, anonymous, status) VALUES (?, ?, ?, ?, ?, ?)',
      [donor_name, donor_email, amount, type, anonymous ? 1 : 0, 'pending']
    )

    const donation = await getRow('SELECT * FROM donations WHERE id = ?', [result.id])

    // Create Stripe payment intent
    const { StripeService } = await import('../services/stripeService')
    const paymentResult = await StripeService.createPaymentIntent(
      amount,
      donor_email,
      donor_name,
      type
    )

    if (!paymentResult.success) {
      return res.status(500).json({
        success: false,
        error: {
          message: paymentResult.error || 'Failed to create payment intent'
        }
      })
    }

    res.status(201).json({
      success: true,
      message: 'Donation and payment intent created successfully',
      data: {
        donation,
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntentId
      }
    })
  } catch (error) {
    console.error('Error creating donation:', error)
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create donation'
      }
    })
  }
})

// Stripe webhook endpoint
router.post('/stripe-webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string
    const body = JSON.stringify(req.body)

    const { StripeService } = await import('../services/stripeService')
    const result = await StripeService.handleWebhook(body, signature)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { message: result.error }
      })
    }

    if (result.eventType === 'payment_intent.succeeded' && result.paymentIntentId) {
      // Update donation status to completed
      await runQuery(
        'UPDATE donations SET status = ? WHERE donor_email = ? AND status = ?',
        ['completed', result.metadata?.donor_email, 'pending']
      )

      // Send donation confirmation email
      if (result.metadata?.donor_email && result.metadata?.donor_name) {
        const { sendDonationConfirmationEmail } = await import('../utils/emailService')
        const amount = result.metadata?.amount ? parseFloat(result.metadata.amount) : 0
        const donationType = result.metadata?.donation_type || 'one-time'
        
        try {
          await sendDonationConfirmationEmail(
            result.metadata.donor_email,
            result.metadata.donor_name,
            amount,
            donationType
          )
          console.log('Donation confirmation email sent successfully')
        } catch (emailError) {
          console.error('Error sending donation confirmation email:', emailError)
          // Don't fail the webhook if email fails
        }
      }
    }

    res.json({ success: true, received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(400).json({
      success: false,
      error: { message: 'Webhook error' }
    })
  }
})

export default router

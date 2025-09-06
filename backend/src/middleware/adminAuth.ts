import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getRow } from '../database/database'

interface AuthRequest extends Request {
  user?: {
    id: number
    email: string
    role: string
  }
}

export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access denied. No token provided.'
        }
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    
    // Get user from database to check role
    const user = await getRow(
      'SELECT id, email, role FROM users WHERE id = ?',
      [decoded.userId]
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token. User not found.'
        }
      })
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin privileges required.'
        }
      })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token.'
      }
    })
  }
}

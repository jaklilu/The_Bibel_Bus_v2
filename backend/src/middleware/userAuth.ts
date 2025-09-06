import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getRow } from '../database/database'

interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    email: string
    name: string
    role: string
  }
}

export const userAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Access denied. No token provided.' }
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
      
      // Get user from database to ensure they still exist and are active
      const user = await getRow(
        'SELECT id, name, email, role, status FROM users WHERE id = ?',
        [decoded.userId]
      )

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'User not found' }
        })
      }

      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: { message: 'Account is not active' }
        })
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }

      next()
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token' }
      })
    }
  } catch (error) {
    console.error('User auth middleware error:', error)
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    })
  }
}

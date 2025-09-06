import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'
import userRoutes from './routes/users'
import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import { CronService } from './services/cronService'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5002

// Middleware
app.use(helmet())
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'The Bible Bus API'
  })
})

// Initialize automated group management
const initializeGroupManagement = async () => {
  try {
    console.log('🚀 Initializing automated group management...')
    
    // Run initial cron jobs
    await CronService.runAllCronJobs()
    
    // Set up periodic cron jobs (every 24 hours)
    setInterval(async () => {
      await CronService.runAllCronJobs()
    }, 24 * 60 * 60 * 1000) // 24 hours
    
    console.log('✅ Automated group management initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing group management:', error)
  }
}

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  console.log(`🚌 The Bible Bus API server running on port ${PORT}`)
  console.log(`📱 Frontend: http://localhost:3000`)
  console.log(`🔧 API: http://localhost:${PORT}/api`)
  
  // Initialize automated group management
  initializeGroupManagement()
})

export default app

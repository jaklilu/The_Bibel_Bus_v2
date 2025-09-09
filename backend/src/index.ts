import express from 'express'
import bcrypt from 'bcryptjs'
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
import { getRow, runQuery } from './database/database'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5002

// If running behind a proxy (Render), trust the first proxy for correct IPs, HTTPS, etc.
app.set('trust proxy', 1)

// ---- CORS (works locally + prod) ----
const defaultLocalOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
]

// Use ALLOWED_ORIGINS in prod, fallback to localhost in dev
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.trim().length > 0
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : defaultLocalOrigins
).filter(Boolean)

// Optional support for suffix-based allow list (e.g., Netlify preview domains)
// Example: ALLOWED_ORIGIN_SUFFIXES=stalwart-sunflower-596007.netlify.app
const allowedOriginSuffixes = (
  process.env.ALLOWED_ORIGIN_SUFFIXES && process.env.ALLOWED_ORIGIN_SUFFIXES.trim().length > 0
    ? process.env.ALLOWED_ORIGIN_SUFFIXES.split(',').map(s => s.trim())
    : []
).filter(Boolean)

app.use(helmet())

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // allow server-to-server, curl, Postman (no Origin header)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    if (allowedOriginSuffixes.some(suffix => origin.endsWith(suffix))) return cb(null, true)
    // Do not throw; return false so request is simply not CORS-enabled
    return cb(null, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

// Logging & parsers
app.use(morgan('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ---- Health checks (define BEFORE other routes) ----
app.all('/health', (_req, res) => {
  res.type('text/plain').send('OK')
})
app.all('/api/health', (_req, res) => {
  res.json({ status: 'OK', service: 'The Bible Bus API', timestamp: new Date().toISOString() })
})

// Quick diagnostics: verify /api prefix routing in Render/Netlify
app.all('/ping', (_req, res) => {
  res.type('text/plain').send('pong')
})
app.all('/api/ping', (_req, res) => {
  res.type('text/plain').send('api-pong')
})

// ---- Routes ----
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)

// Simple root response to confirm service is running when visiting base URL
app.get('/', (_req, res) => {
  res.type('text/plain').send('API is running')
})

// ---- Automated group management ----
const initializeGroupManagement = async () => {
  try {
    console.log('🚀 Initializing automated group management...')
    await CronService.runAllCronJobs()
    setInterval(async () => {
      await CronService.runAllCronJobs()
    }, 24 * 60 * 60 * 1000) // every 24 hours
    console.log('✅ Automated group management initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing group management:', error)
  }
}

// ---- Error handling (after routes) ----
app.use(notFound)
app.use(errorHandler)

// ---- Start server ----
app.listen(PORT, () => {
  console.log(`🚌 The Bible Bus API server running on port ${PORT}`)
  console.log(`📱 Frontend (local): http://localhost:3000`)
  console.log(`🔧 API: http://localhost:${PORT}/api`)
  initializeGroupManagement()
  ensureDefaultAdmin()
})

export default app

// Ensure a default admin account exists (use env or safe defaults)
async function ensureDefaultAdmin(): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'JayTheBibleBus@gmail.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const existing = await getRow('SELECT id FROM users WHERE email = ? AND role = ? LIMIT 1', [adminEmail, 'admin'])
    if (existing?.id) {
      console.log('👮 Admin user already present')
      return
    }
    const hash = await bcrypt.hash(adminPassword, 12)
    await runQuery(
      'INSERT INTO users (name, email, password_hash, role, status, award_approved) VALUES (?, ?, ?, ?, ?, ?)',
      ['Bible Bus Admin', adminEmail, hash, 'admin', 'active', 0]
    )
    console.log(`✅ Default admin created (${adminEmail})`)
  } catch (e) {
    console.error('❌ Failed to ensure default admin:', e)
  }
}

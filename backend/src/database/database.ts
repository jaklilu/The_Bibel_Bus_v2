import sqlite3 from 'sqlite3'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Resolve database path (supports persistent storage via DB_PATH)
// If DB_PATH is absolute, use it as-is; if relative, resolve from process.cwd().
const resolveDbPath = (): string => {
  const configured = process.env.DB_PATH?.trim()
  if (configured && configured.length > 0) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured)
  }
  return path.join(process.cwd(), 'data', 'biblebus.db')
}
const dbPath = resolveDbPath()

// Create database directory if it doesn't exist
import fs from 'fs'
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message)
  } else {
    console.log('✅ Connected to SQLite database')
    initializeTables()
  }
})

// Initialize database tables
const initializeTables = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      award_approved BOOLEAN DEFAULT 0,
      avatar_url TEXT,
      trophies_count INTEGER DEFAULT 0,
      city TEXT,
      mailing_address TEXT,
      referral TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Bible reading groups table
  db.run(`
    CREATE TABLE IF NOT EXISTS bible_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      max_members INTEGER DEFAULT 50,
      sort_index INTEGER DEFAULT NULL,
      whatsapp_invite_url TEXT,
      youversion_plan_url TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Group members table
  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      join_date TEXT NOT NULL,
      completed_at DATETIME DEFAULT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Reading progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      completed BOOLEAN DEFAULT 0,
      notes TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (group_id) REFERENCES bible_groups (id)
    )
  `)

  // Admin messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'encouragement',
      target_group_id INTEGER,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (target_group_id) REFERENCES bible_groups (id),
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `)

  // User trophies table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_trophies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Trophy approval requests table
  db.run(`
    CREATE TABLE IF NOT EXISTS trophy_approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      approved_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (approved_by) REFERENCES users (id)
    )
  `)

  // Milestone progress table
  db.run(`
    CREATE TABLE IF NOT EXISTS milestone_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      milestone_id INTEGER NOT NULL,
      milestone_name TEXT NOT NULL,
      day_number INTEGER NOT NULL,
      total_days INTEGER NOT NULL,
      missing_days INTEGER DEFAULT 0,
      days_completed INTEGER DEFAULT 0,
      percentage INTEGER DEFAULT 0,
      grade TEXT DEFAULT 'D',
      completed BOOLEAN DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (group_id) REFERENCES bible_groups (id),
      UNIQUE(user_id, group_id, milestone_id)
    )
  `)

  // Donations table
  db.run(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_name TEXT NOT NULL,
      donor_email TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      type TEXT DEFAULT 'one-time',
      anonymous BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Password reset tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Add the 'used' column if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE password_reset_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE
  `, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding used column:', err)
    }
  })

  // Add the 'sort_index' column to bible_groups if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE bible_groups ADD COLUMN sort_index INTEGER DEFAULT NULL
  `, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding sort_index column to bible_groups:', err)
    }
  })

  // Add optional link fields to bible_groups for invites/plans
  db.run(`
    ALTER TABLE bible_groups ADD COLUMN whatsapp_invite_url TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding whatsapp_invite_url to bible_groups:', err)
    }
  })
  db.run(`
    ALTER TABLE bible_groups ADD COLUMN youversion_plan_url TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding youversion_plan_url to bible_groups:', err)
    }
  })

  // Add the 'trophies_count' column to users if it doesn't exist (for existing databases)
  db.run(`
    ALTER TABLE users ADD COLUMN trophies_count INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding trophies_count column to users:', err)
    }
  })

  // Add award-related columns to users if they don't exist
  db.run(`
    ALTER TABLE users ADD COLUMN award_approved BOOLEAN DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding award_approved column to users:', err)
    }
  })
  db.run(`
    ALTER TABLE users ADD COLUMN avatar_url TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding avatar_url column to users:', err)
    }
  })

  // Group messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS group_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'encouragement',
      priority TEXT DEFAULT 'normal',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups (id),
      FOREIGN KEY (created_by) REFERENCES users (id)
    )
  `)

  // User comments table
  db.run(`
    CREATE TABLE IF NOT EXISTS message_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES group_messages (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // User-generated messages table
  db.run(`
    CREATE TABLE IF NOT EXISTS user_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'encouragement',
      visibility TEXT DEFAULT 'group',
      status TEXT DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `)

  // Add visibility column to user_messages if not exists
  db.run(`
    ALTER TABLE user_messages ADD COLUMN visibility TEXT DEFAULT 'group'
  `, (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Error adding visibility column to user_messages:', err)
    }
  })

  // Daily Reflections table (from YouVersion → n8n → Google Sheets)
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      reflection_text TEXT NOT NULL,
      status TEXT DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (group_id) REFERENCES bible_groups (id)
    )
  `)

  // Add completed_at to group_members if it doesn't exist
  db.run(`
    ALTER TABLE group_members ADD COLUMN completed_at DATETIME DEFAULT NULL
  `, (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Error adding completed_at column to group_members:', err)
    }
  })

  // Add whatsapp_joined tracking to group_members if not exists
  db.run(`
    ALTER TABLE group_members ADD COLUMN whatsapp_joined BOOLEAN DEFAULT 0
  `, (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Error adding whatsapp_joined column to group_members:', err)
    }
  })

  console.log('✅ Database tables initialized')
}

// Helper function to run queries with promises
export const runQuery = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err)
      } else {
        resolve({ id: this.lastID, changes: this.changes })
      }
    })
  })
}

// Helper function to get single row
export const getRow = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err)
      } else {
        resolve(row)
      }
    })
  })
}

// Helper function to get multiple rows
export const getRows = (sql: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

// Close database connection
export const closeDatabase = () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message)
    } else {
      console.log('✅ Database connection closed')
    }
  })
}

export default db

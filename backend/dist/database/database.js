"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getRows = exports.getRow = exports.runQuery = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const dbPath = path_1.default.join(process.cwd(), 'data', 'biblebus.db');
// Create database directory if it doesn't exist
const fs_1 = __importDefault(require("fs"));
const dbDir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dbDir)) {
    fs_1.default.mkdirSync(dbDir, { recursive: true });
}
// Create database connection
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    }
    else {
        console.log('✅ Connected to SQLite database');
        initializeTables();
    }
});
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
      city TEXT,
      mailing_address TEXT,
      referral TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Bible reading groups table
    db.run(`
    CREATE TABLE IF NOT EXISTS bible_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      max_members INTEGER DEFAULT 50,
      status TEXT DEFAULT 'upcoming',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    // Group members table
    db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      join_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
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
  `);
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
  `);
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
  `);
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
  `);
    // Add the 'used' column if it doesn't exist (for existing databases)
    db.run(`
    ALTER TABLE password_reset_tokens ADD COLUMN used BOOLEAN DEFAULT FALSE
  `, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Error adding used column:', err);
        }
    });
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
  `);
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
  `);
    // User-generated messages table
    db.run(`
    CREATE TABLE IF NOT EXISTS user_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'encouragement',
      status TEXT DEFAULT 'approved',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES bible_groups (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);
    console.log('✅ Database tables initialized');
};
// Helper function to run queries with promises
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            }
            else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};
exports.runQuery = runQuery;
// Helper function to get single row
const getRow = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(row);
            }
        });
    });
};
exports.getRow = getRow;
// Helper function to get multiple rows
const getRows = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
};
exports.getRows = getRows;
// Close database connection
const closeDatabase = () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        else {
            console.log('✅ Database connection closed');
        }
    });
};
exports.closeDatabase = closeDatabase;
exports.default = db;
//# sourceMappingURL=database.js.map
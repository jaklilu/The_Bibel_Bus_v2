"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const migrateDatabase = async () => {
    try {
        console.log('🔄 Starting database migration...');
        // Create users table
        await (0, database_1.runQuery)(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        city TEXT,
        mailing_address TEXT,
        referral TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create password reset tokens table
        await (0, database_1.runQuery)(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        // Create bible_groups table
        await (0, database_1.runQuery)(`
      CREATE TABLE IF NOT EXISTS bible_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        registration_deadline DATE NOT NULL,
        max_members INTEGER DEFAULT 50,
        status TEXT DEFAULT 'upcoming',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create group_members table
        await (0, database_1.runQuery)(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        join_date DATE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES bible_groups (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        // Create admin_messages table
        await (0, database_1.runQuery)(`
      CREATE TABLE IF NOT EXISTS admin_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        target_group_id INTEGER,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (target_group_id) REFERENCES bible_groups (id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
        // Create donations table
        await (0, database_1.runQuery)(`
      CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_name TEXT,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT NOT NULL,
        anonymous BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Database migration completed successfully!');
        console.log('📊 Tables created/verified:');
        console.log('   - users');
        console.log('   - password_reset_tokens');
        console.log('   - bible_groups');
        console.log('   - group_members');
        console.log('   - admin_messages');
        console.log('   - donations');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};
// Run migration if this file is executed directly
if (require.main === module) {
    migrateDatabase();
}
exports.default = migrateDatabase;
//# sourceMappingURL=migrate.js.map
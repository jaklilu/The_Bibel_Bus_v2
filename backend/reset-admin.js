const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

// Pre-hashed password for 'admin123' with bcrypt
const hashedPassword = '$2a$12$L3hNxYUxm2Xdm8ZaQph3T.r6Qt/IsrU2isnUc0jiRfTStoIqKLr06'

async function resetAdmin() {
  try {
    console.log('🔧 Resetting admin password...')
    
    const result = await new Promise((resolve, reject) => {
      db.run('UPDATE users SET password_hash = ? WHERE email = ? AND role = ?', 
        [hashedPassword, 'JayTheBibleBus@gmail.com', 'admin'], 
        function(err) {
          if (err) reject(err)
          else resolve(this)
        }
      )
    })
    
    if (result.changes > 0) {
      console.log('✅ Admin password reset successfully!')
      console.log('📧 Email: JayTheBibleBus@gmail.com')
      console.log('🔑 Password: admin123')
    } else {
      console.log('❌ No admin user found to update')
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error)
  } finally {
    db.close()
  }
}

resetAdmin()

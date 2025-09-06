const bcrypt = require('bcryptjs')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'backend', 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password...')
    
    // Hash the new password
    const hashedPassword = await new Promise((resolve, reject) => {
      bcrypt.hash('admin123', 12, (err, hash) => {
        if (err) reject(err)
        else resolve(hash)
      })
    })
    
    console.log('✅ Password hashed successfully')
    
    // Update the admin password
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

resetAdminPassword()

const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

async function deleteUser() {
  try {
    console.log('🗑️ Deleting user account: jaklilu@gmail.com...')
    
    // First check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', ['jaklilu@gmail.com'], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })

    if (!user) {
      console.log('❌ User not found - nothing to delete')
      return
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Role: ${user.role}`)
    
    // Delete the user
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE email = ?', ['jaklilu@gmail.com'], function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })

    if (result.changes > 0) {
      console.log('\n✅ User deleted successfully!')
      console.log(`   Rows affected: ${result.changes}`)
      console.log('\n🎯 Now you can:')
      console.log('   1. Go to /register')
      console.log('   2. Create a new account with jaklilu@gmail.com')
      console.log('   3. This will be a proper member account')
    } else {
      console.log('\n❌ Failed to delete user')
    }

    // Show remaining users
    console.log('\n📊 Remaining users in database:')
    const remainingUsers = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, email, role FROM users ORDER BY id', (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })

    remainingUsers.forEach(u => {
      console.log(`   ${u.id}. ${u.name} (${u.email}) - ${u.role}`)
    })

  } catch (error) {
    console.error('❌ Error deleting user:', error)
  } finally {
    db.close()
  }
}

deleteUser()

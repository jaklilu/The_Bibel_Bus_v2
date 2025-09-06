const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

async function forceDeleteUser() {
  try {
    console.log('🗑️ Force deleting user account: jaklilu@gmail.com...')
    
    // First check if user exists
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', ['jaklilu@gmail.com'], (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })

    if (!user) {
      console.log('✅ User not found - nothing to delete')
      return
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Role: ${user.role}`)
    
    // Also delete from group_members if exists
    console.log('\n🗑️ Deleting from group_members...')
    const memberResult = await new Promise((resolve, reject) => {
      db.run('DELETE FROM group_messages WHERE created_by = ?', [user.id], function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })
    console.log(`   Group messages deleted: ${memberResult.changes}`)
    
    // Delete from group_members
    const groupResult = await new Promise((resolve, reject) => {
      db.run('DELETE FROM group_members WHERE user_id = ?', [user.id], function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })
    console.log(`   Group memberships deleted: ${groupResult.changes}`)
    
    // Now delete the user
    console.log('\n🗑️ Deleting user...')
    const result = await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE email = ?', ['jaklilu@gmail.com'], function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })

    if (result.changes > 0) {
      console.log('\n✅ User deleted successfully!')
      console.log(`   Rows affected: ${result.changes}`)
      
      // Verify deletion
      const verifyUser = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', ['jaklilu@gmail.com'], (err, row) => {
          if (err) reject(err)
          else resolve(row)
        })
      })
      
      if (!verifyUser) {
        console.log('✅ Verification: User no longer exists in database')
      } else {
        console.log('❌ Verification failed: User still exists!')
      }
      
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

forceDeleteUser()

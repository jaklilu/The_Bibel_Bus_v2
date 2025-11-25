// Check root database
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '..', 'data', 'biblebus.db')
console.log('Checking database at:', dbPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err)
    process.exit(1)
  }
  console.log('Database opened successfully')
})

// List all groups
db.all('SELECT id, name, status, whatsapp_invite_url FROM bible_groups ORDER BY id DESC LIMIT 10', [], (err, groups) => {
  if (err) {
    console.error('Error:', err)
    db.close()
    process.exit(1)
  }
  
  console.log('\nGroups found:')
  groups.forEach(g => {
    console.log(`  ID: ${g.id}, Name: ${g.name}, Status: ${g.status}, WhatsApp: ${g.whatsapp_invite_url ? 'SET' : 'NOT SET'}`)
  })
  
  // Check January 2026 specifically
  db.get('SELECT * FROM bible_groups WHERE name LIKE "%January 2026%"', [], (err, group) => {
    if (err) {
      console.error('Error:', err)
      db.close()
      process.exit(1)
    }
    
    if (group) {
      console.log(`\n✅ Found January 2026 group: ID ${group.id}`)
      console.log(`   WhatsApp URL: ${group.whatsapp_invite_url || 'NOT SET'}`)
      
      // Check members
      db.all(`
        SELECT COUNT(*) as count FROM group_members 
        WHERE group_id = ? AND status = 'active'
      `, [group.id], (err, result) => {
        if (!err) {
          console.log(`   Active members: ${result[0].count}`)
        }
        db.close()
      })
    } else {
      console.log('\n❌ January 2026 group not found')
      db.close()
    }
  })
})


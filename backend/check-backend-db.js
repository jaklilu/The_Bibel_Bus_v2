// Check backend database
const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'biblebus.db')
console.log('Checking database at:', dbPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err)
    process.exit(1)
  }
  console.log('Database opened successfully')
})

// Find January 2026 group
db.get('SELECT * FROM bible_groups WHERE id = 14 OR name LIKE "%January 2026%"', [], (err, group) => {
  if (err) {
    console.error('Error:', err)
    db.close()
    process.exit(1)
  }
  
  if (!group) {
    console.log('❌ January 2026 group not found')
    db.close()
    process.exit(1)
  }
  
  console.log(`\n✅ Found group: ${group.name} (ID: ${group.id})`)
  console.log(`   Status: ${group.status}`)
  console.log(`   WhatsApp URL: ${group.whatsapp_invite_url || 'NOT SET'}`)
  
  // Check ALL members (not just active)
  db.all(`
    SELECT u.id, u.name, u.email, gm.status as membership_status
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
  `, [group.id], (err, members) => {
    if (err) {
      console.error('Error:', err)
      db.close()
      process.exit(1)
    }
    
    console.log(`\n👥 Total members in group_members table: ${members.length}`)
    const active = members.filter(m => m.membership_status === 'active')
    console.log(`   Active: ${active.length}`)
    console.log(`   Inactive: ${members.length - active.length}`)
    
    if (members.length > 0) {
      console.log('\nAll Members:')
      members.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} (${m.email}) - Status: ${m.membership_status}`)
      })
    }
    
    db.close()
  })
})


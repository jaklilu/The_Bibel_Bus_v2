// Check January 2026 group members
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
require('dotenv').config()

const dbPath = process.env.DB_PATH 
  ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(process.cwd(), process.env.DB_PATH))
  : path.join(process.cwd(), 'data', 'biblebus.db')

const db = new sqlite3.Database(dbPath)

// Find January 2026 group
db.get(`SELECT * FROM bible_groups WHERE id = 14 OR name LIKE '%January 2026%' OR name LIKE '%Jan 2026%'`, [], (err, group) => {
  if (err) {
    console.error('Error:', err)
    db.close()
    process.exit(1)
  }
  
  if (!group) {
    console.log('Group not found')
    db.close()
    process.exit(1)
  }
  
  console.log(`\n📋 Group: ${group.name} (ID: ${group.id})`)
  console.log(`   Status: ${group.status}`)
  console.log(`   WhatsApp URL: ${group.whatsapp_invite_url || 'NOT SET'}\n`)
  
  // Check all members (including inactive)
  db.all(`
    SELECT u.id, u.name, u.email, u.phone, gm.status as membership_status
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ?
  `, [group.id], (err, members) => {
    if (err) {
      console.error('Error:', err)
      db.close()
      process.exit(1)
    }
    
    console.log(`👥 Total members in group: ${members.length}`)
    const activeMembers = members.filter(m => m.membership_status === 'active')
    console.log(`   Active: ${activeMembers.length}`)
    console.log(`   Inactive: ${members.length - activeMembers.length}\n`)
    
    if (activeMembers.length > 0) {
      console.log('Active Members:')
      activeMembers.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} (${m.email})`)
      })
    }
    
    // Also check if there are members in other groups that might be January 2026
    console.log('\n🔍 Checking all recent groups for members...\n')
    db.all(`
      SELECT bg.id, bg.name, bg.status, COUNT(gm.id) as member_count
      FROM bible_groups bg
      LEFT JOIN group_members gm ON bg.id = gm.group_id AND gm.status = 'active'
      WHERE bg.start_date >= '2025-10-01'
      GROUP BY bg.id
      ORDER BY bg.start_date DESC
    `, [], (err, recentGroups) => {
      if (!err) {
        recentGroups.forEach(g => {
          console.log(`  ${g.name} (${g.status}): ${g.member_count} members`)
        })
      }
      db.close()
    })
  })
})


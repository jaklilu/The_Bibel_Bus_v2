// List all groups
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
require('dotenv').config()

const dbPath = process.env.DB_PATH 
  ? (path.isAbsolute(process.env.DB_PATH) ? process.env.DB_PATH : path.join(process.cwd(), process.env.DB_PATH))
  : path.join(process.cwd(), 'data', 'biblebus.db')

const db = new sqlite3.Database(dbPath)

db.all(`
  SELECT bg.id, bg.name, bg.start_date, bg.status, bg.whatsapp_invite_url,
         COUNT(gm.id) as member_count
  FROM bible_groups bg
  LEFT JOIN group_members gm ON bg.id = gm.group_id AND gm.status = 'active'
  GROUP BY bg.id
  ORDER BY bg.start_date DESC
`, [], (err, groups) => {
  if (err) {
    console.error('Error:', err)
    db.close()
    process.exit(1)
  }
  
  console.log('\n📋 All Groups:\n')
  groups.forEach(g => {
    console.log(`ID: ${g.id}`)
    console.log(`  Name: ${g.name}`)
    console.log(`  Start Date: ${g.start_date}`)
    console.log(`  Status: ${g.status}`)
    console.log(`  Members: ${g.member_count}`)
    console.log(`  WhatsApp URL: ${g.whatsapp_invite_url ? '✅ Set' : '❌ Not set'}`)
    console.log('')
  })
  
  db.close()
})


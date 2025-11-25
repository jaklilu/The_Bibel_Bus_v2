// Check admin users in database
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
require('dotenv').config()

// Try both database locations
const fs = require('fs')
const dbPath1 = path.join(__dirname, 'data', 'biblebus.db')
const dbPath2 = path.join(__dirname, '..', 'data', 'biblebus.db')

const dbPath = fs.existsSync(dbPath1) ? dbPath1 : (fs.existsSync(dbPath2) ? dbPath2 : dbPath1)
console.log('Checking database at:', dbPath)

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error:', err)
    process.exit(1)
  }
})

db.all('SELECT id, name, email, role FROM users WHERE role = ?', ['admin'], (err, admins) => {
  if (err) {
    console.error('Error:', err)
    db.close()
    process.exit(1)
  }
  
  console.log(`\n👮 Found ${admins.length} admin user(s):\n`)
  admins.forEach(admin => {
    console.log(`  Email: ${admin.email}`)
    console.log(`  Name: ${admin.name}`)
    console.log(`  ID: ${admin.id}`)
    console.log('')
  })
  
  db.close()
})


// Rename all bible_groups.name to match their start_date month/year
// Usage: node scripts/rename-groups-by-start.js

const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const dbPath = path.join(process.cwd(), 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

db.all('SELECT id, start_date FROM bible_groups ORDER BY id ASC', [], (err, rows) => {
  if (err) {
    console.error('Query failed:', err.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('No groups found')
    return db.close()
  }
  let remaining = rows.length
  let updated = 0
  rows.forEach(r => {
    const d = new Date(r.start_date + 'T00:00:00Z')
    if (isNaN(d.getTime())) {
      if (--remaining === 0) { console.log('Done. Updated:', updated); db.close() }
      return
    }
    const name = `Bible Bus ${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()} Travelers`
    db.run('UPDATE bible_groups SET name = ? WHERE id = ?', [name, r.id], (e) => {
      if (!e) updated += 1
      if (--remaining === 0) {
        console.log('Done. Updated:', updated)
        db.close()
      }
    })
  })
})



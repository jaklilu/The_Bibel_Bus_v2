const path = require('path')
const sqlite3 = require('sqlite3').verbose()

const dbPath = path.join(__dirname, '..', 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)
db.all('SELECT id, name, start_date, end_date, registration_deadline, status FROM bible_groups ORDER BY start_date ASC, id ASC', [], (err, rows) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  for (const r of rows) {
    console.log(`#${r.id} | ${r.name} | start=${r.start_date} | end=${r.end_date} | reg=${r.registration_deadline} | status=${r.status}`)
  }
  db.close()
})



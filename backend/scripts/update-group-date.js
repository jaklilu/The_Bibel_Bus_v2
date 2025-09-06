// Quick utility to update a group's start_date and recompute end_date and registration_deadline
// Usage: node scripts/update-group-date.js <groupId> <YYYY-MM-DD>

const path = require('path')
const sqlite3 = require('sqlite3').verbose()

function computeDerived(startISO) {
  const start = new Date(startISO)
  const end = new Date(start)
  end.setFullYear(end.getFullYear() + 1)
  end.setDate(end.getDate() - 1)
  const reg = new Date(start)
  reg.setDate(reg.getDate() + 17)
  return {
    end_date: end.toISOString().split('T')[0],
    registration_deadline: reg.toISOString().split('T')[0]
  }
}

function alignToQuarterStart(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const m = d.getMonth()
  let anchor = 0
  if (m <= 2) anchor = 0
  else if (m <= 5) anchor = 3
  else if (m <= 8) anchor = 6
  else anchor = 9
  const aligned = new Date(Date.UTC(d.getUTCFullYear(), anchor, 1))
  return aligned.toISOString().split('T')[0]
}

async function main() {
  const groupId = parseInt(process.argv[2], 10)
  const inputDate = process.argv[3]
  const mode = process.argv[4] || 'aligned' // 'aligned' | 'raw'
  if (!groupId || !inputDate) {
    console.error('Usage: node scripts/update-group-date.js <groupId> <YYYY-MM-DD> [aligned|raw]')
    process.exit(1)
  }

  const dbPath = path.join(__dirname, '..', 'data', 'biblebus.db')
  const db = new sqlite3.Database(dbPath)
  db.configure('busyTimeout', 5000)

  const aligned = mode === 'raw' ? inputDate : alignToQuarterStart(inputDate)
  const { end_date, registration_deadline } = computeDerived(aligned)

  db.serialize(() => {
    db.run(
      `UPDATE bible_groups 
       SET start_date = ?, end_date = ?, registration_deadline = ?
       WHERE id = ?`,
      [aligned, end_date, registration_deadline, groupId],
      function (err) {
        if (err) {
          console.error('Update failed:', err.message)
          db.close()
          process.exit(1)
        }
        db.get('SELECT id, name, start_date, end_date, registration_deadline FROM bible_groups WHERE id = ?', [groupId], (e, row) => {
          if (e) {
            console.error('Read-back failed:', e.message)
          } else {
            console.log('Updated group:', row)
          }
          db.close()
        })
      }
    )
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})



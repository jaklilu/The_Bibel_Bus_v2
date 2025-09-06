const sqlite3 = require('sqlite3').verbose()
const path = require('path')

// Database path
const dbPath = path.join(__dirname, 'data', 'biblebus.db')

// Create database connection
const db = new sqlite3.Database(dbPath)

async function updateGroupNames() {
  try {
    console.log('🔄 Updating group names to new format...')
    
    // Update existing groups to new naming format
    const updates = [
      {
        oldName: 'The Bible Bus January 2025',
        newName: 'Bible Bus January 2025 Travelers'
      },
      {
        oldName: 'The Bible Bus April 2025',
        newName: 'Bible Bus April 2025 Travelers'
      },
      {
        oldName: 'The Bible Bus July 2025',
        newName: 'Bible Bus July 2025 Travelers'
      },
      {
        oldName: 'The Bible Bus October 2025',
        newName: 'Bible Bus October 2025 Travelers'
      }
    ]
    
    for (const update of updates) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE bible_groups SET name = ? WHERE name = ?',
          [update.newName, update.oldName],
          function(err) {
            if (err) {
              console.error(`❌ Error updating ${update.oldName}:`, err)
              reject(err)
            } else {
              if (this.changes > 0) {
                console.log(`✅ Updated: ${update.oldName} → ${update.newName}`)
              } else {
                console.log(`ℹ️  No changes for: ${update.oldName}`)
              }
              resolve()
            }
          }
        )
      })
    }
    
    // Show current groups
    console.log('\n📊 Current groups in database:')
    await new Promise((resolve, reject) => {
      db.all('SELECT id, name, status, start_date FROM bible_groups ORDER BY start_date', (err, rows) => {
        if (err) {
          reject(err)
        } else {
          rows.forEach(row => {
            console.log(`  - ${row.name} (${row.status}) - Starts: ${row.start_date}`)
          })
          resolve()
        }
      })
    })
    
    console.log('\n🎉 Group names updated successfully!')
    
  } catch (error) {
    console.error('❌ Error updating group names:', error)
  } finally {
    db.close()
  }
}

// Run the update
updateGroupNames()

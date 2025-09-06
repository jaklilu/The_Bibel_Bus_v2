const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

async function removeDuplicateGroups() {
  try {
    console.log('🧹 Removing duplicate groups...')
    
    // Step 1: Find duplicates
    console.log('\n1️⃣ Finding duplicate groups...')
    const duplicates = await new Promise((resolve, reject) => {
      db.all(`
        SELECT name, COUNT(*) as count, GROUP_CONCAT(id) as ids
        FROM bible_groups 
        GROUP BY name 
        HAVING COUNT(*) > 1
        ORDER BY name
      `, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    if (duplicates.length === 0) {
      console.log('   ✅ No duplicate groups found')
      return
    }
    
    console.log(`   📊 Found ${duplicates.length} groups with duplicates:`)
    duplicates.forEach(dup => {
      console.log(`     ${dup.name}: ${dup.count} copies (IDs: ${dup.ids})`)
    })
    
    // Step 2: Remove duplicates (keep the first one)
    console.log('\n2️⃣ Removing duplicate groups...')
    
    for (const dup of duplicates) {
      const ids = dup.ids.split(',').map(id => parseInt(id.trim())).sort((a, b) => a - b)
      const keepId = ids[0] // Keep the first (lowest) ID
      const removeIds = ids.slice(1) // Remove the rest
      
      console.log(`\n   Processing: ${dup.name}`)
      console.log(`     Keeping ID: ${keepId}`)
      console.log(`     Removing IDs: ${removeIds.join(', ')}`)
      
      // Remove group memberships for duplicate groups
      for (const removeId of removeIds) {
        const memberResult = await new Promise((resolve, reject) => {
          db.run('DELETE FROM group_members WHERE group_id = ?', [removeId], function(err) {
            if (err) reject(err)
            else resolve(this)
          })
        })
        console.log(`       Removed ${memberResult.changes} group memberships from group ${removeId}`)
      }
      
      // Remove duplicate groups
      const groupResult = await new Promise((resolve, reject) => {
        db.run('DELETE FROM bible_groups WHERE id IN (?)', [removeIds.join(',')], function(err) {
          if (err) reject(err)
          else resolve(this)
        })
      })
      console.log(`       Removed ${groupResult.changes} duplicate groups`)
    }
    
    // Step 3: Final check
    console.log('\n3️⃣ Final group status...')
    const finalGroups = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM bible_groups ORDER BY start_date', (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    console.log(`   📊 Total groups: ${finalGroups.length}`)
    finalGroups.forEach(group => {
      const today = new Date().toISOString().split('T')[0]
      const regDeadline = new Date(group.registration_deadline)
      const isAcceptingReg = regDeadline >= new Date(today)
      
      console.log(`\n     ${group.name}`)
      console.log(`     ID: ${group.id}`)
      console.log(`     Status: ${group.status}`)
      console.log(`     Start: ${group.start_date}`)
      console.log(`     Registration Deadline: ${group.registration_deadline}`)
      console.log(`     Accepting Registrations: ${isAcceptingReg ? '✅ YES' : '❌ NO'}`)
    })
    
    console.log('\n🎉 Duplicate groups removed!')
    
  } catch (error) {
    console.error('❌ Error removing duplicate groups:', error)
  } finally {
    db.close()
  }
}

removeDuplicateGroups()

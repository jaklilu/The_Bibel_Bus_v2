const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'biblebus.db')
const db = new sqlite3.Database(dbPath)

async function fixGroupSchedule() {
  try {
    console.log('🔧 Fixing group schedule...')
    
    // Step 1: Remove incorrect groups
    console.log('\n1️⃣ Removing incorrect groups...')
    
    // Remove December 2025 and March 2026 groups
    const deleteResult = await new Promise((resolve, reject) => {
      db.run(`
        DELETE FROM bible_groups 
        WHERE name IN (
          'Bible Bus December 2025 Travelers',
          'Bible Bus March 2026 Travelers'
        )
      `, function(err) {
        if (err) reject(err)
        else resolve(this)
      })
    })
    
    console.log(`   ✅ Removed ${deleteResult.changes} incorrect groups`)
    
    // Step 2: Check what groups remain
    console.log('\n2️⃣ Checking remaining groups...')
    const remainingGroups = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM bible_groups ORDER BY start_date', (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
    
    console.log(`   📊 Total groups remaining: ${remainingGroups.length}`)
    remainingGroups.forEach(group => {
      console.log(`     ${group.name} - ${group.start_date} (${group.status})`)
    })
    
    // Step 3: Create proper quarterly groups
    console.log('\n3️⃣ Creating proper quarterly groups...')
    
    const quarterlyDates = [
      { month: 'January', year: 2026, startDate: '2026-01-01' },
      { month: 'April', year: 2026, startDate: '2026-04-01' },
      { month: 'July', year: 2026, startDate: '2026-07-01' }
    ]
    
    for (const quarter of quarterlyDates) {
      const startDate = new Date(quarter.startDate)
      const endDate = new Date(startDate)
      endDate.setFullYear(endDate.getFullYear() + 1)
      
      const registrationDeadline = new Date(startDate)
      registrationDeadline.setDate(registrationDeadline.getDate() + 17)
      
      const groupName = `Bible Bus ${quarter.month} ${quarter.year} Travelers`
      
      // Check if group already exists
      const existingGroup = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM bible_groups WHERE name = ?', [groupName], (err, row) => {
          if (err) reject(err)
          else resolve(row)
        })
      })
      
      if (existingGroup) {
        console.log(`   ✅ ${groupName} already exists`)
      } else {
        const result = await new Promise((resolve, reject) => {
          db.run(`
            INSERT INTO bible_groups (name, start_date, end_date, registration_deadline, max_members, status) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            groupName, 
            quarter.startDate, 
            endDate.toISOString().split('T')[0], 
            registrationDeadline.toISOString().split('T')[0], 
            50, 
            'upcoming'
          ], function(err) {
            if (err) reject(err)
            else resolve(this)
          })
        })
        
        console.log(`   ✅ Created ${groupName} (ID: ${result.lastID})`)
      }
    }
    
    // Step 4: Final check
    console.log('\n4️⃣ Final group status...')
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
    
    console.log('\n🎉 Group schedule fixed!')
    
  } catch (error) {
    console.error('❌ Error fixing group schedule:', error)
  } finally {
    db.close()
  }
}

fixGroupSchedule()

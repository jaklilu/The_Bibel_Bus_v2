// Script to send WhatsApp invitation emails to any group
// Usage: node send-whatsapp-invites-to-group.js <groupId>
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const nodemailer = require('nodemailer')
require('dotenv').config()

const groupId = process.argv[2] ? parseInt(process.argv[2]) : 14 // Default to January 2026

if (!groupId || isNaN(groupId)) {
  console.error('❌ Please provide a valid group ID')
  console.log('Usage: node send-whatsapp-invites-to-group.js <groupId>')
  process.exit(1)
}

// Use the exact same logic as the app
// The app resolves DB_PATH relative to process.cwd(), which is backend/ when server runs
// So ./data/biblebus.db becomes backend/data/biblebus.db
const fs = require('fs')
let dbPath

if (process.env.DB_PATH && process.env.DB_PATH.trim()) {
  const configured = process.env.DB_PATH.trim()
  dbPath = path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured)
} else {
  // Default: backend/data/biblebus.db (when running from backend/)
  dbPath = path.join(process.cwd(), 'data', 'biblebus.db')
}

console.log('Using database at:', dbPath)
console.log('Database exists:', fs.existsSync(dbPath))

// If database doesn't exist, try alternative locations
if (!fs.existsSync(dbPath)) {
  const altPaths = [
    path.join(process.cwd(), '..', 'data', 'biblebus.db'), // root data/
    path.join(__dirname, '..', 'data', 'biblebus.db'),      // from script location
  ]
  
  for (const altPath of altPaths) {
    if (fs.existsSync(altPath)) {
      console.log(`Database not found at ${dbPath}, using alternative: ${altPath}`)
      dbPath = altPath
      break
    }
  }
}

const db = new sqlite3.Database(dbPath)

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'jaklilu@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || ''
  }
})

// Email template function
const sendWelcomeEmailWithWhatsApp = async (email, userName, groupName, groupStartDate, registrationDeadline, whatsappInviteUrl) => {
  const whatsappButton = whatsappInviteUrl ? `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${whatsappInviteUrl}" 
         style="background: linear-gradient(135deg, #25D366, #128C7E); 
                color: white; 
                padding: 18px 40px; 
                text-decoration: none; 
                border-radius: 10px; 
                font-weight: bold; 
                font-size: 18px;
                display: inline-block;
                box-shadow: 0 4px 15px rgba(37, 211, 102, 0.4);
                margin: 10px 0;">
        📱 Join Your WhatsApp Group Now
      </a>
    </div>
    <p style="color: #6b7280; line-height: 1.6; font-size: 14px; text-align: center; margin-top: 15px;">
      <strong>Important:</strong> Click the button above to join your group's WhatsApp chat. 
      This is where we communicate daily updates, encouragement, and important announcements.
    </p>
  ` : `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        ⚠️ WhatsApp group link will be available soon. Check your dashboard for updates.
      </p>
    </div>
  `
  
  const mailOptions = {
    from: `"The Bible Bus" <${process.env.EMAIL_USER || 'jaklilu@gmail.com'}>`,
    to: email,
    subject: `Welcome to ${groupName}! 🚌 - Join Your WhatsApp Group`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚌 The Bible Bus</h1>
          <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">Welcome Aboard!</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #374151; margin-top: 0;">Hello ${userName}! 🎉</h2>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
            Welcome to <strong>${groupName}</strong>! We're thrilled to have you join us on this incredible 365-day journey through the Bible.
          </p>
          
          <div style="background: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #5b21b6; margin: 0; font-weight: bold; font-size: 14px;">
              📅 Group Start Date: ${new Date(groupStartDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p style="color: #5b21b6; margin: 5px 0 0 0; font-size: 14px;">
              ⏰ Registration Deadline: ${new Date(registrationDeadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 16px; font-weight: bold;">
            ⚡ Action Required: Join Your WhatsApp Group
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
            To stay connected with your group and receive daily updates, you <strong>must</strong> join your WhatsApp group. 
            This is our primary communication channel for:
          </p>
          
          <ul style="color: #6b7280; line-height: 1.8; font-size: 16px; padding-left: 20px;">
            <li>Daily reading reminders</li>
            <li>Encouragement and support</li>
            <li>Important announcements</li>
            <li>Group discussions and questions</li>
          </ul>
          
          ${whatsappButton}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
               style="background: linear-gradient(135deg, #f59e0b, #fbbf24); 
                      color: #7c2d12; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 6px rgba(245, 158, 11, 0.3);">
              Visit Your Dashboard
            </a>
          </div>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin-top: 30px;">
            If you have any questions or need help, don't hesitate to reach out. We're here to support you every step of the way!
          </p>
          
          <p style="color: #6b7280; line-height: 1.6; font-size: 16px;">
            Blessings,<br>
            <strong>The Bible Bus Team</strong>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p style="margin: 5px 0;">The Bible Bus - Journey to the Heart of God</p>
        </div>
      </div>
    `
  }
  
  return transporter.sendMail(mailOptions)
}

// Get group details
db.get('SELECT * FROM bible_groups WHERE id = ?', [groupId], async (err, group) => {
  if (err) {
    console.error('Error finding group:', err)
    db.close()
    process.exit(1)
  }
  
  if (!group) {
    console.log(`❌ Group with ID ${groupId} not found`)
    db.close()
    process.exit(1)
  }
  
  console.log(`✅ Found group: ${group.name} (ID: ${group.id})`)
  console.log(`   Status: ${group.status}`)
  console.log(`   WhatsApp URL: ${group.whatsapp_invite_url || '❌ NOT SET - Please set this in admin panel first!'}`)
  
  if (!group.whatsapp_invite_url) {
    console.log('\n⚠️  WARNING: WhatsApp URL is not set for this group!')
    console.log('   Please set it in the admin panel before sending emails.')
    console.log('   The emails will still be sent but without the WhatsApp link.')
    console.log('\n   Continue anyway? (This script will proceed in 3 seconds...)')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  
  // Get all active members
  db.all(`
    SELECT u.id, u.name, u.email, u.phone
    FROM group_members gm
    JOIN users u ON gm.user_id = u.id
    WHERE gm.group_id = ? AND gm.status = 'active' AND u.status = 'active'
  `, [groupId], async (err, members) => {
    if (err) {
      console.error('Error fetching members:', err)
      db.close()
      process.exit(1)
    }
    
    if (members.length === 0) {
      console.log(`\n❌ No active members found in this group`)
      console.log(`   The group has 0 members assigned.`)
      console.log(`   Please assign members to the group first.`)
      db.close()
      process.exit(1)
    }
    
    console.log(`\n📧 Found ${members.length} active members`)
    console.log('Sending emails...\n')
    
    let sentCount = 0
    let failedCount = 0
    
    for (const member of members) {
      try {
        await sendWelcomeEmailWithWhatsApp(
          member.email,
          member.name,
          group.name,
          group.start_date,
          group.registration_deadline,
          group.whatsapp_invite_url
        )
        sentCount++
        console.log(`✅ Sent to ${member.name} (${member.email})`)
      } catch (error) {
        failedCount++
        console.error(`❌ Failed to send to ${member.name} (${member.email}):`, error.message)
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Sent: ${sentCount}`)
    console.log(`   ❌ Failed: ${failedCount}`)
    console.log(`   📧 Total: ${members.length}`)
    
    db.close()
    process.exit(0)
  })
})


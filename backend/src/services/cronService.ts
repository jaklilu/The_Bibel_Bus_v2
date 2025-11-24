import { GroupService } from './groupService'
import { getRows, runQuery } from '../database/database'
import { MessageService } from './messageService'
import { UserInteractionService } from './userInteractionService'

export class CronService {
  /**
   * Update all group statuses based on current date
   * This should be called periodically (e.g., daily)
   */
  static async updateGroupStatuses(): Promise<void> {
    try {
      console.log('🔄 Updating group statuses...')
      
      // Update existing group statuses
      await GroupService.updateGroupStatuses()
      
      // Check if we need to create a new group
      const currentGroup = await GroupService.getCurrentActiveGroup()
      const nextGroup = await GroupService.getNextUpcomingGroup()
      
      if (!currentGroup && !nextGroup) {
        console.log('📅 No groups found, creating initial group...')
        await GroupService.createNextQuarterlyGroup()
      } else if (!currentGroup && nextGroup) {
        console.log('📅 Activating next group...')
        // The next group should become active
        await GroupService.updateGroupStatuses()
      }
      
      console.log('✅ Group statuses updated successfully')
    } catch (error) {
      console.error('❌ Error updating group statuses:', error)
    }
  }

  /**
   * Create the next quarterly group if needed
   * This should be called periodically (e.g., monthly)
   */
  static async ensureNextGroupExists(): Promise<void> {
    try {
      console.log('🔄 Ensuring next group exists...')
      
      const nextGroup = await GroupService.getNextUpcomingGroup()
      
      if (!nextGroup) {
        console.log('📅 Creating next quarterly group...')
        await GroupService.createNextQuarterlyGroup()
      } else {
        console.log('📅 Next group already exists:', nextGroup.name)
      }
      
      console.log('✅ Next group check completed')
    } catch (error) {
      console.error('❌ Error ensuring next group exists:', error)
    }
  }

  /**
   * Run all cron jobs
   * This should be called periodically (e.g., daily)
   */
  static async runAllCronJobs(): Promise<void> {
    try {
      console.log('🚀 Running all cron jobs...')
      
      await this.updateGroupStatuses()
      await this.ensureNextGroupExists()
      await postWelcomeMessagesForNewlyActiveGroups()
      await sendInvitationReminders()
      
      console.log('✅ All cron jobs completed successfully')
    } catch (error) {
      console.error('❌ Error running cron jobs:', error)
    }
  }
}

// Helper: Post welcome messages once per group when they turn active
export async function postWelcomeMessagesForNewlyActiveGroups(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Check if we've already processed welcome messages today
    const todayProcessed = await getRows(`
      SELECT id FROM group_messages 
      WHERE created_at LIKE ? AND title LIKE '%Welcome%'
      LIMIT 1
    `, [`${today}%`])
    
    if (todayProcessed && todayProcessed.length > 0) {
      console.log('Welcome messages already processed today, skipping...')
      return
    }
    
    console.log('Processing welcome messages for newly active groups...')
    // Newly active groups today with no welcome yet
    const groups = await getRows(`
      SELECT id, name FROM bible_groups 
      WHERE status = 'active' AND start_date <= ?
    `, [today])

    for (const g of groups) {
      // Check if a welcome message already exists for this group
      const exists = await getRows(
        `SELECT id FROM group_messages 
         WHERE group_id = ? 
         AND (title LIKE '%Welcome%' OR title LIKE '%welcome%')
         LIMIT 1`,
        [g.id]
      )
      
      if (exists && exists.length > 0) {
        console.log(`Welcome message already exists for group ${g.id} (${g.name})`)
        continue
      }

      // Check if this group has any new users (users with no prior memberships)
      const newUsers = await getRows(`
        SELECT DISTINCT gm.user_id
        FROM group_members gm
        WHERE gm.group_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM group_members gm2
            JOIN bible_groups bg2 ON gm2.group_id = bg2.id
            WHERE gm2.user_id = gm.user_id AND gm2.group_id != gm.group_id AND bg2.start_date < (SELECT start_date FROM bible_groups WHERE id = ?)
          )
      `, [g.id, g.id])

      if (newUsers && newUsers.length > 0) {
        console.log(`Creating welcome message for group ${g.id} (${g.name}) with ${newUsers.length} new users`)
        const content = `Hello Travelers,\n\nI'm so excited that you've decided to get on the Bible Bus! There's nothing like getting to know the God we believe in and worship. All of life's questions find their answers in His Word.\n\nSome of you have been on this ride multiple times, while for most of you, it's your first time. So, here are a few words of wisdom before you begin your journey to the heart of God:\n- Set aside 15 minutes a day and commit to reading during that time. Mornings right after waking up or evenings before bed tend to work best.\n- First-timers, focus on the big picture and how the stories connect. Don't worry if you don't understand certain verses or topics. Make a note of them, you'll often find the answers in upcoming chapters or books.\n- If you fall behind, don't stress. Skip what you missed and stay with the current day's reading. You can catch up on the weekend when you have time. The most important thing is not to stop or give up, keep going!\n- You also have the option to listen instead of read, which can help you catch up quickly.\n- The goal is to finish reading the Scriptures one day at a time—just 15 minutes a day.\n- You can also choose to read or listen in over 82 different languages.`

        // Get admin user ID for creating the welcome message
        const adminUser = await getRows('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin'])
        const adminId = adminUser && adminUser.length > 0 ? adminUser[0].id : 1

        await MessageService.createMessage({
          group_id: g.id,
          title: 'Welcome to Your Bible Journey!',
          content: content,
          message_type: 'encouragement',
          priority: 'normal',
          created_by: adminId
        })
      } else {
        console.log(`No new users found in group ${g.id} (${g.name}), skipping welcome message`)
      }
    }
  } catch (e) {
    console.error('Error posting welcome messages:', e)
  }
}

// Helper: Send invitation reminders on days 3, 7, 11, 15 after group start
export async function sendInvitationReminders(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Find active groups within their first 17 days
    const groups = await getRows(`
      SELECT id, name, start_date, registration_deadline 
      FROM bible_groups 
      WHERE status = 'active' 
      AND start_date <= ?
      AND registration_deadline >= ?
    `, [today, today])

    for (const group of groups) {
      // Calculate days since group started
      const startDate = new Date(group.start_date)
      const todayDate = new Date(today)
      const daysSinceStart = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

      // Only send on days 3, 7, 11, 15
      if (![3, 7, 11, 15].includes(daysSinceStart)) {
        continue
      }

      console.log(`Sending invitation reminders for group ${group.id} (${group.name}) on day ${daysSinceStart}`)

      // Check if we've already sent a reminder today for this group
      const reminderExists = await getRows(`
        SELECT id FROM group_messages 
        WHERE group_id = ? 
        AND created_at LIKE ?
        AND title LIKE '%Don''t Miss Out%'
        LIMIT 1
      `, [group.id, `${today}%`])

      if (reminderExists && reminderExists.length > 0) {
        console.log(`Invitation reminder already sent today for group ${group.id}`)
        continue
      }

      // Create message board post
      const content = `We noticed some members haven't accepted their invitation yet.\n\nTo start your 365-day Bible reading journey:\n1. Visit your dashboard\n2. Under "Accept Your Invitation", click on "Join Reading Group"\n3. Also click "Join Your WhatsApp Group" for further communication\n\nThe registration window closes on ${new Date(group.registration_deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. Don't miss out on reading with your group!\n\nSee you on the Bus!`

      // Get admin user ID
      const adminUser = await getRows('SELECT id FROM users WHERE role = ? LIMIT 1', ['admin'])
      const adminId = adminUser && adminUser.length > 0 ? adminUser[0].id : 1

      // Post to message board
      await MessageService.createMessage({
        group_id: group.id,
        title: 'Don\'t Miss Out on Your Bible Journey!',
        content: content,
        message_type: 'reminder',
        priority: 'high',
        created_by: adminId
      })

      // Send emails to all group members
      const members = await getRows(`
        SELECT u.id, u.name, u.email
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ? AND gm.status = 'active'
      `, [group.id])

      console.log(`Sending invitation reminder emails to ${members.length} members`)

      const { sendInvitationReminderEmail } = await import('../utils/emailService')
      
      for (const member of members) {
        try {
          await sendInvitationReminderEmail(
            member.email,
            member.name,
            group.name,
            group.registration_deadline,
            group.whatsapp_invite_url || null
          )
        } catch (emailError) {
          console.error(`Failed to send reminder email to ${member.email}:`, emailError)
          // Continue with other emails even if one fails
        }
      }

      console.log(`Invitation reminders sent for group ${group.id} on day ${daysSinceStart}`)
    }
  } catch (e) {
    console.error('Error sending invitation reminders:', e)
  }
}

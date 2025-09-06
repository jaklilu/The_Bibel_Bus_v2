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
    // Newly active groups today with no welcome yet
    const groups = await getRows(`
      SELECT id, name FROM bible_groups 
      WHERE status = 'active' AND start_date <= ?
    `, [today])

    for (const g of groups) {
      // Find users in this group who have no prior memberships (new users)
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

      for (const u of newUsers) {
        // Check if a welcome exists for this user already
        const exists = await getRows(
          `SELECT id FROM user_messages WHERE group_id = ? AND user_id = ? AND title = ? LIMIT 1`,
          [g.id, u.user_id, 'Welcome to Your Bible Journey!']
        )
        if (exists && exists.length > 0) continue

        const content = `Hello Travelers,\n\nI’m so excited that you’ve decided to get on the Bible Bus! There’s nothing like getting to know the God we believe in and worship. All of life’s questions find their answers in His Word.\n\nSome of you have been on this ride multiple times, while for most of you, it’s your first time. So, here are a few words of wisdom before you begin your journey to the heart of God:\n- Set aside 15 minutes a day and commit to reading during that time. Mornings right after waking up or evenings before bed tend to work best.\n- First-timers, focus on the big picture and how the stories connect. Don’t worry if you don’t understand certain verses or topics. Make a note of them, you’ll often find the answers in upcoming chapters or books.\n- If you fall behind, don’t stress. Skip what you missed and stay with the current day’s reading. You can catch up on the weekend when you have time. The most important thing is not to stop or give up, keep going!\n- You also have the option to listen instead of read, which can help you catch up quickly.\n- The goal is to finish reading the Scriptures one day at a time—just 15 minutes a day.\n- You can also choose to read or listen in over 82 different languages.`

        await UserInteractionService.createUserMessage(
          g.id,
          u.user_id,
          'Welcome to Your Bible Journey!',
          content,
          'encouragement',
          'new_user'
        )
      }
    }
  } catch (e) {
    console.error('Error posting welcome messages:', e)
  }
}

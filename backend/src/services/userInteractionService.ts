import { getRows, getRow, runQuery } from '../database/database'

export class UserInteractionService {
  // Get all comments for a specific message
  static async getMessageComments(messageId: number) {
    try {
      const comments = await getRows(`
        SELECT 
          mc.*,
          u.name as user_name,
          u.email as user_email
        FROM message_comments mc
        JOIN users u ON mc.user_id = u.id
        WHERE mc.message_id = ?
        ORDER BY mc.created_at ASC
      `, [messageId])
      
      return comments
    } catch (error) {
      console.error('Error fetching message comments:', error)
      throw error
    }
  }

  // Add a comment to a message
  static async addComment(messageId: number, userId: number, content: string) {
    try {
      const result = await runQuery(`
        INSERT INTO message_comments (message_id, user_id, content)
        VALUES (?, ?, ?)
      `, [messageId, userId, content])
      
      return result
    } catch (error) {
      console.error('Error adding comment:', error)
      throw error
    }
  }

  // Get user-generated messages for a group
  static async getUserMessages(groupId: number) {
    try {
      const messages = await getRows(`
        SELECT 
          um.*,
          u.name as user_name,
          u.email as user_email
        FROM user_messages um
        JOIN users u ON um.user_id = u.id
        WHERE um.group_id = ? AND um.status = 'approved'
        ORDER BY um.created_at DESC
      `, [groupId])
      
      return messages
    } catch (error) {
      console.error('Error fetching user messages:', error)
      throw error
    }
  }

  // Create a new user message
  static async createUserMessage(groupId: number, userId: number, title: string | null, content: string, messageType: string = 'encouragement', visibility: 'group' | 'new_user' = 'group') {
    try {
      const autoTitle = title && title.trim().length > 0
        ? title.trim()
        : (content.length > 60 ? content.slice(0, 57) + '…' : content)
      const result = await runQuery(`
        INSERT INTO user_messages (group_id, user_id, title, content, message_type, visibility)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [groupId, userId, autoTitle, content, messageType, visibility])
      
      return result
    } catch (error) {
      console.error('Error creating user message:', error)
      throw error
    }
  }

  // Get all messages (admin + user) for a group with comments
  static async getAllGroupMessages(groupId: number) {
    try {
      // Get admin messages
      const adminMessages = await getRows(`
        SELECT 
          gm.*,
          u.name as created_by_name,
          u.email as created_by_email,
          'admin' as message_source
        FROM group_messages gm
        JOIN users u ON gm.created_by = u.id
        WHERE gm.group_id = ?
        ORDER BY gm.created_at DESC
      `, [groupId])

      // Get user messages
      const userMessages = await getRows(`
        SELECT 
          um.*,
          u.name as created_by_name,
          u.email as created_by_email,
          'user' as message_source
        FROM user_messages um
        JOIN users u ON um.user_id = u.id
        WHERE um.group_id = ? AND um.status = 'approved'
        ORDER BY um.created_at DESC
      `, [groupId])

      // Combine and sort all messages
      const allMessages = [...adminMessages, ...userMessages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Get comments for each message
      for (const message of allMessages) {
        const comments = await this.getMessageComments(message.id)
        message.comments = comments
        message.comment_count = comments.length
      }

      return allMessages
    } catch (error) {
      console.error('Error fetching all group messages:', error)
      throw error
    }
  }

  // Get user's own messages
  static async getUserOwnMessages(userId: number, groupId: number) {
    try {
      const messages = await getRows(`
        SELECT * FROM user_messages
        WHERE user_id = ? AND group_id = ?
        ORDER BY created_at DESC
      `, [userId, groupId])
      
      return messages
    } catch (error) {
      console.error('Error fetching user own messages:', error)
      throw error
    }
  }

  // Delete a user's own message
  static async deleteUserMessage(messageId: number, userId: number) {
    try {
      const result = await runQuery(`
        DELETE FROM user_messages
        WHERE id = ? AND user_id = ?
      `, [messageId, userId])
      
      return result
    } catch (error) {
      console.error('Error deleting user message:', error)
      throw error
    }
  }

  // Admin: list all user messages (optionally by group)
  static async adminListUserMessages(groupId?: number) {
    try {
      if (groupId) {
        return await getRows(`
          SELECT um.*, u.name as author_name, u.email as author_email
          FROM user_messages um
          JOIN users u ON um.user_id = u.id
          WHERE um.group_id = ?
          ORDER BY um.created_at DESC
        `, [groupId])
      }
      return await getRows(`
        SELECT um.*, u.name as author_name, u.email as author_email
        FROM user_messages um
        JOIN users u ON um.user_id = u.id
        ORDER BY um.created_at DESC
      `)
    } catch (error) {
      console.error('Error listing user messages (admin):', error)
      throw error
    }
  }

  // Admin: delete any user message by id (and its comments)
  static async adminDeleteUserMessage(messageId: number) {
    try {
      await runQuery('DELETE FROM message_comments WHERE message_id = ?', [messageId])
      await runQuery('DELETE FROM user_messages WHERE id = ?', [messageId])
    } catch (error) {
      console.error('Error admin-deleting user message:', error)
      throw error
    }
  }
}

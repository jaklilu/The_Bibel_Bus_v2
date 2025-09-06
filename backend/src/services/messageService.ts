import { runQuery, getRow, getRows } from '../database/database'

export interface GroupMessage {
  id: number
  group_id: number
  title: string
  content: string
  message_type: 'encouragement' | 'reminder' | 'announcement' | 'milestone'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_by: number
  created_at: string
  author_name?: string
  group_name?: string
}

export class MessageService {
  /**
   * Create a new message for a specific group
   */
  static async createMessage(messageData: Omit<GroupMessage, 'id' | 'created_at'>): Promise<GroupMessage> {
    const result = await runQuery(`
      INSERT INTO group_messages (group_id, title, content, message_type, priority, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [messageData.group_id, messageData.title, messageData.content, messageData.message_type, messageData.priority, messageData.created_by])

    // Get the created message with author and group info
    const message = await this.getMessageById(result.lastID)
    return message!
  }

  /**
   * Get a message by ID with author and group information
   */
  static async getMessageById(messageId: number): Promise<GroupMessage | null> {
    return await getRow(`
      SELECT 
        gm.*,
        u.name as author_name,
        bg.name as group_name
      FROM group_messages gm
      JOIN users u ON gm.created_by = u.id
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.id = ?
    `, [messageId])
  }

  /**
   * Get all messages for a specific group
   */
  static async getMessagesByGroup(groupId: number, limit: number = 50): Promise<GroupMessage[]> {
    return await getRows(`
      SELECT 
        gm.*,
        u.name as author_name,
        bg.name as group_name
      FROM group_messages gm
      JOIN users u ON gm.created_by = u.id
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.group_id = ?
      ORDER BY gm.created_at DESC
      LIMIT ?
    `, [groupId, limit])
  }

  /**
   * Get all messages across all groups (for admin)
   */
  static async getAllMessages(limit: number = 100): Promise<GroupMessage[]> {
    return await getRows(`
      SELECT 
        gm.*,
        u.name as author_name,
        bg.name as group_name
      FROM group_messages gm
      JOIN users u ON gm.created_by = u.id
      JOIN bible_groups bg ON gm.group_id = bg.id
      ORDER BY gm.created_at DESC
      LIMIT ?
    `, [limit])
  }

  /**
   * Get messages by type for a specific group
   */
  static async getMessagesByType(groupId: number, messageType: string, limit: number = 20): Promise<GroupMessage[]> {
    return await getRows(`
      SELECT 
        gm.*,
        u.name as author_name,
        bg.name as group_name
      FROM group_messages gm
      JOIN users u ON gm.created_by = u.id
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.group_id = ? AND gm.message_type = ?
      ORDER BY gm.created_at DESC
      LIMIT ?
    `, [groupId, messageType, limit])
  }

  /**
   * Update an existing message
   */
  static async updateMessage(messageId: number, updates: Partial<Omit<GroupMessage, 'id' | 'created_by' | 'created_at'>>): Promise<boolean> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    const values = Object.values(updates)
    
    const result = await runQuery(`
      UPDATE group_messages 
      SET ${fields}
      WHERE id = ?
    `, [...values, messageId])

    return result.changes > 0
  }

  /**
   * Delete a message
   */
  static async deleteMessage(messageId: number): Promise<boolean> {
    const result = await runQuery('DELETE FROM group_messages WHERE id = ?', [messageId])
    return result.changes > 0
  }

  /**
   * Get message statistics for a group
   */
  static async getGroupMessageStats(groupId: number): Promise<{
    total: number
    by_type: Record<string, number>
    recent_count: number
  }> {
    const total = await getRow('SELECT COUNT(*) as count FROM group_messages WHERE group_id = ?', [groupId])
    
    const byType = await getRows(`
      SELECT message_type, COUNT(*) as count 
      FROM group_messages 
      WHERE group_id = ? 
      GROUP BY message_type
    `, [groupId])
    
    const recent = await getRow(`
      SELECT COUNT(*) as count 
      FROM group_messages 
      WHERE group_id = ? 
      AND created_at >= datetime('now', '-7 days')
    `, [groupId])

    const typeStats: Record<string, number> = {}
    byType.forEach(row => {
      typeStats[row.message_type] = row.count
    })

    return {
      total: total.count,
      by_type: typeStats,
      recent_count: recent.count
    }
  }
}

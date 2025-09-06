"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageService = void 0;
const database_1 = require("../database/database");
class MessageService {
    /**
     * Create a new message for a specific group
     */
    static async createMessage(messageData) {
        const result = await (0, database_1.runQuery)(`
      INSERT INTO group_messages (group_id, title, content, message_type, priority, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [messageData.group_id, messageData.title, messageData.content, messageData.message_type, messageData.priority, messageData.created_by]);
        // Get the created message with author and group info
        const message = await this.getMessageById(result.lastID);
        return message;
    }
    /**
     * Get a message by ID with author and group information
     */
    static async getMessageById(messageId) {
        return await (0, database_1.getRow)(`
      SELECT 
        gm.*,
        u.name as author_name,
        bg.name as group_name
      FROM group_messages gm
      JOIN users u ON gm.created_by = u.id
      JOIN bible_groups bg ON gm.group_id = bg.id
      WHERE gm.id = ?
    `, [messageId]);
    }
    /**
     * Get all messages for a specific group
     */
    static async getMessagesByGroup(groupId, limit = 50) {
        return await (0, database_1.getRows)(`
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
    `, [groupId, limit]);
    }
    /**
     * Get all messages across all groups (for admin)
     */
    static async getAllMessages(limit = 100) {
        return await (0, database_1.getRows)(`
      SELECT 
        gm.*,
        u.name as author_name,
        bg.name as group_name
      FROM group_messages gm
      JOIN users u ON gm.created_by = u.id
      JOIN bible_groups bg ON gm.group_id = bg.id
      ORDER BY gm.created_at DESC
      LIMIT ?
    `, [limit]);
    }
    /**
     * Get messages by type for a specific group
     */
    static async getMessagesByType(groupId, messageType, limit = 20) {
        return await (0, database_1.getRows)(`
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
    `, [groupId, messageType, limit]);
    }
    /**
     * Update an existing message
     */
    static async updateMessage(messageId, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        const result = await (0, database_1.runQuery)(`
      UPDATE group_messages 
      SET ${fields}
      WHERE id = ?
    `, [...values, messageId]);
        return result.changes > 0;
    }
    /**
     * Delete a message
     */
    static async deleteMessage(messageId) {
        const result = await (0, database_1.runQuery)('DELETE FROM group_messages WHERE id = ?', [messageId]);
        return result.changes > 0;
    }
    /**
     * Get message statistics for a group
     */
    static async getGroupMessageStats(groupId) {
        const total = await (0, database_1.getRow)('SELECT COUNT(*) as count FROM group_messages WHERE group_id = ?', [groupId]);
        const byType = await (0, database_1.getRows)(`
      SELECT message_type, COUNT(*) as count 
      FROM group_messages 
      WHERE group_id = ? 
      GROUP BY message_type
    `, [groupId]);
        const recent = await (0, database_1.getRow)(`
      SELECT COUNT(*) as count 
      FROM group_messages 
      WHERE group_id = ? 
      AND created_at >= datetime('now', '-7 days')
    `, [groupId]);
        const typeStats = {};
        byType.forEach(row => {
            typeStats[row.message_type] = row.count;
        });
        return {
            total: total.count,
            by_type: typeStats,
            recent_count: recent.count
        };
    }
}
exports.MessageService = MessageService;
//# sourceMappingURL=messageService.js.map
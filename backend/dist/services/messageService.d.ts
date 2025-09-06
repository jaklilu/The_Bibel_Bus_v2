export interface GroupMessage {
    id: number;
    group_id: number;
    title: string;
    content: string;
    message_type: 'encouragement' | 'reminder' | 'announcement' | 'milestone';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    created_by: number;
    created_at: string;
    author_name?: string;
    group_name?: string;
}
export declare class MessageService {
    /**
     * Create a new message for a specific group
     */
    static createMessage(messageData: Omit<GroupMessage, 'id' | 'created_at'>): Promise<GroupMessage>;
    /**
     * Get a message by ID with author and group information
     */
    static getMessageById(messageId: number): Promise<GroupMessage | null>;
    /**
     * Get all messages for a specific group
     */
    static getMessagesByGroup(groupId: number, limit?: number): Promise<GroupMessage[]>;
    /**
     * Get all messages across all groups (for admin)
     */
    static getAllMessages(limit?: number): Promise<GroupMessage[]>;
    /**
     * Get messages by type for a specific group
     */
    static getMessagesByType(groupId: number, messageType: string, limit?: number): Promise<GroupMessage[]>;
    /**
     * Update an existing message
     */
    static updateMessage(messageId: number, updates: Partial<Omit<GroupMessage, 'id' | 'created_by' | 'created_at'>>): Promise<boolean>;
    /**
     * Delete a message
     */
    static deleteMessage(messageId: number): Promise<boolean>;
    /**
     * Get message statistics for a group
     */
    static getGroupMessageStats(groupId: number): Promise<{
        total: number;
        by_type: Record<string, number>;
        recent_count: number;
    }>;
}
//# sourceMappingURL=messageService.d.ts.map
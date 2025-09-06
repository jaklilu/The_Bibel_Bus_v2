"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const database_1 = require("../database/database");
class GroupService {
    /**
     * Align a date string (YYYY-MM-DD) to the quarterly anchors:
     * Jan 1st, Apr 1st, Jul 1st, Oct 1st
     * Keeps the same quarter as the input date.
     */
    static alignToQuarterStart(dateStr) {
        const d = new Date(dateStr);
        if (isNaN(d.getTime()))
            return dateStr;
        const month = d.getMonth(); // 0-based
        let anchorMonth = 0;
        if (month >= 0 && month <= 2)
            anchorMonth = 0; // Jan
        else if (month >= 3 && month <= 5)
            anchorMonth = 3; // Apr
        else if (month >= 6 && month <= 8)
            anchorMonth = 6; // Jul
        else
            anchorMonth = 9; // Oct
        const aligned = new Date(Date.UTC(d.getUTCFullYear(), anchorMonth, 1));
        return aligned.toISOString().split('T')[0];
    }
    /**
     * Compute end_date (1 year after start) and registration_deadline (start + 17 days)
     */
    static computeDerivedDates(startDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        // End date should be the day before the same date next year
        end.setDate(end.getDate() - 1);
        const registrationDeadline = new Date(start);
        registrationDeadline.setDate(registrationDeadline.getDate() + 17);
        return {
            end_date: end.toISOString().split('T')[0],
            registration_deadline: registrationDeadline.toISOString().split('T')[0]
        };
    }
    /**
     * Get the current active group that's accepting registrations
     * Updated to include both 'active' and 'upcoming' statuses
     */
    static async getCurrentActiveGroup() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const group = await (0, database_1.getRow)(`
      SELECT * FROM bible_groups 
      WHERE (status = 'active' OR status = 'upcoming')
      AND registration_deadline >= ?
      ORDER BY start_date ASC
      LIMIT 1
    `, [today]);
        return group;
    }
    /**
     * Get the next upcoming group
     */
    static async getNextUpcomingGroup() {
        const group = await (0, database_1.getRow)(`
      SELECT * FROM bible_groups 
      WHERE status = 'upcoming' 
      ORDER BY start_date ASC
      LIMIT 1
    `);
        return group;
    }
    /**
     * Create the next quarterly group automatically
     */
    static async createNextQuarterlyGroup() {
        const now = new Date();
        const currentYear = now.getFullYear();
        // Find the last group to determine the next start date
        const lastGroup = await (0, database_1.getRow)(`
      SELECT * FROM bible_groups 
      ORDER BY start_date DESC 
      LIMIT 1
    `);
        if (!lastGroup) {
            // If no groups exist, create the October 2025 group
            return await this.createGroup('2025-10-01');
        }
        const lastStartDate = new Date(lastGroup.start_date);
        const nextStartDate = new Date(lastStartDate);
        nextStartDate.setMonth(nextStartDate.getMonth() + 3);
        // If next group is in the future, create it
        if (nextStartDate > now) {
            return await this.createGroup(nextStartDate.toISOString().split('T')[0]);
        }
        return null;
    }
    /**
     * Create a new group with the given start date
     */
    static async createGroup(startDate) {
        // Enforce quarterly anchors
        const alignedStart = this.alignToQuarterStart(startDate);
        const { end_date, registration_deadline } = this.computeDerivedDates(alignedStart);
        // Derive month/year from the ISO string directly to avoid timezone shifts
        const [yStr, mStr] = alignedStart.split('-');
        const year = parseInt(yStr, 10);
        const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1));
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[monthIndex];
        const groupName = `Bible Bus ${month} ${year} Travelers`;
        const result = await (0, database_1.runQuery)(`
      INSERT INTO bible_groups (name, start_date, end_date, registration_deadline, max_members, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [groupName, alignedStart, end_date, registration_deadline, 50, 'upcoming']);
        // Get the created group
        const group = await (0, database_1.getRow)('SELECT * FROM bible_groups WHERE id = ?', [result.lastID]);
        return group;
    }
    /**
     * Update group statuses based on current date
     */
    static async updateGroupStatuses() {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        // Update groups that should become active
        await (0, database_1.runQuery)(`
      UPDATE bible_groups 
      SET status = 'active' 
      WHERE status = 'upcoming' 
      AND start_date <= ?
    `, [today]);
        // Update groups that should close registration
        await (0, database_1.runQuery)(`
      UPDATE bible_groups 
      SET status = 'closed' 
      WHERE status = 'active' 
      AND registration_deadline < ?
    `, [today]);
        // Update groups that should be completed
        await (0, database_1.runQuery)(`
      UPDATE bible_groups 
      SET status = 'completed' 
      WHERE status IN ('active', 'closed') 
      AND end_date < ?
    `, [today]);
    }
    /**
     * Assign a user to the current active group
     */
    static async assignUserToGroup(userId) {
        try {
            // Get current active group
            const currentGroup = await this.getCurrentActiveGroup();
            if (!currentGroup) {
                // Try to create the next group
                const nextGroup = await this.createNextQuarterlyGroup();
                if (!nextGroup) {
                    return { success: false, message: 'No groups are currently accepting registrations' };
                }
                // Update the new group to active status
                await (0, database_1.runQuery)('UPDATE bible_groups SET status = ? WHERE id = ?', ['active', nextGroup.id]);
                // Assign user to this group
                await this.addUserToGroup(userId, nextGroup.id);
                return { success: true, groupId: nextGroup.id, message: 'Assigned to new group' };
            }
            // Check if group is full
            const memberCount = await (0, database_1.getRow)(`
        SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = 'active'
      `, [currentGroup.id]);
            if (memberCount.count >= currentGroup.max_members) {
                return { success: false, message: 'Current group is full. Please try again later.' };
            }
            // Check if user is already in this group
            const existingMember = await (0, database_1.getRow)(`
        SELECT * FROM group_members WHERE user_id = ? AND group_id = ? AND status = 'active'
      `, [userId, currentGroup.id]);
            if (existingMember) {
                return { success: true, groupId: currentGroup.id, message: 'Already a member of this group' };
            }
            // Add user to group
            await this.addUserToGroup(userId, currentGroup.id);
            return { success: true, groupId: currentGroup.id, message: 'Successfully assigned to group' };
        }
        catch (error) {
            console.error('Error assigning user to group:', error);
            return { success: false, message: 'Failed to assign user to group' };
        }
    }
    /**
     * Add a user to a specific group
     */
    static async addUserToGroup(userId, groupId) {
        const today = new Date().toISOString().split('T')[0];
        await (0, database_1.runQuery)(`
      INSERT INTO group_members (group_id, user_id, join_date, status) 
      VALUES (?, ?, ?, ?)
    `, [groupId, userId, today, 'active']);
    }
    /**
     * Get all groups with their member counts
     */
    static async getAllGroupsWithMemberCounts() {
        return await (0, database_1.getRows)(`
      SELECT 
        bg.*,
        COUNT(gm.id) as member_count
      FROM bible_groups bg
      LEFT JOIN group_members gm ON bg.id = gm.group_id AND gm.status = 'active'
      GROUP BY bg.id
      ORDER BY bg.start_date DESC
    `);
    }
    /**
     * Get group details by ID
     */
    static async getGroupById(groupId) {
        return await (0, database_1.getRow)('SELECT * FROM bible_groups WHERE id = ?', [groupId]);
    }
    /**
     * Get all members of a group
     */
    static async getGroupMembers(groupId) {
        return await (0, database_1.getRows)(`
      SELECT 
        gm.*,
        u.name,
        u.email,
        u.city
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date ASC
    `, [groupId]);
    }
    /**
     * Normalize all existing groups to quarterly anchors and recompute derived dates.
     * Also ensure naming matches the anchored month and year.
     */
    static async normalizeAllGroups() {
        const groups = await (0, database_1.getRows)('SELECT * FROM bible_groups ORDER BY start_date ASC');
        let updated = 0;
        for (const g of groups) {
            const alignedStart = this.alignToQuarterStart(g.start_date);
            const { end_date, registration_deadline } = this.computeDerivedDates(alignedStart);
            // Avoid timezone shifts when computing display month
            const [yStr, mStr] = alignedStart.split('-');
            const year = parseInt(yStr, 10);
            const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1));
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const month = monthNames[monthIndex];
            const expectedName = `Bible Bus ${month} ${year} Travelers`;
            const needsUpdate = (g.start_date !== alignedStart ||
                g.end_date !== end_date ||
                g.registration_deadline !== registration_deadline ||
                g.name !== expectedName);
            if (needsUpdate) {
                await (0, database_1.runQuery)('UPDATE bible_groups SET name = ?, start_date = ?, end_date = ?, registration_deadline = ? WHERE id = ?', [expectedName, alignedStart, end_date, registration_deadline, g.id]);
                updated++;
            }
        }
        return { updated };
    }
    /**
     * Admin: Create a group for a given start date (will be aligned to quarter anchors)
     */
    static async createGroupWithStart(startDate, maxMembers = 50, status = 'upcoming', name) {
        const alignedStart = this.alignToQuarterStart(startDate);
        const { end_date, registration_deadline } = this.computeDerivedDates(alignedStart);
        const [yStr, mStr] = alignedStart.split('-');
        const year = parseInt(yStr, 10);
        const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1));
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[monthIndex];
        const groupName = (name && name.trim().length > 0) ? name.trim() : `Bible Bus ${month} ${year} Travelers`;
        const result = await (0, database_1.runQuery)('INSERT INTO bible_groups (name, start_date, end_date, registration_deadline, max_members, status) VALUES (?, ?, ?, ?, ?, ?)', [groupName, alignedStart, end_date, registration_deadline, maxMembers, status]);
        const group = await (0, database_1.getRow)('SELECT * FROM bible_groups WHERE id = ?', [result.lastID]);
        return group;
    }
}
exports.GroupService = GroupService;
//# sourceMappingURL=groupService.js.map
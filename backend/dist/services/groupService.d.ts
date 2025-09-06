export interface BibleGroup {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    registration_deadline: string;
    max_members: number;
    status: 'upcoming' | 'active' | 'completed' | 'closed';
    created_at: string;
}
export interface GroupMember {
    id: number;
    group_id: number;
    user_id: number;
    join_date: string;
    status: 'active' | 'inactive';
    created_at: string;
}
export declare class GroupService {
    /**
     * Align a date string (YYYY-MM-DD) to the quarterly anchors:
     * Jan 1st, Apr 1st, Jul 1st, Oct 1st
     * Keeps the same quarter as the input date.
     */
    static alignToQuarterStart(dateStr: string): string;
    /**
     * Compute end_date (1 year after start) and registration_deadline (start + 17 days)
     */
    static computeDerivedDates(startDate: string): {
        end_date: string;
        registration_deadline: string;
    };
    /**
     * Get the current active group that's accepting registrations
     * Updated to include both 'active' and 'upcoming' statuses
     */
    static getCurrentActiveGroup(): Promise<BibleGroup | null>;
    /**
     * Get the next upcoming group
     */
    static getNextUpcomingGroup(): Promise<BibleGroup | null>;
    /**
     * Create the next quarterly group automatically
     */
    static createNextQuarterlyGroup(): Promise<BibleGroup | null>;
    /**
     * Create a new group with the given start date
     */
    private static createGroup;
    /**
     * Update group statuses based on current date
     */
    static updateGroupStatuses(): Promise<void>;
    /**
     * Assign a user to the current active group
     */
    static assignUserToGroup(userId: number): Promise<{
        success: boolean;
        groupId?: number;
        message: string;
    }>;
    /**
     * Add a user to a specific group
     */
    private static addUserToGroup;
    /**
     * Get all groups with their member counts
     */
    static getAllGroupsWithMemberCounts(): Promise<any[]>;
    /**
     * Get group details by ID
     */
    static getGroupById(groupId: number): Promise<BibleGroup | null>;
    /**
     * Get all members of a group
     */
    static getGroupMembers(groupId: number): Promise<any[]>;
    /**
     * Normalize all existing groups to quarterly anchors and recompute derived dates.
     * Also ensure naming matches the anchored month and year.
     */
    static normalizeAllGroups(): Promise<{
        updated: number;
    }>;
    /**
     * Admin: Create a group for a given start date (will be aligned to quarter anchors)
     */
    static createGroupWithStart(startDate: string, maxMembers?: number, status?: BibleGroup['status'], name?: string): Promise<BibleGroup>;
}
//# sourceMappingURL=groupService.d.ts.map
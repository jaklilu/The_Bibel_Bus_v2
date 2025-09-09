import { runQuery, getRow, getRows } from '../database/database'

export interface BibleGroup {
  id: number
  name: string
  start_date: string
  end_date: string
  registration_deadline: string
  max_members: number
  status: 'upcoming' | 'active' | 'completed' | 'closed'
  created_at: string
}

export interface GroupMember {
  id: number
  group_id: number
  user_id: number
  join_date: string
  status: 'active' | 'inactive'
  created_at: string
}

export class GroupService {
  /**
   * Determine if a date belongs to a legacy group (year ≤ 2023).
   * Accepts YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
   */
  static isLegacy(dateStr: string): boolean {
    if (!dateStr) return false
    let normalized = dateStr
    const m1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m1) normalized = `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`
    const m2 = dateStr.match(/^(\d{1,2})[\-.](\d{1,2})[\-.](\d{4})$/)
    if (m2) normalized = `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return false
    return d.getUTCFullYear() <= 2023
  }
  /**
   * Align a date string (YYYY-MM-DD) to the quarterly anchors:
   * Jan 1st, Apr 1st, Jul 1st, Oct 1st
   * Keeps the same quarter as the input date.
   */
  static alignToQuarterStart(dateStr: string): string {
    // Support MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY or YYYY-MM-DD
    let normalized = dateStr
    // Slashes
    let md = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (md) {
      const mm = md[1].padStart(2, '0')
      const dd = md[2].padStart(2, '0')
      normalized = `${md[3]}-${mm}-${dd}`
    }
    // Dashes or dots (e.g., 04-01-2024 or 04.01.2024)
    const mdAlt = dateStr.match(/^(\d{1,2})[\-.](\d{1,2})[\-.](\d{4})$/)
    if (mdAlt) {
      const mm = mdAlt[1].padStart(2, '0')
      const dd = mdAlt[2].padStart(2, '0')
      normalized = `${mdAlt[3]}-${mm}-${dd}`
    }
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return dateStr
    const month = d.getUTCMonth() // 0-based, avoid timezone shifts
    let anchorMonth = 0
    if (month >= 0 && month <= 2) anchorMonth = 0     // Jan
    else if (month >= 3 && month <= 5) anchorMonth = 3 // Apr
    else if (month >= 6 && month <= 8) anchorMonth = 6 // Jul
    else anchorMonth = 9                               // Oct

    const aligned = new Date(Date.UTC(d.getUTCFullYear(), anchorMonth, 1))
    return aligned.toISOString().split('T')[0]
  }

  /**
   * Compute end_date (1 year after start) and registration_deadline (start + 17 days)
   */
  static computeDerivedDates(startDate: string): { end_date: string; registration_deadline: string } {
    const start = new Date(startDate)
    const end = new Date(start)
    end.setFullYear(end.getFullYear() + 1)
    // End date should be the day before the same date next year
    end.setDate(end.getDate() - 1)

    const registrationDeadline = new Date(start)
    registrationDeadline.setDate(registrationDeadline.getDate() + 17)

    return {
      end_date: end.toISOString().split('T')[0],
      registration_deadline: registrationDeadline.toISOString().split('T')[0]
    }
  }
  /**
   * Get the current active group that's accepting registrations
   * Updated to include both 'active' and 'upcoming' statuses
   */
  static async getCurrentActiveGroup(): Promise<BibleGroup | null> {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const group = await getRow(`
      SELECT * FROM bible_groups 
      WHERE (status = 'active' OR status = 'upcoming')
      AND registration_deadline >= ?
      AND start_date >= '2024-01-01'
      ORDER BY start_date ASC
      LIMIT 1
    `, [today])
    
    return group
  }

  /**
   * Get the next upcoming group
   */
  static async getNextUpcomingGroup(): Promise<BibleGroup | null> {
    const group = await getRow(`
      SELECT * FROM bible_groups 
      WHERE status = 'upcoming' 
      AND start_date >= '2024-01-01'
      ORDER BY start_date ASC
      LIMIT 1
    `)
    
    return group
  }

  /**
   * Create the next quarterly group automatically
   */
  static async createNextQuarterlyGroup(): Promise<BibleGroup | null> {
    const now = new Date()
    const currentYear = now.getFullYear()
    
    // Find the last group to determine the next start date
    const lastGroup = await getRow(`
      SELECT * FROM bible_groups 
      WHERE start_date >= '2024-01-01'
      ORDER BY start_date DESC 
      LIMIT 1
    `)
    
    if (!lastGroup) {
      // If no groups exist, create the October 2025 group
      return await this.createGroup('2025-10-01')
    }
    
    const lastStartDate = new Date(lastGroup.start_date)
    const nextStartDate = new Date(lastStartDate)
    nextStartDate.setMonth(nextStartDate.getMonth() + 3)
    
    // If next group is in the future, create it
    if (nextStartDate > now) {
      return await this.createGroup(nextStartDate.toISOString().split('T')[0])
    }
    
    return null
  }

  /**
   * Create a new group with the given start date
   */
  private static async createGroup(startDate: string): Promise<BibleGroup> {
    // Enforce quarterly anchors
    const legacy = this.isLegacy(startDate)
    const actualStart = legacy ? this.alignToQuarterStart(startDate).replace(/-.*/, (s)=> s) : this.alignToQuarterStart(startDate)
    // For legacy, do NOT force quarter; use the parsed date instead of anchored month.
    // Normalize start to ISO from input without altering quarter if legacy.
    const startISO = legacy ? ((): string => { let n=startDate; const m1=startDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m1){return `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`}; const m2=startDate.match(/^(\d{1,2})[\-.](\d{1,2})[\-.](\d{4})$/); if(m2){return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`}; return startDate; })() : this.alignToQuarterStart(startDate)

    const { end_date, registration_deadline } = this.computeDerivedDates(startISO)

    // Derive month/year from the ISO string directly to avoid timezone shifts
    const [yStr, mStr] = startISO.split('-')
    const year = parseInt(yStr, 10)
    const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1))
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const month = monthNames[monthIndex]

    const groupName = `Bible Bus ${month} ${year} Travelers`

    const result = await runQuery(`
      INSERT INTO bible_groups (name, start_date, end_date, registration_deadline, max_members, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [groupName, startISO, end_date, registration_deadline, 50, 'upcoming'])

    // Get the created group
    const group = await getRow('SELECT * FROM bible_groups WHERE id = ?', [result.id])
    return group
  }

  /**
   * Update group statuses based on current date
   */
  static async updateGroupStatuses(): Promise<void> {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // Update groups that should become active
    await runQuery(`
      UPDATE bible_groups 
      SET status = 'active' 
      WHERE status = 'upcoming' 
      AND start_date >= '2024-01-01'
      AND start_date <= ?
    `, [today])
    
    // Update groups that should close registration
    await runQuery(`
      UPDATE bible_groups 
      SET status = 'closed' 
      WHERE status = 'active' 
      AND start_date >= '2024-01-01'
      AND registration_deadline < ?
    `, [today])
    
    // Update groups that should be completed
    await runQuery(`
      UPDATE bible_groups 
      SET status = 'completed' 
      WHERE status IN ('active', 'closed') 
      AND start_date >= '2024-01-01'
      AND end_date < ?
    `, [today])
  }

  /**
   * Assign a user to the current active group
   */
  static async assignUserToGroup(userId: number): Promise<{ success: boolean; groupId?: number; message: string }> {
    try {
      // Get current active group
      const currentGroup = await this.getCurrentActiveGroup()
      
      if (!currentGroup) {
        // Try to create the next group
        const nextGroup = await this.createNextQuarterlyGroup()
        if (!nextGroup) {
          return { success: false, message: 'No groups are currently accepting registrations' }
        }
        
        // Update the new group to active status
        await runQuery('UPDATE bible_groups SET status = ? WHERE id = ?', ['active', nextGroup.id])
        
        // Assign user to this group
        await this.addUserToGroup(userId, nextGroup.id)
        return { success: true, groupId: nextGroup.id, message: 'Assigned to new group' }
      }
      
      // Check if group is full
      const memberCount = await getRow(`
        SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = 'active'
      `, [currentGroup.id])
      
      if (memberCount.count >= currentGroup.max_members) {
        return { success: false, message: 'Current group is full. Please try again later.' }
      }
      
      // Check if user is already in this group
      const existingMember = await getRow(`
        SELECT * FROM group_members WHERE user_id = ? AND group_id = ? AND status = 'active'
      `, [userId, currentGroup.id])
      
      if (existingMember) {
        return { success: true, groupId: currentGroup.id, message: 'Already a member of this group' }
      }
      
      // Add user to group
      await this.addUserToGroup(userId, currentGroup.id)
      return { success: true, groupId: currentGroup.id, message: 'Successfully assigned to group' }
      
    } catch (error) {
      console.error('Error assigning user to group:', error)
      return { success: false, message: 'Failed to assign user to group' }
    }
  }

  /**
   * Add a user to a specific group
   */
  private static async addUserToGroup(userId: number, groupId: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    
    await runQuery(`
      INSERT INTO group_members (group_id, user_id, join_date, status) 
      VALUES (?, ?, ?, ?)
    `, [groupId, userId, today, 'active'])
  }

  /**
   * Admin: Add a member to a specific group (with capacity and duplicate checks)
   */
  static async addMemberToGroup(groupId: number, userId: number): Promise<{ success: boolean; message: string }> {
    const group = await this.getGroupById(groupId)
    if (!group) return { success: false, message: 'Group not found' }

    // Capacity check
    const memberCount = await getRow(`
      SELECT COUNT(*) as count FROM group_members WHERE group_id = ? AND status = 'active'
    `, [groupId])
    if (memberCount.count >= group.max_members) {
      return { success: false, message: 'Group is full' }
    }

    // Duplicate check
    const existing = await getRow('SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = "active"', [groupId, userId])
    if (existing) return { success: true, message: 'User already in group' }

    await this.addUserToGroup(userId, groupId)
    return { success: true, message: 'User added to group' }
  }

  /**
   * Admin: Remove a member from a group
   */
  static async removeMemberFromGroup(groupId: number, userId: number): Promise<{ success: boolean; message: string }> {
    const existing = await getRow('SELECT id FROM group_members WHERE group_id = ? AND user_id = ? AND status = "active"', [groupId, userId])
    if (!existing) return { success: false, message: 'Membership not found' }

    await runQuery('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, userId])
    return { success: true, message: 'User removed from group' }
  }

  /**
   * Get all groups with their member counts
   */
  static async getAllGroupsWithMemberCounts(): Promise<any[]> {
    return await getRows(`
      SELECT 
        bg.*,
        COUNT(gm.id) as member_count
      FROM bible_groups bg
      LEFT JOIN group_members gm ON bg.id = gm.group_id AND gm.status = 'active'
      GROUP BY bg.id
      ORDER BY 
        CASE WHEN bg.sort_index IS NULL THEN 1 ELSE 0 END ASC,
        bg.sort_index ASC,
        bg.start_date DESC
    `)
  }

  /**
   * Get group details by ID
   */
  static async getGroupById(groupId: number): Promise<BibleGroup | null> {
    return await getRow('SELECT * FROM bible_groups WHERE id = ?', [groupId])
  }

  /**
   * Get all members of a group
   */
  static async getGroupMembers(groupId: number): Promise<any[]> {
    return await getRows(`
      SELECT 
        gm.*,
        u.name,
        u.email,
        u.city
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ? AND gm.status = 'active'
      ORDER BY gm.join_date ASC
    `, [groupId])
  }

  /**
   * Normalize all existing groups to quarterly anchors and recompute derived dates.
   * Also ensure naming matches the anchored month and year.
   */
  static async normalizeAllGroups(): Promise<{ updated: number }> {
    const groups: BibleGroup[] = await getRows('SELECT * FROM bible_groups ORDER BY start_date ASC')
    let updated = 0
    for (const g of groups) {
      const alignedStart = this.alignToQuarterStart(g.start_date)
      const { end_date, registration_deadline } = this.computeDerivedDates(alignedStart)

      // Avoid timezone shifts when computing display month
      const [yStr, mStr] = alignedStart.split('-')
      const year = parseInt(yStr, 10)
      const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1))
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const month = monthNames[monthIndex]
      const expectedName = `Bible Bus ${month} ${year} Travelers`

      const needsUpdate = (
        g.start_date !== alignedStart ||
        g.end_date !== end_date ||
        g.registration_deadline !== registration_deadline ||
        g.name !== expectedName
      )

      if (needsUpdate) {
        await runQuery(
          'UPDATE bible_groups SET name = ?, start_date = ?, end_date = ?, registration_deadline = ? WHERE id = ?',
          [expectedName, alignedStart, end_date, registration_deadline, g.id]
        )
        updated++
      }
    }
    return { updated }
  }

  /**
   * Admin: Create a group for a given start date (will be aligned to quarter anchors)
   */
  static async createGroupWithStart(
    startDate: string,
    maxMembers: number = 50,
    status: BibleGroup['status'] = 'upcoming',
    name?: string
  ): Promise<BibleGroup> {
    const legacy = this.isLegacy(startDate)
    const startISO = legacy ? ((): string => { let n=startDate; const m1=startDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m1){return `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`}; const m2=startDate.match(/^(\d{1,2})[\-.](\d{1,2})[\-.](\d{4})$/); if(m2){return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`}; return startDate; })() : this.alignToQuarterStart(startDate)
    const { end_date, registration_deadline } = this.computeDerivedDates(startISO)

    const [yStr, mStr] = startISO.split('-')
    const year = parseInt(yStr, 10)
    const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1))
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const month = monthNames[monthIndex]
    const groupName = (name && name.trim().length > 0) ? name.trim() : `Bible Bus ${month} ${year} Travelers`

    const result = await runQuery(
      'INSERT INTO bible_groups (name, start_date, end_date, registration_deadline, max_members, status) VALUES (?, ?, ?, ?, ?, ?)',
      [groupName, startISO, end_date, registration_deadline, maxMembers, status]
    )

    const group = await getRow('SELECT * FROM bible_groups WHERE id = ?', [result.id])
    return group
  }

  /**
   * Update a group's editable fields. If start_date changes, align and recompute.
   */
  static async updateGroup(
    id: number,
    updates: Partial<Pick<BibleGroup, 'name' | 'status' | 'start_date' | 'max_members'>>
  ): Promise<BibleGroup | null> {
    const existing: BibleGroup | null = await this.getGroupById(id)
    if (!existing) return null

    let name = existing.name
    let status = existing.status
    let start_date = existing.start_date
    let end_date = existing.end_date
    let registration_deadline = existing.registration_deadline
    let max_members = existing.max_members

    if (typeof updates.name === 'string' && updates.name.trim().length > 0) {
      name = updates.name.trim()
    }

    if (typeof updates.status === 'string') {
      status = updates.status as BibleGroup['status']
    }

    if (typeof updates.max_members === 'number' && updates.max_members > 0) {
      max_members = updates.max_members
    }

    if (typeof updates.start_date === 'string' && updates.start_date.trim().length > 0) {
      const legacy = this.isLegacy(updates.start_date)
      const startISO = legacy ? ((): string => { const s=updates.start_date as string; const m1=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m1){return `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`}; const m2=s.match(/^(\d{1,2})[\-.](\d{1,2})[\-.](\d{4})$/); if(m2){return `${m2[3]}-${m2[1].padStart(2,'0')}-${m2[2].padStart(2,'0')}`}; return s; })() : this.alignToQuarterStart(updates.start_date)
      start_date = startISO
      const derived = this.computeDerivedDates(startISO)
      end_date = derived.end_date
      registration_deadline = derived.registration_deadline

      // Auto-sync name to aligned month/year if caller didn't explicitly change name
      if (!(typeof updates.name === 'string' && updates.name.trim().length > 0)) {
        const [yStr, mStr] = startISO.split('-')
        const year = parseInt(yStr, 10)
        const monthIndex = Math.max(0, Math.min(11, parseInt(mStr, 10) - 1))
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
        const month = monthNames[monthIndex]
        name = `Bible Bus ${month} ${year} Travelers`
      }
    }

    await runQuery(
      `UPDATE bible_groups 
       SET name = ?, status = ?, start_date = ?, end_date = ?, registration_deadline = ?, max_members = ?
       WHERE id = ?`,
      [name, status, start_date, end_date, registration_deadline, max_members, id]
    )

    const updated = await this.getGroupById(id)
    return updated
  }

  /**
   * Set manual sort order. Earlier IDs get lower sort_index.
   */
  static async setSortOrder(groupIdsInOrder: number[]): Promise<void> {
    // Use a transaction-like sequence
    let index = 1
    for (const gid of groupIdsInOrder) {
      await runQuery('UPDATE bible_groups SET sort_index = ? WHERE id = ?', [index, gid])
      index += 1
    }
  }

  /**
   * Clear manual sort order for provided groups (set to NULL)
   */
  static async clearSortOrderFor(groupIds: number[]): Promise<void> {
    for (const gid of groupIds) {
      await runQuery('UPDATE bible_groups SET sort_index = NULL WHERE id = ?', [gid])
    }
  }

  /**
   * Ensure a baseline set of quarterly groups exists when database is empty
   * Creates N past quarters and M future quarters starting from the current quarter.
   */
  static async ensureBaselineGroups(pastQuarters: number = 8, futureQuarters: number = 2): Promise<void> {
    const existing = await getRow('SELECT COUNT(*) as c FROM bible_groups', [])
    if (existing && Number(existing.c) > 0) return

    const today = new Date()
    // Align to current quarter start
    const alignedStart = this.alignToQuarterStart(today.toISOString().split('T')[0])
    const [yStr, mStr] = alignedStart.split('-')
    let year = parseInt(yStr, 10)
    let monthIndex = parseInt(mStr, 10) - 1

    // Go back pastQuarters quarters
    let startYear = year
    let startMonthIndex = monthIndex - (pastQuarters)
    while (startMonthIndex < 0) { startMonthIndex += 12; startYear -= 1 }

    // Create sequence
    const total = pastQuarters + futureQuarters + 1
    let curYear = startYear
    let curMonthIndex = startMonthIndex
    for (let i = 0; i < total; i++) {
      const iso = new Date(Date.UTC(curYear, curMonthIndex, 1)).toISOString().split('T')[0]
      await this.createGroupWithStart(iso, 50, 'upcoming')
      curMonthIndex += 3
      while (curMonthIndex >= 12) { curMonthIndex -= 12; curYear += 1 }
    }

    // Update statuses based on dates
    await this.updateGroupStatuses()
  }
}

import { getRow, runQuery } from '../database/database'

const MILESTONE_EDIT_LOCK_MS = 24 * 60 * 60 * 1000

function parseMilestoneEnteredAt(raw: string | null | undefined): number | null {
  if (!raw || typeof raw !== 'string') return null
  const s = raw.trim()
  const iso = s.includes('T') ? s : s.replace(' ', 'T')
  const ms = new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime()
  return Number.isNaN(ms) ? null : ms
}

export type MilestoneUpsertPayload = {
  milestoneId: number
  milestoneName: string
  dayNumber: number
  totalDays: number
  missingDays: number
  daysCompleted: number
  percentage: number
  grade: string
  completed: boolean
}

/** Shared by authenticated POST /milestone-progress and public POST /milestone-checkin */
export async function upsertMilestoneProgressRow(
  userId: number,
  groupId: number,
  payload: MilestoneUpsertPayload
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const {
    milestoneId,
    milestoneName,
    dayNumber,
    totalDays,
    missingDays,
    daysCompleted,
    percentage,
    grade,
    completed,
  } = payload

  const existing = await getRow(
    `SELECT missing_days_entered_at FROM milestone_progress
     WHERE user_id = ? AND group_id = ? AND milestone_id = ?`,
    [userId, groupId, milestoneId]
  ) as { missing_days_entered_at?: string | null } | undefined

  const enteredMs = parseMilestoneEnteredAt(existing?.missing_days_entered_at ?? undefined)
  if (enteredMs != null && Date.now() - enteredMs >= MILESTONE_EDIT_LOCK_MS) {
    return {
      ok: false,
      status: 403,
      message:
        'This milestone number can no longer be changed (24 hours have passed). Contact an admin if you need a correction.',
    }
  }

  if (existing) {
    await runQuery(
      `
      UPDATE milestone_progress SET
        milestone_name = ?,
        day_number = ?,
        total_days = ?,
        missing_days = ?,
        days_completed = ?,
        percentage = ?,
        grade = ?,
        completed = ?,
        updated_at = CURRENT_TIMESTAMP,
        missing_days_entered_at = COALESCE(missing_days_entered_at, CURRENT_TIMESTAMP)
      WHERE user_id = ? AND group_id = ? AND milestone_id = ?
    `,
      [
        milestoneName,
        dayNumber,
        totalDays,
        missingDays,
        daysCompleted,
        percentage,
        grade,
        completed ? 1 : 0,
        userId,
        groupId,
        milestoneId,
      ]
    )
  } else {
    await runQuery(
      `
      INSERT INTO milestone_progress
      (user_id, group_id, milestone_id, milestone_name, day_number, total_days, missing_days, days_completed, percentage, grade, completed, updated_at, missing_days_entered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [
        userId,
        groupId,
        milestoneId,
        milestoneName,
        dayNumber,
        totalDays,
        missingDays,
        daysCompleted,
        percentage,
        grade,
        completed ? 1 : 0,
      ]
    )
  }

  return { ok: true }
}

/** Matches Dashboard milestone definitions — single source of truth for check-in + API. */
export interface MilestoneDefinition {
  id: number
  name: string
  dayNumber: number
  totalDays: number
}

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  { id: 1, name: 'The Law', dayNumber: 70, totalDays: 70 },
  { id: 2, name: 'The History', dayNumber: 152, totalDays: 82 },
  { id: 3, name: 'The Wisdom', dayNumber: 209, totalDays: 57 },
  { id: 4, name: 'Major Prophet', dayNumber: 262, totalDays: 53 },
  { id: 5, name: 'Minor Prophet', dayNumber: 275, totalDays: 13 },
  { id: 6, name: 'The Gospel', dayNumber: 317, totalDays: 42 },
  { id: 7, name: 'The Epistles', dayNumber: 360, totalDays: 43 },
  { id: 8, name: 'Revelation', dayNumber: 365, totalDays: 5 },
]

export function getMilestoneDefinition(id: number): MilestoneDefinition | undefined {
  return MILESTONE_DEFINITIONS.find((m) => m.id === id)
}

/** Same grading as Dashboard `calculateMilestoneGrade` (percentage vs target day). */
export function computeProgressFromMissingDays(
  def: MilestoneDefinition,
  cumulativeMissingDays: number
): {
  missingDays: number
  daysCompleted: number
  percentage: number
  grade: string
  completed: boolean
} {
  const md = Math.max(0, Math.min(def.dayNumber, Math.floor(cumulativeMissingDays)))
  const daysCompleted = def.dayNumber - md
  const percentage = Math.round((daysCompleted / def.dayNumber) * 100)
  let grade = 'D'
  if (percentage >= 90) grade = 'A'
  else if (percentage >= 80) grade = 'B'
  else if (percentage >= 70) grade = 'C'
  const completed = daysCompleted >= def.dayNumber
  return {
    missingDays: md,
    daysCompleted,
    percentage,
    grade,
    completed,
  }
}

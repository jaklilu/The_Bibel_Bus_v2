import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, CheckCircle, Loader } from 'lucide-react'

type MilestoneMeta = {
  id: number
  name: string
  dayNumber: number
  totalDays: number
}

const MILESTONE_CHECKIN_EMAIL_KEY = 'bibleBusMilestoneCheckinEmail'

function readStoredCheckinEmail(): string {
  try {
    const saved = localStorage.getItem(MILESTONE_CHECKIN_EMAIL_KEY)?.trim()
    if (saved) return saved
    const raw = localStorage.getItem('userData')
    if (!raw) return ''
    const u = JSON.parse(raw) as { email?: string }
    return typeof u.email === 'string' ? u.email.trim() : ''
  } catch {
    return ''
  }
}

function persistCheckinEmail(value: string) {
  const t = value.trim()
  if (t) localStorage.setItem(MILESTONE_CHECKIN_EMAIL_KEY, t)
  else localStorage.removeItem(MILESTONE_CHECKIN_EMAIL_KEY)
}

const MilestoneCheckin = () => {
  const [searchParams] = useSearchParams()
  const mParam = searchParams.get('m')
  const milestoneId = mParam ? parseInt(mParam, 10) : NaN

  const [meta, setMeta] = useState<MilestoneMeta | null>(null)
  const [metaError, setMetaError] = useState('')
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [email, setEmail] = useState('')
  const [missingDays, setMissingDays] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState<{
    milestoneName: string
    percentage: number
    grade: string
    daysCompleted: number
    dayTarget: number
  } | null>(null)

  useEffect(() => {
    const initial = readStoredCheckinEmail()
    if (initial) setEmail(initial)
  }, [])

  useEffect(() => {
    if (!Number.isFinite(milestoneId) || milestoneId < 1 || milestoneId > 8) {
      setMetaError('This link needs a milestone number. Ask your leader for the full link, or add ?m=1 through ?m=8.')
      setLoadingMeta(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      setMetaError('')
      try {
        const res = await fetch(`/api/auth/milestone-checkin-meta?m=${milestoneId}`)
        const data = await res.json()
        if (cancelled) return
        if (data.success && data.data) {
          setMeta(data.data)
        } else {
          setMetaError(data.error?.message || 'Could not load milestone.')
        }
      } catch {
        if (!cancelled) setMetaError('Could not load milestone. Check your connection.')
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [milestoneId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSuccess(null)

    if (!meta) return
    const md = missingDays === '' ? NaN : parseInt(missingDays, 10)
    if (Number.isNaN(md) || md < 0) {
      setFormError('Enter your cumulative missing days (0 or higher).')
      return
    }
    if (md > meta.dayNumber) {
      setFormError(`Missing days cannot be higher than ${meta.dayNumber} for this milestone.`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/auth/milestone-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          milestoneId: meta.id,
          missingDays: md,
        }),
      })
      const data = await res.json()
      if (data.success && data.data) {
        persistCheckinEmail(email)
        setSuccess(data.data)
        setMissingDays('')
      } else {
        setFormError(data.error?.message || 'Could not save. Try again.')
      }
    } catch {
      setFormError('Network error. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 px-4 py-10 pb-16">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 mb-4">
            <Award className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading text-white font-bold">
            Milestone check-in
          </h1>
          <p className="text-purple-200 text-sm mt-2">
            Quick update — same numbers as your dashboard. No login needed.
          </p>
        </motion.div>

        {loadingMeta && (
          <div className="flex justify-center py-12 text-purple-200">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        )}

        {!loadingMeta && metaError && (
          <div className="bg-red-900/40 border border-red-500/40 rounded-2xl p-5 text-red-100 text-sm">
            {metaError}
          </div>
        )}

        {!loadingMeta && meta && !success && (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-600/40 shadow-xl space-y-5"
          >
            <div className="border-b border-purple-600/40 pb-4">
              <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide">Milestone</p>
              <p className="text-white text-xl font-semibold mt-1">{meta.name}</p>
              <p className="text-purple-300 text-sm mt-1">
                Through day {meta.dayNumber} of your reading · segment length {meta.totalDays} days
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-purple-200 mb-1">
                Email (your Bible Bus account)
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => persistCheckinEmail(email)}
                className="w-full px-4 py-3 rounded-xl bg-purple-900/50 border border-purple-600 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="missing" className="block text-sm font-medium text-purple-200 mb-1">
                Cumulative missing days (YouVersion)
              </label>
              <input
                id="missing"
                type="number"
                min={0}
                max={meta.dayNumber}
                required
                inputMode="numeric"
                value={missingDays}
                onChange={(e) => setMissingDays(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-purple-900/50 border border-purple-600 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-amber-400 text-base"
                placeholder="0"
              />
              <p className="text-xs text-purple-400 mt-2">
                Same number you would enter on the Progress tab. Max {meta.dayNumber} for this milestone.
              </p>
            </div>

            {formError && (
              <div className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-semibold text-purple-900 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {submitting ? 'Saving…' : 'Submit score'}
            </button>

            <p className="text-xs text-center text-purple-400">
              Your entry must match your registered email. Edits follow the same 24-hour rule as the dashboard.
            </p>
          </motion.form>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-900/35 border border-green-500/40 rounded-2xl p-6 text-center"
          >
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Saved</h2>
            <p className="text-green-100 text-sm mb-4">
              <strong>{success.milestoneName}</strong> — {success.daysCompleted}/{success.dayTarget} days ·{' '}
              {success.percentage}% · Grade <strong>{success.grade}</strong>
            </p>
            <Link
              to="/dashboard"
              className="inline-block text-amber-300 hover:text-amber-200 text-sm font-medium underline"
            >
              Open full dashboard
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default MilestoneCheckin

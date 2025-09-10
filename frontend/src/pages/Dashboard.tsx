import { useState, useEffect } from 'react'
import Countdown from 'react-countdown'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle,
  BookOpen,
  MessageSquare,
  MessageCircle,
  Download,
  Play,
  Users,
  Award
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'


interface UserData {
  name: string
  email: string
  progress: number
  currentGroup: string
  nextMilestone: string
  trophies_count?: number
}

interface Milestone {
  id: number
  name: string
  dayNumber: number
  totalDays: number
  completed: boolean
  daysCompleted: number
  missingDays: number
  percentage: number
  grade: string
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupName, setGroupName] = useState<string>('Your Group')
  const [inviteLink, setInviteLink] = useState<string>('#')
  const [inviteAvailable, setInviteAvailable] = useState<boolean>(false)
  const [inviteDateLabel, setInviteDateLabel] = useState<string>('')
  const [inviteStartAt, setInviteStartAt] = useState<number | null>(null)
  const [nextGroup, setNextGroup] = useState<{
    id: number
    name: string
    start_date: string
    registration_deadline: string
    member_count: number
    max_members: number
    alreadyJoined: boolean
    canJoin: boolean
  } | null>(null)
  const [joining, setJoining] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [inGroup, setInGroup] = useState<boolean>(true)
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: 1, name: 'The Law', dayNumber: 70, totalDays: 70, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 2, name: 'The History', dayNumber: 152, totalDays: 82, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 3, name: 'The Wisdom', dayNumber: 209, totalDays: 57, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 4, name: 'Major Prophet', dayNumber: 262, totalDays: 53, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 5, name: 'Minor Prophet', dayNumber: 275, totalDays: 13, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 6, name: 'The Gospel', dayNumber: 317, totalDays: 42, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 7, name: 'The Epistles', dayNumber: 360, totalDays: 43, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' },
    { id: 8, name: 'Revelation', dayNumber: 365, totalDays: 5, completed: false, daysCompleted: 0, missingDays: 0, percentage: 0, grade: 'D' }
  ])
  const [recentAwards, setRecentAwards] = useState<Array<{id:number;name:string;completed_at:string}>>([])

  // Calculate milestone percentage and grade
  const calculateMilestoneGrade = (daysCompleted: number, totalDays: number): { percentage: number; grade: string } => {
    const percentage = Math.round((daysCompleted / totalDays) * 100)
    let grade = 'D'
    if (percentage >= 90) grade = 'A'
    else if (percentage >= 80) grade = 'B'
    else if (percentage >= 70) grade = 'C'
    return { percentage, grade }
  }

  // Check if journey is completed (all 8 milestones completed, final milestone C or better)
  const checkJourneyCompletion = (milestones: Milestone[]) => {
    const allCompleted = milestones.every(milestone => milestone.completed)
    const finalMilestone = milestones.find(milestone => milestone.id === 8) // Revelation
    const finalGradeGood = finalMilestone && (finalMilestone.grade === 'A' || finalMilestone.grade === 'B' || finalMilestone.grade === 'C')
    return allCompleted && finalGradeGood
  }

  // Award trophy for journey completion
  const awardJourneyTrophy = async () => {
    const token = localStorage.getItem('userToken')
    if (!token) return

    try {
      const response = await fetch('/api/auth/award-trophy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          type: 'journey_completion',
          description: 'Completed the entire Bible reading journey with C or better grades on all milestones'
        })
      })

      if (response.ok) {
        // Refresh user data to show updated trophy count
        const userResponse = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.success) {
            setUserData(prev => prev ? { ...prev, trophies_count: userData.data.user.trophies_count } : null)
            // Show success message
            alert('🎉 Congratulations! You have completed the entire Bible reading journey and earned a trophy!')
          }
        }
      }
    } catch (error) {
      console.error('Error awarding trophy:', error)
    }
  }

  // Handle missing days input (cumulative from day 1)
  const handleMissingDaysChange = (milestoneId: number, value: string) => {
    // Don't update if input is empty (user is typing)
    if (value === '') {
      setMilestones(prev => prev.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, missingDays: 0, daysCompleted: 0, percentage: 0, grade: 'D', completed: false }
          : milestone
      ))
      return
    }

    const cumulativeMissingDays = parseInt(value) || 0
    setMilestones(prev => {
      const updatedMilestones = prev.map(milestone => {
        if (milestone.id === milestoneId) {
          // Calculate days completed for this milestone based on cumulative missing days
          const daysCompleted = milestone.dayNumber - cumulativeMissingDays
          const { percentage, grade } = calculateMilestoneGrade(daysCompleted, milestone.dayNumber)
          return {
            ...milestone,
            missingDays: cumulativeMissingDays,
            daysCompleted,
            percentage,
            grade,
            completed: daysCompleted >= milestone.dayNumber
          }
        }
        return milestone
      })

      // Check if journey is completed after updating milestones
      if (checkJourneyCompletion(updatedMilestones)) {
        awardJourneyTrophy()
      }

      return updatedMilestones
    })
  }

  useEffect(() => {
    console.log('Dashboard useEffect running') // Debug log
    // Check if user is logged in
    const token = localStorage.getItem('userToken')
    console.log('Dashboard token check:', !!token) // Debug log
    if (!token) {
      console.log('Dashboard: No token, redirecting to login') // Debug log
      navigate('/login')
      return
    }

    // Get user data from localStorage first
    const storedUserData = localStorage.getItem('userData')
    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData)
        setUserData({
          name: userData.name.split(' ')[0], // Extract first name only
          email: userData.email,
          progress: 0, // Default values
          currentGroup: 'Not assigned',
          nextMilestone: 'Keep reading!',
          trophies_count: userData.trophies_count || 0
        })
        setLoading(false)
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        fetchUserData()
      }
    } else {
      // Fallback to API if no stored data
      fetchUserData()
    }

    // Fetch current group links for Quick Actions
    ;(async () => {
      try {
        const res = await fetch('/api/auth/my-group', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        const wa = data?.data?.whatsapp_invite_url
        const plan = data?.data?.youversion_plan_url
        if (data?.data?.name) setGroupName(data.data.name)
        if (plan) setInviteLink(plan)
        // Determine availability based on start date
        const startIso = data?.data?.start_date as string | undefined
        if (startIso) {
          const d = new Date(`${startIso}T00:00:00`)
          const now = new Date()
          const month = d.toLocaleString('en-US', { month: 'long' })
          const day = d.getDate()
          const year = d.getFullYear()
          setInviteDateLabel(`${month} ${day}, ${year}`)
          setInviteAvailable(now >= d)
          setInviteStartAt(d.getTime())
        } else {
          setInviteAvailable(false)
        }
        const waEl = document.getElementById('join-whatsapp-link') as HTMLAnchorElement | null
        const planEl = document.getElementById('youversion-plan-link') as HTMLAnchorElement | null
        if (waEl) waEl.href = wa || waEl.href
        if (planEl) planEl.href = plan || 'https://www.bible.com/app'
      } catch {}
      // Fetch next group summary
      try {
        const ng = await fetch('/api/auth/next-group', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const ngData = await ng.json()
        setNextGroup(ngData?.success ? (ngData.data || null) : null)
      } catch {}
    })()
    // Fetch unread count for badge
    ;(async () => {
      try {
        const token = localStorage.getItem('userToken')
        if (!token) return
        const res = await fetch('/api/auth/my-group-all-messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setInGroup(!!data?.data?.group?.id)
        const msgs: any[] = data?.data?.messages || []
        const lastRead = localStorage.getItem('messageBoardLastRead')
        const count = lastRead
          ? msgs.filter(m => new Date(m.created_at) > new Date(lastRead)).length
          : msgs.length
        setUnreadCount(count)
      } catch {}
    })()
    // Fetch recent awards for the user
    ;(async () => {
      try {
        const token = localStorage.getItem('userToken')
        if (!token) return
        const res = await fetch('/api/auth/my-awards', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        if (data?.success && Array.isArray(data.data)) {
          const top = (data.data as any[]).slice(0, 3).map(r => ({ id: r.id, name: r.name, completed_at: r.completed_at }))
          setRecentAwards(top)
        }
      } catch {}
    })()
  }, [navigate])
  const UnreadBadge = () => {
    if (!unreadCount || unreadCount <= 0) return null
    return (
      <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
        {unreadCount}
      </span>
    )
  }

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('userToken')
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUserData({
          ...data.data,
          name: data.data.name.split(' ')[0] // Extract first name only
        })
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-heading text-white mb-2 text-center">
            Welcome back, {userData?.name || 'Friend'}! 🚌
          </h1>
        </motion.div>

        {/* Messages Card (link to Messages page) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading text-white mb-1 flex items-center">
                <MessageSquare className="h-6 w-6 text-amber-500 mr-2" />
                Message Board
              </h2>
              {!inGroup && (
                <p className="mt-1 text-sm text-amber-300">We'll place you into a group soon. You can still read messages when assigned.</p>
              )}
            </div>
            <Link
              to="/messages"
              className="relative bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg"
            >
              Open
              <UnreadBadge />
            </Link>
          </div>
        </motion.div>

        {/* Accept Your Invitation (moved to top) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }} 
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 shadow-lg hover:shadow-xl transition-all mb-8"
        >
          <div className="flex items-center mb-4">
            <Users className="h-12 w-12 text-orange-500 mr-3" />
            <h3 className="text-lg font-heading text-amber-500 flex-1 text-center -ml-12">Accept Your Invitation</h3>
          </div>
          <p className="text-purple-100 mb-4 text-center">{inviteAvailable ? 'Click to join the reading group' : ''}</p>
          {!inviteAvailable && inviteStartAt && (
            <div className="mb-4 flex justify-center">
              <Countdown
                date={inviteStartAt}
                renderer={({ days, hours, minutes, seconds }) => (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="w-16 sm:w-20 h-16 sm:h-20 bg-purple-700/60 border border-purple-500/50 rounded-lg p-2 text-center flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">{String(days).padStart(2, '0')}</div>
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">Days</div>
                    </div>
                    <div className="w-16 sm:w-20 h-16 sm:h-20 bg-purple-700/60 border border-purple-500/50 rounded-lg p-2 text-center flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">{String(hours).padStart(2, '0')}</div>
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">Hours</div>
                    </div>
                    <div className="w-16 sm:w-20 h-16 sm:h-20 bg-purple-700/60 border border-purple-500/50 rounded-lg p-2 text-center flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">{String(minutes).padStart(2, '0')}</div>
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">Minutes</div>
                    </div>
                    <div className="w-16 sm:w-20 h-16 sm:h-20 relative text-center" style={{ perspective: 800 }}>
                      <AnimatePresence initial={false}>
                        <motion.div
                          key={seconds}
                          initial={{ rotateX: -90, opacity: 0 }}
                          animate={{ rotateX: 0, opacity: 1 }}
                          exit={{ rotateX: 90, opacity: 0 }}
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className="absolute inset-0 bg-purple-700/60 border border-purple-500/50 rounded-lg p-2 flex flex-col justify-center"
                          style={{ transformOrigin: 'top center' }}
                        >
                          <div className="text-xl sm:text-2xl font-bold text-amber-400 tabular-nums">{String(seconds).padStart(2, '0')}</div>
                          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-purple-200">Seconds</div>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              />
            </div>
          )}
          {!inviteAvailable && (
            <p className="text-purple-100 mb-4 text-center">Available on {inviteDateLabel}</p>
          )}
          <a
            href={inviteAvailable ? inviteLink : '#'}
            target={inviteAvailable ? '_blank' : undefined}
            rel={inviteAvailable ? 'noopener noreferrer' : undefined}
            className={`w-full ${inviteAvailable ? 'bg-orange-500 hover:bg-orange-600 cursor-pointer' : 'bg-orange-500/50 cursor-not-allowed pointer-events-none'} text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center`}
          >
            <Users className="h-4 w-4 mr-2" />
            Join Reading Group
          </a>
        </motion.div>

        


        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Awards */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 shadow-lg hover:shadow-xl transition-all order-6">
            <div className="flex items-center mb-4">
              <Award className="h-12 w-12 text-amber-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Awards</h3>
            </div>
            <p className="text-purple-100 text-center">You have earned {userData?.trophies_count || 0} awards</p>
            {recentAwards.length > 0 && (
              <div className="mt-3 space-y-2">
                {recentAwards.map((a, idx) => (
                  <div key={idx} className="text-sm text-purple-100/90 bg-purple-700/40 border border-purple-500/40 rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="truncate">{a.name}</span>
                    <span className="ml-3 text-amber-300 text-xs">{new Date(a.completed_at).toLocaleDateString('en-US')}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => navigate('/awards')} className="w-full bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg transition-colors mt-4">View All</button>
          </motion.div>
          {/* WhatsApp Group */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 shadow-lg hover:shadow-xl transition-all order-1">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-12 w-12 text-green-400 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">{groupName}</h3>
            </div>
            <p className="text-purple-100 mb-4 text-center">Introduce yourself to your WhatsApp group</p>
            <a
              href="#"
              id="join-whatsapp-link"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Join Your WhatsApp Group
            </a>
          </motion.div>

          {/* Introduction Videos */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 shadow-lg hover:shadow-xl transition-all order-4">
            <div className="flex items-center mb-4">
              <Play className="h-12 w-12 text-blue-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500 ml-15">Introduction Video</h3>
            </div>
            <p className="text-purple-100 mb-4 text-center">Continue watching your introduction video</p>
            <div className="space-y-2">
              <a href="https://www.youtube.com/watch?v=uR_zizeVWxY" target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                <span className="mr-2">▷</span>
                Part 1
              </a>
              <a href="https://www.youtube.com/watch?v=TL5uilFhcS4" target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                <span className="mr-2">▷</span>
                Part 2
              </a>
              <a href="https://www.youtube.com/watch?v=Q1kDno5zWS0" target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                <span className="mr-2">▷</span>
                Part 3
              </a>
            </div>
          </motion.div>

          {/* Download YouVersion */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 shadow-lg hover:shadow-xl transition-all order-2">
            <div className="flex items-center mb-4">
              <Download className="h-12 w-12 text-blue-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Download YouVersion</h3>
            </div>
            <p className="text-purple-100 mb-4 text-center">Get the Bible app for your device</p>
            <a
              href="#"
              id="youversion-plan-link"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              Download
            </a>
          </motion.div>

          {/* Instructions */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30 shadow-lg hover:shadow-xl transition-all order-5">
            <div className="flex items-center mb-4">
              <BookOpen className="h-12 w-12 text-blue-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Instructions</h3>
            </div>
            <p className="text-purple-100 mb-4">Get started with YouVersion and customize your experience</p>
            <div className="space-y-2">
              <a
                href="https://photos.google.com/share/AF1QipMQWrNWApLaRlkDfVSFx5PNgsAAbYMsOTPwcTImNJOD2kT52w7WfPqmLTnVf0dV6A/photo/AF1QipOjRpF3E0I6J-A5G2rWKfsx9RQjTZ59b8K6J4-5?key=RHdGa2NFeEowSk5LZ0VWQ0owYV9EUjBDTlBQYWp3"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                How to Start Using YouVersion
              </a>
              <a
                href="https://photos.google.com/share/AF1QipOEWdEdjjdAiLM8CG5Pv0sz6voqhNLt7x9hGAJssC0tnSZNxhCpu7iHMV7kd7uuEg?key=Z3ctZzFPWXN0ZllDbE1zNjJLM1hRNTRUZVhJalB3"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                How to change to different language
              </a>
            </div>
          </motion.div>

        </motion.div>


        {/* Journey Completion Celebration */}
        {checkJourneyCompletion(milestones) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-green-600/20 via-emerald-500/20 to-green-600/20 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-green-500/50 text-center"
          >
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Journey Complete!</h2>
            <p className="text-green-200 text-lg mb-4">
              Congratulations! You have completed the entire Bible reading journey with a strong finish!
            </p>
            <div className="text-2xl font-bold text-amber-400">
              You have earned a trophy! 🏆
            </div>
          </motion.div>
        )}

        {/* Milestone Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-purple-700/30"
        >
          <h2 className="text-2xl font-heading text-white mb-6 flex items-center">
            <Award className="h-6 w-6 text-amber-500 mr-2" />
            Milestone Progress
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`bg-purple-700/50 rounded-xl p-4 border ${
                  milestone.completed 
                    ? 'border-green-500/50 bg-green-900/20' 
                    : 'border-purple-600/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    {milestone.completed && <CheckCircle className="h-5 w-5 text-green-400 inline mr-2" />}
                    {milestone.name}
                  </h3>
                  <span className="text-sm text-purple-300">Day {milestone.dayNumber}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200">Days Completed:</span>
                    <span className="text-white font-medium">
                      {milestone.missingDays === 0 && milestone.daysCompleted === 0 ? 'Enter missing days' : `${milestone.daysCompleted}/${milestone.dayNumber}`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200">Percentage:</span>
                    <span className="text-white font-medium">
                      {milestone.missingDays === 0 && milestone.daysCompleted === 0 ? '--' : `${milestone.percentage}%`}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-200">Grade:</span>
                    <span className={`font-bold ${
                      milestone.missingDays === 0 && milestone.daysCompleted === 0 ? 'text-purple-300' :
                      milestone.grade === 'A' ? 'text-green-400' :
                      milestone.grade === 'B' ? 'text-blue-400' :
                      milestone.grade === 'C' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {milestone.missingDays === 0 && milestone.daysCompleted === 0 ? '--' : milestone.grade}
                    </span>
                  </div>
                  
                  {!milestone.completed && (
                    <div className="mt-3">
                      <label className="block text-xs text-purple-200 mb-1">
                        Cumulative Missing Days (from YouVersion):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={milestone.dayNumber}
                        value={milestone.missingDays || ''}
                        onChange={(e) => handleMissingDaysChange(milestone.id, e.target.value)}
                        className="w-full px-3 py-2 bg-purple-800/50 border border-purple-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        placeholder="Enter cumulative missing days"
                      />
                      <p className="text-xs text-purple-300 mt-1 italic">
                        To tell the truth, God is watching.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Next Group Banner (moved to very end) */}
        {nextGroup && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-purple-800/60 border border-purple-700/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between"
          >
            <div className="text-white mb-3 md:mb-0">
              <div className="font-heading text-amber-400">Next Group: {nextGroup.name}</div>
              <div className="text-sm text-purple-200">
                Starts {new Date(nextGroup.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' '}• Registration closes {new Date(nextGroup.registration_deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs text-purple-300">{nextGroup.member_count}/{nextGroup.max_members} joined</div>
            </div>
            <div className="flex items-center space-x-2">
              {!nextGroup.alreadyJoined && nextGroup.canJoin && (
                <button
                  disabled={joining}
                  onClick={async () => {
                    try {
                      setJoining(true)
                      const token = localStorage.getItem('userToken') || ''
                      const res = await fetch(`/api/auth/groups/${nextGroup.id}/join`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      })
                      const r = await res.json()
                      if (r?.success) {
                        setNextGroup({ ...nextGroup, alreadyJoined: true, member_count: Math.min(nextGroup.member_count + 1, nextGroup.max_members) })
                      }
                    } finally {
                      setJoining(false)
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg"
                >
                  {joining ? 'Joining...' : 'Join Next Group'}
                </button>
              )}
              {nextGroup.alreadyJoined && (
                <>
                  <span className="text-purple-200 text-sm mr-2">Scheduled for next group</span>
                  <button
                    disabled={joining}
                    onClick={async () => {
                      try {
                        setJoining(true)
                        const token = localStorage.getItem('userToken') || ''
                        const res = await fetch(`/api/auth/groups/${nextGroup.id}/cancel`, {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` }
                        })
                        const r = await res.json()
                        if (r?.success) {
                          setNextGroup({ ...nextGroup, alreadyJoined: false, member_count: Math.max(nextGroup.member_count - 1, 0) })
                        }
                      } finally {
                        setJoining(false)
                      }
                    }}
                    className="bg-purple-700 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg border border-purple-500"
                  >
                    Cancel
                  </button>
                </>
              )}
              {!nextGroup.canJoin && !nextGroup.alreadyJoined && (
                <span className="text-purple-300 text-sm">Registration closed or group full</span>
              )}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default Dashboard

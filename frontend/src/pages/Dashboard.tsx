import { useState, useEffect } from 'react'
import Countdown from 'react-countdown'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LogOut,
  CheckCircle,
  Clock,
  Target,
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

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('userToken')
    if (!token) {
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
        const msgs: any[] = data?.data?.messages || []
        const lastRead = localStorage.getItem('messageBoardLastRead')
        const count = lastRead
          ? msgs.filter(m => new Date(m.created_at) > new Date(lastRead)).length
          : msgs.length
        setUnreadCount(count)
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

  const handleLogout = () => {
    localStorage.removeItem('userToken')
    navigate('/')
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-4xl font-heading text-white mb-2">
              Welcome back, {userData?.name || 'Friend'}! 🚌
            </h1>
            <p className="text-xl text-amber-500">
              Your Bible reading journey continues...
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-800 hover:bg-red-900 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </button>
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
              <p className="text-purple-200">Stay connected with your Bible reading group</p>
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

        {/* Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-purple-700/30"
        >
          <h2 className="text-2xl font-heading text-white mb-4 flex items-center">
            <Target className="h-6 w-6 text-amber-500 mr-2" />
            Reading Progress
          </h2>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-white mb-2">
              <span>Progress</span>
              <span>{userData?.progress || 0}%</span>
            </div>
            <div className="w-full bg-purple-700 rounded-full h-3">
              <div 
                className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${userData?.progress || 0}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-white">
              <Clock className="h-4 w-4 text-amber-500 mr-2" />
              <span>Current Group: {userData?.currentGroup || 'Not assigned'}</span>
            </div>
            <div className="flex items-center text-white">
              <CheckCircle className="h-4 w-4 text-amber-500 mr-2" />
              <span>Next Milestone: {userData?.nextMilestone || 'Keep reading!'}</span>
            </div>
          </div>
        </motion.div>

        

        {/* Join Next Group Banner */}
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

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Awards */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all order-6">
            <div className="flex items-center mb-4">
              <Award className="h-12 w-12 text-amber-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Awards</h3>
            </div>
            <p className="text-purple-100 mb-4">You have earned {userData?.trophies_count || 0} awards</p>
            <button onClick={() => navigate('/awards')} className="w-full bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg transition-colors">View All</button>
          </motion.div>
          {/* WhatsApp Group */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all order-1">
            <div className="flex items-center mb-4">
              <MessageSquare className="h-12 w-12 text-green-400 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">{groupName}</h3>
            </div>
            <p className="text-purple-100 mb-4">Connect with fellow Bible Bus travelers</p>
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
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all order-4">
            <div className="flex items-center mb-4">
              <Play className="h-12 w-12 text-blue-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Introduction Video</h3>
            </div>
            <p className="text-purple-100 mb-4">Continue watching your introduction video</p>
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
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all order-2">
            <div className="flex items-center mb-4">
              <Download className="h-12 w-12 text-blue-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Download YouVersion</h3>
            </div>
            <p className="text-purple-100 mb-4">Get the Bible app for your device</p>
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
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all order-5">
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

          {/* Accept Your Invitation */}
          <motion.div whileHover={{ scale: 1.05 }} className="bg-purple-600 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all order-3">
            <div className="flex items-center mb-4">
              <Users className="h-12 w-12 text-orange-500 mr-3" />
              <h3 className="text-lg font-heading text-amber-500">Accept Your Invitation</h3>
            </div>
            <p className="text-purple-100 mb-4 text-center">{inviteAvailable ? 'Click to join the reading group' : `Available on ${inviteDateLabel}`}</p>
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
        </motion.div>

        
      </div>
    </div>
  )
}

export default Dashboard

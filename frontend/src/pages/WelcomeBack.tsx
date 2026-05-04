import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, BookOpen, Award, MessageSquare, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const WelcomeBack = () => {
  const navigate = useNavigate()
  const [groupStatus, setGroupStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('userToken')
    if (!token) {
      const stored = localStorage.getItem('groupStatus')
      if (stored) {
        try {
          setGroupStatus(JSON.parse(stored))
        } catch (err) {
          console.error('Error parsing group status:', err)
        }
      }
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const response = await fetch('/api/auth/group-status', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        if (data.success && data.data?.groupStatus) {
          setGroupStatus(data.data.groupStatus)
          localStorage.setItem('groupStatus', JSON.stringify(data.data.groupStatus))
        } else {
          const stored = localStorage.getItem('groupStatus')
          if (stored) {
            try {
              setGroupStatus(JSON.parse(stored))
            } catch {
              /* ignore */
            }
          }
        }
      } catch (err) {
        console.error('Error refreshing group status:', err)
        const stored = localStorage.getItem('groupStatus')
        if (stored) {
          try {
            setGroupStatus(JSON.parse(stored))
          } catch {
            /* ignore */
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const refreshGroupStatusInStorage = async (token: string) => {
    try {
      const res = await fetch('/api/auth/group-status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && data.data?.groupStatus) {
        const gs = data.data.groupStatus
        setGroupStatus(gs)
        localStorage.setItem('groupStatus', JSON.stringify(gs))
      }
    } catch (e) {
      console.error('Failed to refresh group status', e)
    }
  }

  const handleJoinCurrentGroup = async () => {
    setJoining(true)
    setJoinError('')

    try {
      const token = localStorage.getItem('userToken')
      if (!token) return
      const response = await fetch('/api/auth/join-current-group', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        await refreshGroupStatusInStorage(token)
        navigate('/dashboard')
      } else {
        setJoinError(data.error?.message || 'Failed to join group')
      }
    } catch (err) {
      setJoinError('Failed to join group. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const handleJoinNextGroup = async (groupId: number) => {
    setJoining(true)
    setJoinError('')

    try {
      const token = localStorage.getItem('userToken')
      if (!token) return
      const response = await fetch(`/api/auth/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.success) {
        await refreshGroupStatusInStorage(token)
        navigate('/dashboard')
      } else {
        setJoinError(data.error?.message || 'Failed to join group')
      }
    } catch (err) {
      setJoinError('Failed to join group. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Welcome Back!
          </h1>
          <p className="text-lg text-purple-200">
            Choose how you'd like to continue your journey
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Browse Options */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-amber-400" />
              <span>Browse & Explore</span>
            </h2>
            <p className="text-purple-200 mb-4">
              View your achievements, read reflections, and explore the site.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/trophies')}
                className="w-full bg-purple-700/50 hover:bg-purple-700/70 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-between"
              >
                <span className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>View Trophies</span>
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/reflections')}
                className="w-full bg-purple-700/50 hover:bg-purple-700/70 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-between"
              >
                <span className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Read Reflections</span>
                </span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-between"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>

          {/* Join Group Options */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-700/30"
          >
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Users className="h-6 w-6 text-green-400" />
              <span>Join a Group</span>
            </h2>
            <p className="text-purple-200 mb-4">
              Join a reading group to start or continue your Bible journey.
            </p>

            {groupStatus?.registrationClosedForGroup && groupStatus?.canJoinNext && (
              <div className="bg-amber-500/15 border border-amber-500/40 rounded-lg p-4 mb-4 text-left">
                <p className="text-amber-100 text-sm leading-relaxed">
                  Registration for{' '}
                  <strong className="text-white">{groupStatus.registrationClosedForGroup.name}</strong>{' '}
                  has closed. Join the next Bible Bus group below.
                </p>
              </div>
            )}

            {groupStatus?.joinOptionsMerged && groupStatus?.canJoinNext && !groupStatus?.registrationClosedForGroup && (
              <div className="bg-purple-700/40 border border-purple-500/30 rounded-lg p-4 mb-4 text-left">
                <p className="text-purple-100 text-sm leading-relaxed">
                  Use the button below to register for the next Bible Bus group that is open for signup.
                </p>
              </div>
            )}

            {joinError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-200 text-sm">{joinError}</p>
              </div>
            )}

            <div className="space-y-3">
              {groupStatus?.canJoinCurrent && groupStatus?.currentGroup && (
                <button
                  onClick={handleJoinCurrentGroup}
                  disabled={joining}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Join Current Group</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}

              {groupStatus?.canJoinNext && groupStatus?.nextGroup && (
                <button
                  onClick={() => handleJoinNextGroup(groupStatus.nextGroup.id)}
                  disabled={joining}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Join Next Group ({groupStatus.nextGroup.name})</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}

              {!groupStatus?.canJoinCurrent && !groupStatus?.canJoinNext && (
                <div className="bg-purple-700/50 rounded-lg p-4 text-center">
                  <p className="text-purple-300 text-sm">
                    No groups are currently accepting registrations. Check back later!
                  </p>
                </div>
              )}

              {groupStatus?.userGroups && groupStatus.userGroups.length > 0 && (
                <div className="bg-purple-700/50 rounded-lg p-4 mt-4">
                  <p className="text-purple-300 text-sm mb-2">You're currently in:</p>
                  <ul className="space-y-1">
                    {groupStatus.userGroups.map((group: any) => (
                      <li key={group.id} className="text-white text-sm">
                        • {group.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeBack


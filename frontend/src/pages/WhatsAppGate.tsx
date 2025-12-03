import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, CheckCircle, ArrowRight, Loader } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const WhatsAppGate = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [whatsappJoined, setWhatsappJoined] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  
  // Get WhatsApp info from location state or URL params
  const whatsappInfo = location.state?.whatsappInfo || null
  const groupInfo = location.state?.groupInfo || null
  
  const userId = whatsappInfo?.userId
  const groupId = whatsappInfo?.groupId
  const whatsappUrl = whatsappInfo?.whatsappUrl

  // Check WhatsApp join status periodically
  useEffect(() => {
    if (!userId || !groupId || whatsappJoined) return

    const checkStatus = async () => {
      setChecking(true)
      try {
        const response = await fetch(`/api/auth/check-whatsapp-status/${userId}/${groupId}`)
        const data = await response.json()
        
        if (data.success && data.data.whatsapp_joined) {
          setWhatsappJoined(true)
          setChecking(false)
          // Auto-redirect after 2 seconds
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        } else {
          setChecking(false)
        }
      } catch (err) {
        console.error('Error checking WhatsApp status:', err)
        setChecking(false)
      }
    }

    // Check immediately
    checkStatus()

    // Then check every 3 seconds
    const interval = setInterval(checkStatus, 3000)

    return () => clearInterval(interval)
  }, [userId, groupId, whatsappJoined, navigate])

  const handleJoinClick = () => {
    if (whatsappUrl) {
      // Open WhatsApp in new tab
      window.open(whatsappUrl, '_blank')
    } else {
      setError('WhatsApp link not available. Please contact support.')
    }
  }

  const handleContinue = () => {
    if (whatsappJoined) {
      navigate('/dashboard')
    }
  }

  if (!whatsappInfo || !whatsappUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 text-center max-w-md">
          <p className="text-red-200">WhatsApp information not found. Redirecting to dashboard...</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Complete Your Registration
          </h1>
          <p className="text-lg text-purple-200">
            Join your WhatsApp group to stay connected
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
        >
          {whatsappJoined ? (
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mb-6"
              >
                <div className="bg-green-500/20 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
                  <CheckCircle className="h-12 w-12 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-green-400 mb-2">Success!</h2>
                <p className="text-green-200">
                  You've joined the WhatsApp group. Redirecting to dashboard...
                </p>
              </motion.div>
              <button
                onClick={handleContinue}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
              >
                <span>Continue to Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="bg-green-500/20 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
                  <MessageCircle className="h-12 w-12 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Join Your WhatsApp Group
                </h2>
                <p className="text-purple-200 mb-2">
                  <strong className="text-amber-400">Required:</strong> You must join your group's WhatsApp chat to continue.
                </p>
                <p className="text-purple-300 text-sm">
                  This is where you'll receive daily updates and communicate with your group.
                </p>
              </div>

              {groupInfo && (
                <div className="bg-purple-700/50 rounded-lg p-4 mb-6">
                  <h3 className="text-md font-semibold text-amber-500 mb-2">Your Group</h3>
                  <div className="space-y-1 text-white text-sm">
                    <p><span className="text-purple-300">Group:</span> {groupInfo.name}</p>
                    <p><span className="text-purple-300">Start Date:</span> {new Date(groupInfo.start_date).toLocaleDateString()}</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-6">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={handleJoinClick}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 text-lg shadow-lg"
                >
                  <MessageCircle className="h-6 w-6" />
                  <span>Join WhatsApp Group</span>
                </button>

                {checking && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-purple-300">
                      <Loader className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Checking if you've joined...</span>
                    </div>
                  </div>
                )}

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-amber-200 text-sm text-center">
                    <strong>Important:</strong> After clicking the button above, make sure to join the WhatsApp group. 
                    The system will automatically detect when you've joined.
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default WhatsAppGate


import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, User, Mail, MapPin, Users, Home, ArrowRight, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Register = () => {
  const API_BASE = import.meta.env.VITE_API_BASE
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    city: '',
    mailingAddress: '',
    referral: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [currentGroup, setCurrentGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      // Register the user
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          city: formData.city,
          mailing_address: formData.mailingAddress,
          referral: formData.referral
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setGroupInfo(data.data.group)
        // Redirect to dashboard after successful registration
        setTimeout(() => {
          navigate('/dashboard')
        }, 5000)
      } else {
        setError(data.error?.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError('Registration failed. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Fetch current active group from API
  useEffect(() => {
    const fetchCurrentGroup = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/admin/groups/current/active`)
        const data = await response.json()
        
        if (data.success && data.data) {
          setCurrentGroup(data.data)
        } else {
          // Fallback to hardcoded logic if no active group
          const fallbackGroup = {
            name: 'Bible Bus October 2025 Travelers',
            start_date: '2025-10-01',
            registration_deadline: '2025-10-17'
          }
          setCurrentGroup(fallbackGroup)
        }
      } catch (error) {
        console.error('Error fetching current group:', error)
        // Fallback to hardcoded logic
        const fallbackGroup = {
          name: 'Bible Bus October 2025 Travelers',
          start_date: '2025-10-01',
          registration_deadline: '2025-10-17'
        }
        setCurrentGroup(fallbackGroup)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentGroup()
  }, [])

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Register for Next Group</h1>
          <p className="text-xl text-purple-200">Join The Bible Bus and start your 365-day Bible reading journey</p>
        </motion.div>

        {/* Group Information Card */}
        {loading ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30 mb-8"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-purple-200">Loading group information...</p>
            </div>
          </motion.div>
        ) : currentGroup ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30 mb-8"
          >
          <div className="flex items-center space-x-3 mb-4">
            <Calendar className="h-6 w-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Group Details</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 text-white">
            <div>
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                {currentGroup?.name || 'Loading...'}
              </h3>
              <p className="text-purple-200">365-day Bible reading journey</p>
              <p className="text-purple-200">Starts: {currentGroup ? new Date(currentGroup.start_date).toLocaleDateString() : 'Loading...'}</p>
              <p className="text-purple-200">Complete by: {currentGroup ? new Date(new Date(currentGroup.start_date).getTime() + (365 * 24 * 60 * 60 * 1000)).toLocaleDateString() : 'Loading...'}</p>
            </div>
            
            <div></div>
          </div>
        </motion.div>
        ) : null}

        {/* Registration Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Registration Form</h2>
          
          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center space-x-2 mb-6"
            >
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-200 text-sm">{error}</span>
            </motion.div>
          )}

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 mb-6"
            >
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">Registration Successful!</h3>
                <p className="text-green-200 text-sm mb-4">
                  Welcome to The Bible Bus! You're now registered and assigned to a group.
                </p>
              </div>
              
              {groupInfo && (
                <div className="bg-purple-800/50 rounded-lg p-4 mb-4 text-left">
                  <h4 className="text-md font-semibold text-amber-500 mb-2">Group Assignment</h4>
                  <div className="space-y-1 text-white text-sm">
                    <p><span className="text-purple-300">Group:</span> {groupInfo.name}</p>
                    <p><span className="text-purple-300">Start Date:</span> {new Date(groupInfo.start_date).toLocaleDateString()}</p>
                    <p><span className="text-purple-300">Registration Deadline:</span> {new Date(groupInfo.registration_deadline).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <span className="text-green-300 text-sm">
                  Redirecting to dashboard in 5 seconds...
                </span>
              </div>
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-amber-500 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-amber-500 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-amber-500 mb-2">
                City You Live In *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  id="city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Your city"
                />
              </div>
            </div>

            {/* Referral */}
            <div>
              <label htmlFor="referral" className="block text-sm font-medium text-amber-500 mb-2">
                Who Referred You?
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  id="referral"
                  name="referral"
                  value={formData.referral}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Name of person who referred you"
                />
              </div>
              <p className="text-sm text-purple-300 mt-1">
                Help us thank the person who introduced you to Bible Bus
              </p>
            </div>

            {/* Mailing Address */}
            <div>
              <label htmlFor="mailingAddress" className="block text-sm font-medium text-amber-500 mb-2">
                Mailing Address *
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  id="mailingAddress"
                  name="mailingAddress"
                  required
                  value={formData.mailingAddress}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Full address for reward delivery"
                />
              </div>
              <p className="text-sm text-purple-300 mt-1">
                We'll send your completion reward to this address
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Processing...</span>
              ) : (
                <>
                  <span>Register and Join</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default Register

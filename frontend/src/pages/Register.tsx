import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, MapPin, Users, Home, ArrowRight, AlertCircle, MessageCircle, CheckCircle, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const Register = () => {
  const navigate = useNavigate()
  
  // Flow states: 'whatsapp' | 'email' | 'form' | 'returning'
  const [currentStep, setCurrentStep] = useState<'whatsapp' | 'email' | 'form' | 'returning'>('whatsapp')
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [loadingGroup, setLoadingGroup] = useState(true)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [existingUser, setExistingUser] = useState<any>(null)
  
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

  // Fetch current group's WhatsApp URL
  useEffect(() => {
    const fetchCurrentGroup = async () => {
      try {
        const response = await fetch('/api/auth/public/current-group')
        const data = await response.json()
        if (data.success && data.data) {
          setWhatsappUrl(data.data.whatsapp_invite_url || null)
        }
      } catch (err) {
        console.error('Error fetching current group:', err)
      } finally {
        setLoadingGroup(false)
      }
    }
    fetchCurrentGroup()
  }, [])

  // Handle WhatsApp join click
  const handleJoinWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank')
      // After opening WhatsApp, allow them to proceed
      // They can confirm they've joined
    } else {
      setError('WhatsApp group link is not available. Please contact the administrator.')
    }
  }

  // Handle WhatsApp confirmation
  const handleWhatsAppConfirmed = () => {
    setCurrentStep('email')
    setError('')
  }

  // Check if email exists when user enters email
  const handleEmailBlur = async () => {
    const email = formData.email.trim()
    if (!email || !email.includes('@')) return

    setCheckingEmail(true)
    setError('')
    
    try {
      const response = await fetch(`/api/auth/check-email/${encodeURIComponent(email)}`)
      const data = await response.json()
      
      if (data.success && data.exists) {
        // User exists - pre-populate and show returning user view
        setExistingUser(data.data)
        setFormData({
          fullName: data.data.name || '',
          email: data.data.email || '',
          city: data.data.city || '',
          mailingAddress: data.data.mailing_address || '',
          referral: data.data.referral || ''
        })
        setCurrentStep('returning')
      } else {
        // New user - show registration form
        setCurrentStep('form')
      }
    } catch (err) {
      console.error('Error checking email:', err)
      setError('Failed to check email. Please try again.')
    } finally {
      setCheckingEmail(false)
    }
  }

  // Handle returning user login (email-only)
  const handleReturningUserLogin = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login-email-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Store token and user data
        localStorage.setItem('userToken', data.data.token)
        localStorage.setItem('userData', JSON.stringify(data.data.user))
        
        if (data.data.groupStatus) {
          localStorage.setItem('groupStatus', JSON.stringify(data.data.groupStatus))
        }
        
        // Route based on group status
        if (data.data.groupStatus?.inCurrentGroup) {
          navigate('/dashboard')
        } else if (data.data.groupStatus?.userGroups && data.data.groupStatus.userGroups.length > 0) {
          navigate('/dashboard')
        } else {
          navigate('/welcome-back')
        }
      } else {
        setError(data.error?.message || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError('Login failed. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle new user registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          city: formData.city.trim(),
          mailing_address: formData.mailingAddress.trim(),
          referral: formData.referral.trim() || null
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setGroupInfo(data.data?.group)
        
        // Store token if provided
        if (data.data?.token) {
          localStorage.setItem('userToken', data.data.token)
          localStorage.setItem('userData', JSON.stringify(data.data.user))
        }
        
        setTimeout(() => {
          navigate('/dashboard')
        }, 2000)
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

  // STEP 1: WhatsApp Gate
  if (currentStep === 'whatsapp') {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Welcome to The Bible Bus! 🚌
            </h1>
            <p className="text-lg text-purple-200">
              Step 1: Join our WhatsApp group
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <div className="text-center mb-8">
              <div className="bg-green-500/20 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
                <MessageCircle className="h-12 w-12 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Join Our WhatsApp Group
              </h2>
              <p className="text-purple-200 mb-2">
                To continue with registration, you must first join our WhatsApp group.
              </p>
              <p className="text-purple-300 text-sm">
                Click the button below to open WhatsApp and join the group.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center space-x-2"
              >
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-200 text-sm">{error}</span>
              </motion.div>
            )}

            {loadingGroup ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-purple-200">Loading...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleJoinWhatsApp}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 text-lg shadow-lg"
                >
                  <MessageCircle className="h-6 w-6" />
                  <span>Join WhatsApp Group</span>
                </button>

                <button
                  onClick={handleWhatsAppConfirmed}
                  className="w-full bg-purple-700 hover:bg-purple-600 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>I've Joined - Continue</span>
                </button>
              </div>
            )}

            {!whatsappUrl && !loadingGroup && (
              <div className="mt-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-200 text-sm text-center">
                  WhatsApp group link is not available. Please contact the administrator.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  // STEP 2: Email Entry
  if (currentStep === 'email') {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Step 2: Enter Your Email
            </h1>
            <p className="text-lg text-purple-200">
              We'll check if you're a returning member
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <div className="space-y-6">
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
                    onBlur={handleEmailBlur}
                    className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>
                {checkingEmail && (
                  <div className="mt-2 flex items-center space-x-2 text-purple-300 text-sm">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Checking...</span>
                  </div>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center space-x-2"
                >
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-200 text-sm">{error}</span>
                </motion.div>
              )}

              <button
                onClick={() => {
                  if (formData.email.trim()) {
                    handleEmailBlur()
                  }
                }}
                disabled={!formData.email.trim() || checkingEmail}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  // STEP 3A: Returning User (Pre-populated)
  if (currentStep === 'returning') {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Welcome Back, {existingUser?.name}! 👋
            </h1>
            <p className="text-purple-200">We found your account. Review your information below.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
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

            <div className="space-y-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-200 text-sm">
                  ✓ Your information has been pre-filled. You can update any fields if needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-500 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  name="fullName"
                  className="w-full px-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-500 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  name="email"
                  className="w-full px-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-500 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  name="city"
                  className="w-full px-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-500 mb-2">Mailing Address</label>
                <input
                  type="text"
                  value={formData.mailingAddress}
                  onChange={handleChange}
                  name="mailingAddress"
                  className="w-full px-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white"
                />
              </div>
            </div>

            <button
              onClick={handleReturningUserLogin}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  // STEP 3B: New User Registration Form
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Complete Your Registration</h1>
          <p className="text-purple-200">Fill out the form below to join The Bible Bus</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
        >
          <h2 className="text-2xl font-bold text-white mb-6">Registration Form</h2>
          
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
                  Redirecting to dashboard...
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

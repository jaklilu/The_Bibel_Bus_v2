import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, User, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const ForgotAccount = () => {
  const [recoveryType, setRecoveryType] = useState<'name' | 'email' | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/auth/forgot-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recoveryType
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setSuccessMessage(data.message)
        setFormData({ email: '', name: '' })
      } else {
        setError(data.error?.message || 'Failed to recover account. Please try again.')
      }
    } catch (err) {
      setError('Failed to recover account. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 mt-8"
        >
          <h1 className="text-3xl font-heading text-white mb-2">Account Recovery</h1>
          <p className="text-lg text-amber-500">Recover your login information</p>
        </motion.div>

        {/* Recovery Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
        >
          {!recoveryType ? (
            // Step 1: Choose recovery type
            <div className="space-y-4">
              <p className="text-purple-200 text-center mb-6">
                What information do you need to recover?
              </p>
              
              <button
                onClick={() => setRecoveryType('name')}
                className="w-full bg-purple-700/50 hover:bg-purple-700/70 border border-purple-600 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <User className="h-6 w-6 text-amber-400" />
                  <div>
                    <div className="text-white font-semibold">I forgot my name</div>
                    <div className="text-purple-300 text-sm">I remember my email address</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setRecoveryType('email')}
                className="w-full bg-purple-700/50 hover:bg-purple-700/70 border border-purple-600 rounded-lg p-4 text-left transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Mail className="h-6 w-6 text-amber-400" />
                  <div>
                    <div className="text-white font-semibold">I forgot my email</div>
                    <div className="text-purple-300 text-sm">I remember my name</div>
                  </div>
                </div>
              </button>

              <div className="pt-4 text-center">
                <Link 
                  to="/login" 
                  className="text-purple-300 hover:text-purple-200 text-sm inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            // Step 2: Enter information
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Success Message */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 flex items-start space-x-3"
                >
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-green-200 font-semibold mb-1">Success!</div>
                    <div className="text-green-200 text-sm">{successMessage}</div>
                    <div className="text-green-300 text-xs mt-2">
                      Please check your email for your account information.
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
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

              {/* Recovery Type Info */}
              <div className="bg-purple-700/30 rounded-lg p-3 text-center">
                <p className="text-purple-200 text-sm">
                  {recoveryType === 'name' 
                    ? 'Enter your email address to receive your name'
                    : 'Enter your name to receive your email address'}
                </p>
              </div>

              {/* Input Field */}
              {recoveryType === 'name' ? (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
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
                      className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <p className="text-purple-300 text-xs mt-1">
                    If multiple accounts match, information will be sent to all matching accounts.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Sending...</span>
                ) : success ? (
                  <span>Information Sent ✓</span>
                ) : (
                  <span>Send Recovery Information</span>
                )}
              </button>

              {/* Back Button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryType(null)
                    setFormData({ email: '', name: '' })
                    setError('')
                    setSuccess(false)
                  }}
                  className="text-purple-300 hover:text-purple-200 text-sm inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Choose Different Option</span>
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center pt-4 border-t border-purple-700/50">
                <Link 
                  to="/login" 
                  className="text-purple-300 hover:text-purple-200 text-sm"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default ForgotAccount


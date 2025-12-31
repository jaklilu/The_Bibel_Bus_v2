import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, MapPin, Users, Home, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

const RegisterExisting = () => {
  const [searchParams] = useSearchParams()
  const groupIdentifier = searchParams.get('group') || ''

  // Map group identifiers to full group names
  // Note: Database may have "The" prefix, but we'll try both formats
  const groupMap: { [key: string]: string } = {
    'jan-2025': 'Bible Bus January 2025 Travelers',
    'april-2025': 'Bible Bus April 2025 Travelers',
    'july-2025': 'Bible Bus July 2025 Travelers',
    'october-2025': 'Bible Bus October 2025 Travelers'
  }

  const fullGroupName = groupMap[groupIdentifier] || groupIdentifier

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    city: '',
    mailingAddress: '',
    referral: '',
    phone: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Validate group identifier
    if (!groupIdentifier || !groupMap[groupIdentifier]) {
      setError('Invalid registration link. Please use the correct link provided by your group administrator.')
    }
  }, [groupIdentifier])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!groupMap[groupIdentifier]) {
      setError('Invalid group identifier')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          city: formData.city.trim(),
          mailing_address: formData.mailingAddress.trim(),
          referral: formData.referral.trim(),
          phone: formData.phone.trim() || null,
          group_identifier: fullGroupName
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.error?.message || 'Registration failed. Please try again.')
      }
    } catch (err) {
      setError('Registration failed. Please check your connection and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!groupIdentifier || !groupMap[groupIdentifier]) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/30 rounded-2xl p-8 text-center"
          >
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Invalid Registration Link</h2>
            <p className="text-red-200">Please use the correct registration link provided by your group administrator.</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <div className="text-center">
              <div className="bg-green-500/20 rounded-full p-4 w-20 h-20 mx-auto flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Registration Submitted!</h2>
              <p className="text-purple-200 mb-2">
                Thank you for registering for <strong className="text-amber-400">{fullGroupName}</strong>.
              </p>
              <p className="text-purple-300 text-sm">
                Your registration is pending approval. Once approved, you'll be added to the group and can access your dashboard.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
            Register for {fullGroupName}
          </h1>
          <p className="text-purple-200">Fill out the form below to register for your group</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
        >
          <div className="mb-6 bg-purple-700/30 border border-purple-600/30 rounded-lg p-4">
            <p className="text-purple-200 text-sm">
              <strong className="text-white">Group:</strong> {fullGroupName}
            </p>
            <p className="text-purple-300 text-xs mt-2">
              Your registration will be reviewed and you'll be added to the group once approved.
            </p>
          </div>

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
                Who Referred You? *
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                <input
                  type="text"
                  id="referral"
                  name="referral"
                  required
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

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-amber-500 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full pl-4 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Your phone number"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <span>Submit Registration</span>
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

export default RegisterExisting


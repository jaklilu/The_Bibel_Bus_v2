import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

const Login = () => {
  const navigate = useNavigate()
  const emailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedCredentials, setSavedCredentials] = useState<{email: string, name: string}[]>([])
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)

  // Load saved credentials on component mount
  useEffect(() => {
    const saved = localStorage.getItem('savedCredentials')
    if (saved) {
      try {
        setSavedCredentials(JSON.parse(saved))
      } catch (error) {
        console.error('Error parsing saved credentials:', error)
      }
    }
  }, [])

  // Save credentials after successful login
  const saveCredentials = (email: string, name: string) => {
    const newCredential = { email, name }
    const updatedCredentials = [
      newCredential,
      ...savedCredentials.filter(cred => cred.email.toLowerCase() !== email.toLowerCase())
    ].slice(0, 5) // Keep only last 5 credentials
    
    setSavedCredentials(updatedCredentials)
    localStorage.setItem('savedCredentials', JSON.stringify(updatedCredentials))
  }

  // Get filtered suggestions
  const getEmailSuggestions = () => {
    if (!formData.email) return []
    return savedCredentials
      .filter(cred => cred.email.toLowerCase().includes(formData.email.toLowerCase()))
      .slice(0, 3)
  }

  const getNameSuggestions = () => {
    if (!formData.name) return []
    return savedCredentials
      .filter(cred => cred.name.toLowerCase().includes(formData.name.toLowerCase()))
      .slice(0, 3)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      })

      const data = await response.json()
      
      

      if (data.success) {
        // Save credentials for future use
        saveCredentials(formData.email, formData.name)
        
        // Store token based on user role
        if (data.data.user.role === 'admin') {
          localStorage.setItem('adminToken', data.data.token)
          navigate('/admin')
        } else {
          localStorage.setItem('userToken', data.data.token)
          localStorage.setItem('userData', JSON.stringify(data.data.user))
          navigate('/dashboard')
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    // Show suggestions when typing
    if (name === 'email') {
      setShowEmailSuggestions(value.length > 0)
    } else if (name === 'name') {
      setShowNameSuggestions(value.length > 0)
    }
  }

  // Handle suggestion selection
  const selectSuggestion = (email: string, name: string) => {
    setFormData({ email, name })
    setShowEmailSuggestions(false)
    setShowNameSuggestions(false)
    try {
      emailRef.current?.blur()
      nameRef.current?.blur()
    } catch {}
  }



  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-heading text-white mb-2">Welcome Back</h1>
          <p className="text-lg text-amber-500">Sign in to continue your Bible journey</p>
        </motion.div>

        {/* Login Form */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Email Address */}
              <div className="relative">
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                  <input
                    ref={emailRef}
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => { setShowEmailSuggestions(formData.email.length > 0); setShowNameSuggestions(false) }}
                    onBlur={() => setShowEmailSuggestions(false)}
                    className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="your.email@example.com"
                  />
                </div>
                
                {/* Email Suggestions */}
                {showEmailSuggestions && getEmailSuggestions().length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-purple-800/90 backdrop-blur-sm border border-purple-600 rounded-lg shadow-lg z-10">
                    {getEmailSuggestions().map((cred, index) => (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(cred.email, cred.name) }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-purple-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="text-sm">{cred.email}</div>
                        <div className="text-xs text-purple-300">{cred.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="relative">
                <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
                  <input
                    ref={nameRef}
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={() => { setShowNameSuggestions(formData.name.length > 0); setShowEmailSuggestions(false) }}
                    onBlur={() => setShowNameSuggestions(false)}
                    className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
                
                {/* Name Suggestions */}
                {showNameSuggestions && getNameSuggestions().length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-purple-800/90 backdrop-blur-sm border border-purple-600 rounded-lg shadow-lg z-10">
                    {getNameSuggestions().map((cred, index) => (
                      <button
                        key={index}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(cred.email, cred.name) }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-purple-700/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="text-sm">{cred.name}</div>
                        <div className="text-xs text-purple-300">{cred.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-purple-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {/* Register Link */}
              <div className="text-center">
                <p className="text-purple-200">
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    className="text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Register here
                  </Link>
                </p>
              </div>

            </form>
        </motion.div>
      </div>
    </div>
  )
}

export default Login

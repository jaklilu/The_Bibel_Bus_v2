import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, ArrowRight, AlertCircle, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

const JoinCurrentGroup = () => {
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
      // First, login the user
      const loginResp = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.trim(), 
          name: formData.name.trim() 
        })
      })

      if (!loginResp.ok) {
        const msg = await loginResp.text().catch(() => '')
        throw new Error(`Login failed (${loginResp.status}): ${msg || loginResp.statusText}`)
      }

      const loginData = await loginResp.json()
      
      if (loginData.success) {
        // Save credentials for future use
        saveCredentials(formData.email, formData.name)
        
        // Store token and user data
        localStorage.setItem('userToken', loginData.data.token)
        localStorage.setItem('userData', JSON.stringify(loginData.data.user))

        // Now try to join the current group
        try {
          const joinResp = await fetch('/api/auth/join-current-group', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${loginData.data.token}`
            }
          })

          if (joinResp.ok) {
            const joinData = await joinResp.json()
            if (joinData.success) {
              // Successfully joined current group
              navigate('/dashboard', { 
                state: { 
                  message: `Welcome! You've been added to ${joinData.data.groupName}`,
                  type: 'success'
                }
              })
            } else {
              // Login successful but couldn't join group
              setError(joinData.error?.message || 'Could not join current group. You can still access your dashboard.')
              setTimeout(() => {
                navigate('/dashboard')
              }, 3000)
            }
          } else {
            // Login successful but join failed
            setError('Login successful! Redirecting to dashboard...')
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
          }
        } catch (joinError) {
          // Login successful but join failed
          setError('Login successful! Redirecting to dashboard...')
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
        }
      } else {
        setError(loginData.error?.message || 'Login failed. Please try again.')
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
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 py-8 px-4">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 mt-8"
        >
          <div className="bg-green-600/20 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-heading text-white mb-2">Join Current Group</h1>
          <p className="text-lg text-green-400">Sign in to join the active Bible reading group</p>
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
                  className={`border rounded-lg p-3 flex items-center space-x-2 ${
                    error.includes('successful') 
                      ? 'bg-green-500/20 border-green-500/30' 
                      : 'bg-red-500/20 border-red-500/30'
                  }`}
                >
                  <AlertCircle className={`h-5 w-5 ${error.includes('successful') ? 'text-green-400' : 'text-red-400'}`} />
                  <span className={`text-sm ${error.includes('successful') ? 'text-green-200' : 'text-red-200'}`}>{error}</span>
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
                    className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>Joining Group...</span>
                ) : (
                  <>
                    <span>Join Current Group</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {/* Alternative Actions */}
              <div className="text-center space-y-2">
                <p className="text-purple-200">
                  Just want to access your dashboard?{' '}
                  <Link 
                    to="/login" 
                    className="text-amber-400 hover:text-amber-300 font-semibold"
                  >
                    Login here
                  </Link>
                </p>
                <p className="text-purple-200">
                  New to The Bible Bus?{' '}
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

export default JoinCurrentGroup

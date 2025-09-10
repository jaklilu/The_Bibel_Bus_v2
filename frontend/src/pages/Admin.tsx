import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Users, 
  BookOpen, 
  MessageSquare, 
  DollarSign, 
  BarChart3,
  Plus
} from 'lucide-react'
import AdminMessageManager from '../components/AdminMessageManager'

interface AdminData {
  groups: any[]
  users: any[]
  progress: any[]
  milestoneProgress: any[]
  messages: any[]
  donations: any[]
}

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [adminData, setAdminData] = useState<AdminData>({
    groups: [],
    users: [],
    progress: [],
    milestoneProgress: [],
    messages: [],
    donations: []
  })
  const [activeTab, setActiveTab] = useState('overview')
  // removed unused newMessage state
  const [passwordChange, setPasswordChange] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [groupMembers, setGroupMembers] = useState<any[]>([])
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [groupToManage, setGroupToManage] = useState<any>(null)
  const [showPostMessageModal, setShowPostMessageModal] = useState(false)
  const [newGroupMessage, setNewGroupMessage] = useState({ title: '', content: '', type: 'encouragement', priority: 'normal' })
  const [postingMessage, setPostingMessage] = useState(false)
  const [postMessageError, setPostMessageError] = useState('')
  // Removed normalize dates feature per request
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [newGroupStart, setNewGroupStart] = useState('')
  const [newGroupMax, setNewGroupMax] = useState(50)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)
  // Users tab state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUserError, setNewUserError] = useState('')
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'user', status: 'active', award_approved: false, avatar_url: '', city: '', mailing_address: '', referral: '' })
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [trophySetValue, setTrophySetValue] = useState<string>('')
  // Select users to add to group
  const [showSelectUsersModal, setShowSelectUsersModal] = useState(false)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [addingMembers, setAddingMembers] = useState(false)

  // Manage modal editable fields
  const [editName, setEditName] = useState('')
  const [editStatus, setEditStatus] = useState<'upcoming' | 'active' | 'closed' | 'completed'>('upcoming')
  const [editStart, setEditStart] = useState('')
  const [editMax, setEditMax] = useState<number>(50)

  const getDaySuffix = (day: number) => {
    if (day % 10 === 1 && day % 100 !== 11) return 'st'
    if (day % 10 === 2 && day % 100 !== 12) return 'nd'
    if (day % 10 === 3 && day % 100 !== 13) return 'rd'
    return 'th'
  }

  const formatDate = (isoDate: string) => {
    if (!isoDate) return '-'
    const date = new Date(isoDate)
    const month = date.toLocaleString('en-US', { month: 'long' })
    const dayNum = date.getDate()
    const year = date.getFullYear()
    const suffix = getDaySuffix(dayNum)
    return `${month} ${dayNum}${suffix}, ${year}`
  }

  // Card display: Month Day with ordinal, no year
  const formatCardDate = (isoDate: string) => {
    if (!isoDate) return '-'
    // Avoid timezone shifts: parse ISO directly (YYYY-MM-DD)
    const parts = isoDate.split('-')
    if (parts.length < 3) return isoDate
    const yyyy = parts[0]
    const monthIndex = Math.max(0, Math.min(11, parseInt(parts[1], 10) - 1))
    const dayNum = parseInt(parts[2], 10)
    const monthNames = [
      'January','February','March','April','May','June','July','August','September','October','November','December'
    ]
    const month = monthNames[monthIndex]
    return `${month} ${dayNum}, ${yyyy}`
  }

  // Normalize date inputs to ISO YYYY-MM-DD (accepts YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY)
  const normalizeToISO = (input: string): string => {
    if (!input) return input
    // Already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input
    // MM/DD/YYYY
    const m = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (m) {
      const mm = String(Math.max(1, Math.min(12, parseInt(m[1], 10)))).padStart(2, '0')
      const dd = String(Math.max(1, Math.min(31, parseInt(m[2], 10)))).padStart(2, '0')
      const yyyy = m[3]
      return `${yyyy}-${mm}-${dd}`
    }
    // MM-DD-YYYY or MM.DD.YYYY
    const m2 = input.match(/^(\d{1,2})[\-.](\d{1,2})[\-.](\d{4})$/)
    if (m2) {
      const mm = String(Math.max(1, Math.min(12, parseInt(m2[1], 10)))).padStart(2, '0')
      const dd = String(Math.max(1, Math.min(31, parseInt(m2[2], 10)))).padStart(2, '0')
      const yyyy = m2[3]
      return `${yyyy}-${mm}-${dd}`
    }
    // Fallback to Date parsing, then to ISO
    const d = new Date(input)
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }
    return input
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Admin login endpoint
      const response = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()
      
      

      if (data.success && data.data.user.role === 'admin') {
        localStorage.setItem('adminToken', data.data.token)
        setIsLoggedIn(true)
        fetchAdminData()
      } else if (data.success && data.data.user.role !== 'admin') {
        setError('Access denied. Admin privileges required.')
      } else {
        setError('Invalid credentials. Please try again.')
      }
    } catch (err) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdminData = async () => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [groupsRes, usersRes, progressRes, milestoneProgressRes, messagesRes, donationsRes] = await Promise.all([
        fetch('/api/admin/groups', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/progress', { headers }),
        fetch('/api/admin/milestone-progress', { headers }),
        fetch('/api/admin/messages', { headers }),
        fetch('/api/admin/donations', { headers })
      ])

      // If token expired/invalid after a deploy, force re-login instead of showing empty lists
      if ([groupsRes, usersRes, progressRes, milestoneProgressRes, messagesRes, donationsRes].some(r => r.status === 401)) {
        localStorage.removeItem('adminToken')
        setIsLoggedIn(false)
        setAdminData({ groups: [], users: [], progress: [], milestoneProgress: [], messages: [], donations: [] })
        setError('Your admin session expired. Please sign in again.')
        return
      }

      const groups = await groupsRes.json()
      const users = await usersRes.json()
      const progress = await progressRes.json()
      const milestoneProgress = await milestoneProgressRes.json()
      const messages = await messagesRes.json()
      const donations = await donationsRes.json()

      console.log('Donations response:', donations) // Debug log

      setAdminData({
        groups: groups.data || [],
        users: users.data || [],
        progress: progress.data || [],
        milestoneProgress: milestoneProgress.data || [],
        messages: messages.data || [],
        donations: donations.success ? donations.data.donations : []
      })
    } catch (err) {
      console.error('Error fetching admin data:', err)
    }
  }


  // removed unused sendMessage helper

  const viewGroupMembers = async (groupId: number) => {
    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await response.json()
      
      if (data.success) {
        const group = adminData.groups.find((g: any) => g.id === groupId)
        setSelectedGroup(group)
        setGroupMembers(data.data.members || [])
        setShowMembersModal(true)
        try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
      }
    } catch (err) {
      console.error('Error fetching group members:', err)
    }
  }

  const manageGroup = (groupId: number) => {
    const group = adminData.groups.find((g: any) => g.id === groupId)
    setGroupToManage(group)
    setShowManageModal(true)
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
    // Initialize edit fields
    if (group) {
      setEditName(group.name || '')
      setEditStatus(group.status || 'upcoming')
      setEditStart(group.start_date || '')
      setEditMax(group.max_members || 50)
    }
  }

  const postMessageToGroup = () => {
    setShowPostMessageModal(true)
  }

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('adminToken')
    if (!token || !groupToManage) return

    try {
      setPostingMessage(true)
      setPostMessageError('')
      const response = await fetch('/api/admin/group-messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group_id: groupToManage.id,
          title: newGroupMessage.title,
          content: newGroupMessage.content,
          message_type: newGroupMessage.type,
          priority: newGroupMessage.priority
        })
      })

      if (response.ok) {
        setNewGroupMessage({ title: '', content: '', type: 'encouragement', priority: 'normal' })
        setShowPostMessageModal(false)
        setShowManageModal(false)
        fetchAdminData() // Refresh data
      } else if (response.status === 401 || response.status === 403) {
        setPostMessageError('Your admin session expired. Please sign in again.')
        localStorage.removeItem('adminToken')
        setIsLoggedIn(false)
        setAdminData({ groups: [], users: [], progress: [], milestoneProgress: [], messages: [], donations: [] })
      } else {
        const data = await response.json().catch(() => null)
        setPostMessageError(data?.error?.message || 'Failed to post message')
      }
    } catch (err) {
      console.error('Error posting message:', err)
      setPostMessageError('Failed to post message. Please try again.')
    } finally {
      setPostingMessage(false)
    }
  }

  // normalizeGroups removed

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordChange.newPassword !== passwordChange.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordChange.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    const token = localStorage.getItem('adminToken')
    if (!token) return

    try {
              const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordChange.currentPassword,
          newPassword: passwordChange.newPassword
        })
      })

      const data = await response.json()

      if (data.success) {
        setPasswordSuccess('Password changed successfully!')
        setPasswordChange({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setPasswordError(data.error?.message || 'Failed to change password')
      }
    } catch (err) {
      setPasswordError('Failed to change password. Please try again.')
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMessage('')
    setError('') // Clear any previous login errors

    try {
              const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      })

      const data = await response.json()
      

      if (data.success) {
        setResetMessage('Password reset email sent! Check your inbox.')
        setResetEmail('')
        // Don't auto-hide the form, let user see the success message
      } else {
        setResetMessage(data.error?.message || 'Failed to send reset email. Please try again.')
      }
    } catch (err) {
      console.error('Password reset error:', err)
      setResetMessage('Failed to send reset email. Please try again.')
    } finally {
      setResetLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsLoggedIn(true)
      fetchAdminData()
    }
  }, [])

     if (!isLoggedIn) {
     return (
       <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 flex items-center justify-center p-4">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-purple-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md border border-purple-600/30"
         >
           <div className="text-center mb-8">
             <Shield className="h-16 w-16 text-amber-500 mx-auto mb-4" />
             <h1 className="text-3xl font-bold text-white">Admin Login</h1>
             <p className="text-purple-200 mt-2">Access The Bible Bus administration panel</p>
           </div>

                       {!showResetForm ? (
              <>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Email
                    </label>
                                         <input
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full px-4 py-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-700/50 text-white placeholder-purple-300"
                       placeholder="JayTheBibleBus@gmail.com"
                       required
                     />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-700/50 text-white placeholder-purple-300"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-red-400 text-sm text-center">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-500 text-purple-900 py-3 px-4 rounded-lg hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowResetForm(true)
                      setError('') // Clear login errors when switching to reset form
                      setResetMessage('') // Clear any previous reset messages
                    }}
                    className="text-purple-300 hover:text-amber-400 text-sm transition-colors underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              </>
            ) : (
              <>
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-purple-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-700/50 text-white placeholder-purple-300"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  {resetMessage && (
                    <div className={`text-sm text-center p-3 rounded-lg ${
                      resetMessage.includes('sent') 
                        ? 'text-green-400 bg-green-900/20 border border-green-500/30' 
                        : 'text-red-400 bg-red-900/20 border border-red-500/30'
                    }`}>
                      {resetMessage}
                      {resetMessage.includes('sent') && (
                        <button
                          onClick={() => setShowResetForm(false)}
                          className="block w-full mt-2 text-green-300 hover:text-green-200 underline"
                        >
                          Return to Login
                        </button>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-amber-500 text-purple-900 py-3 px-4 rounded-lg hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setShowResetForm(false)
                      setResetMessage('') // Clear reset message when going back to login
                      setError('') // Clear any previous login errors
                    }}
                    className="text-purple-300 hover:text-amber-400 text-sm transition-colors underline"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}
          
         </motion.div>
       </div>
     )
   }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
             {/* Header */}
       <header className="bg-purple-800/50 backdrop-blur-sm border-b border-purple-600/30">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-center items-center py-4">
             <div className="flex items-center space-x-3">
               <Shield className="h-8 w-8 text-amber-500" />
               <h1 className="text-2xl font-bold text-white">Bible Bus Admin</h1>
             </div>
           </div>
         </div>
       </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 {/* Navigation Tabs */}
         <nav className="mb-8 border-b border-purple-600/30">
           {/* Mobile: Horizontal scrollable tabs */}
           <div className="md:hidden">
             <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
               {[
                 { id: 'overview', label: 'Overview', icon: BarChart3 },
                 { id: 'groups', label: 'Groups', icon: BookOpen },
                 { id: 'users', label: 'Users', icon: Users },
                 { id: 'progress', label: 'Progress', icon: BarChart3 },
                 { id: 'messages', label: 'Messages', icon: MessageSquare },
                 { id: 'donations', label: 'Donations', icon: DollarSign },
                 { id: 'password', label: 'Password', icon: Shield }
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center space-x-1 py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap rounded-t-lg ${
                     activeTab === tab.id
                       ? 'border-amber-500 text-amber-500 bg-purple-700/30'
                       : 'border-transparent text-purple-200 hover:text-white hover:border-purple-400 hover:bg-purple-700/20'
                   }`}
                 >
                   <tab.icon className="h-4 w-4" />
                   <span>{tab.label}</span>
                 </button>
               ))}
             </div>
           </div>

           {/* Desktop: Full navigation */}
           <div className="hidden md:flex justify-between items-center">
             <div className="flex space-x-8">
               {[
                 { id: 'overview', label: 'Overview', icon: BarChart3 },
                 { id: 'groups', label: 'Groups', icon: BookOpen },
                 { id: 'users', label: 'Users', icon: Users },
                 { id: 'progress', label: 'Progress', icon: BarChart3 },
                 { id: 'messages', label: 'Messages', icon: MessageSquare },
                 { id: 'donations', label: 'Donations', icon: DollarSign },
                 { id: 'password', label: 'Change Password', icon: Shield }
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                     activeTab === tab.id
                       ? 'border-amber-500 text-amber-500'
                       : 'border-transparent text-purple-200 hover:text-white hover:border-purple-400'
                   }`}
                 >
                   <tab.icon className="h-5 w-5" />
                   <span>{tab.label}</span>
                 </button>
               ))}
             </div>
           </div>
         </nav>

        {/* Content */}
        <div className="bg-purple-800/50 backdrop-blur-sm rounded-lg shadow-lg border border-purple-700/30 p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-purple-600 rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-amber-500">Total Groups</p>
                    <p className="text-2xl font-bold text-white">{adminData.groups.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-600 rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-amber-500">Total Users</p>
                    <p className="text-2xl font-bold text-white">{adminData.users.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-600 rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-amber-500">Messages Sent</p>
                    <p className="text-2xl font-bold text-white">{adminData.messages.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-600 rounded-lg p-6 shadow-lg">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-amber-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-amber-500">Donations</p>
                    <p className="text-2xl font-bold text-white">{adminData.donations.length}</p>
              </div>
            </div>
          </div>
        </div>
          )}

                                           {activeTab === 'groups' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">Bible Reading Groups</h2>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => setShowCreateGroupModal(true)} className="bg-amber-500 text-purple-900 px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors">
                      <Plus className="h-5 w-5 inline mr-2" />
                      New Group
                    </button>
                  </div>
                </div>
                {/* Normalize status message removed */}
                
                {/* Group Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    // Use groups as provided by backend (already ordered)
                    const currentOrder = adminData.groups
                    
                    const moveGroup = async (id: number, direction: 'up' | 'down') => {
                      const token = localStorage.getItem('adminToken')
                      if (!token) return
                      const ids = currentOrder.map((g: any) => g.id)
                      const idx = ids.indexOf(id)
                      if (idx === -1) return
                      const swapWith = direction === 'up' ? idx - 1 : idx + 1
                      if (swapWith < 0 || swapWith >= ids.length) return
                      const newOrder = [...ids]
                      const tmp = newOrder[idx]
                      newOrder[idx] = newOrder[swapWith]
                      newOrder[swapWith] = tmp
                      try {
                        await fetch('/api/admin/groups/sort-order', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ order: newOrder })
                        })
                        await fetchAdminData()
                      } catch (e) {
                        console.error('Failed to set sort order', e)
                      }
                    }

                    return currentOrder.map((group: any, idx: number) => (
                      <motion.div
                        key={group.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-purple-700/50 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all border border-purple-600/30 cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <BookOpen className="h-8 w-8 text-amber-500" />
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            group.status === 'active' ? 'bg-green-600 text-white' :
                            group.status === 'upcoming' ? 'bg-blue-600 text-white' :
                            group.status === 'completed' ? 'bg-gray-600 text-white' :
                            group.status === 'closed' ? 'bg-red-600 text-white' :
                            'bg-amber-600 text-purple-900'
                          }`}>
                            {group.status}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-white mb-3">
                          {group.name}
                        </h3>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-purple-300">Start:</span>
                            <span className="text-white font-medium">{formatCardDate(group.start_date)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-purple-300">End:</span>
                            <span className="text-white font-medium">{formatCardDate(group.end_date)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-purple-300">Members:</span>
                            <span className="text-white font-medium">{group.member_count || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-purple-300">Max:</span>
                            <span className="text-white font-medium">{group.max_members || 50}</span>
                          </div>
                        </div>
                        
                        {/* Reorder controls */}
                        <div className="flex items-center space-x-2 mb-3">
                          <button
                            onClick={() => moveGroup(group.id, 'up')}
                            disabled={idx === 0}
                            className={`px-2 py-1 rounded bg-purple-600 text-white text-xs ${idx === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                          >
                            Move Up
                          </button>
                          <button
                            onClick={() => moveGroup(group.id, 'down')}
                            disabled={idx === currentOrder.length - 1}
                            className={`px-2 py-1 rounded bg-purple-600 text-white text-xs ${idx === currentOrder.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-700'}`}
                          >
                            Move Down
                          </button>
                        </div>

                        <div className="flex space-x-2">
                          <button 
                            onClick={() => viewGroupMembers(group.id)}
                            className="flex-1 bg-amber-500 text-purple-900 py-2 px-3 rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                          >
                            View Members
                          </button>
                          <button 
                            onClick={() => manageGroup(group.id)}
                            className="flex-1 bg-purple-600 text-white py-2 px-3 rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium"
                          >
                            Manage
                          </button>
                        </div>
                      </motion.div>
                    ));
                  })()}
                </div>
                
                {adminData.groups.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Groups Yet</h3>
                    <p className="text-purple-300">Create your first Bible reading group to get started.</p>
                  </div>
                )}
              </div>
            )}

                     {activeTab === 'users' && (
             <div>
               <h2 className="text-xl font-semibold text-white mb-6">Users</h2>
               <div className="flex justify-end mb-4">
                 <button
                   onClick={() => { setEditingUser(null); setNewUser({ name: '', email: '', phone: '', role: 'user', status: 'active', award_approved: false, avatar_url: '', city: '', mailing_address: '', referral: '' }); setShowCreateUserModal(true) }}
                   className="bg-amber-500 text-purple-900 px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
                 >
                   Add User
                 </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-purple-600/30">
                   <thead className="bg-purple-700/50">
                     <tr>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Name</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Email</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Trophies</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Role</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">City</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Status</th>
                       <th className="px-6 py-3 text-right text-xs font-medium text-amber-500 uppercase tracking-wider">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="bg-purple-600/50 divide-y divide-purple-600/30">
                     {adminData.users.map((user) => (
                       <tr key={user.id}>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">{user.email}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                           <div className="flex items-center space-x-2">
                             <span className="inline-block min-w-[1.5rem] text-center font-semibold text-white">{user.trophies_count || 0}</span>
                             <button
                               onClick={async () => {
                                 const token = localStorage.getItem('adminToken'); if (!token) return
                                 await fetch(`/api/admin/users/${user.id}/trophies`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'decrement' }) })
                                 fetchAdminData()
                               }}
                               className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs"
                               title="-1"
                             >–</button>
                             <button
                               onClick={async () => {
                                 const token = localStorage.getItem('adminToken'); if (!token) return
                                 await fetch(`/api/admin/users/${user.id}/trophies`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'increment' }) })
                                 fetchAdminData()
                               }}
                               className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-purple-900 rounded text-xs"
                               title="+1"
                             >+1</button>
                             <input
                               type="number"
                               min={0}
                               placeholder="Set"
                               className="w-16 px-2 py-1 bg-purple-700/50 border border-purple-600/30 rounded text-white text-xs"
                               onChange={(e) => setTrophySetValue(e.target.value)}
                             />
                             <button
                               onClick={async () => {
                                 const token = localStorage.getItem('adminToken'); if (!token) return
                                 const n = Math.max(0, parseInt(trophySetValue || '0', 10))
                                 await fetch(`/api/admin/users/${user.id}/trophies`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'set', value: n }) })
                                 setTrophySetValue('')
                                 fetchAdminData()
                               }}
                               className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                             >Set</button>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                             user.role === 'admin' ? 'bg-amber-600 text-purple-900' : 'bg-blue-600 text-white'
                           }`}>
                             {user.role}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">{user.city || '-'}</td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                             user.status === 'active' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                           }`}>
                             {user.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                           <div className="inline-flex space-x-2">
                             <button
                               onClick={() => { setEditingUser(user); setNewUser({ name: user.name, email: user.email, phone: user.phone || '', role: user.role, status: user.status, award_approved: !!user.award_approved, avatar_url: user.avatar_url || '', city: user.city || '', mailing_address: user.mailing_address || '', referral: user.referral || '' }); setShowCreateUserModal(true) }}
                               className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded"
                             >
                               Edit
                             </button>
                             <button
                               onClick={async () => {
                                 const token = localStorage.getItem('adminToken'); if (!token) return;
                                 const next = user.status === 'active' ? 'inactive' : 'active'
                                 await fetch(`/api/admin/users/${user.id}/status`, {
                                   method: 'POST',
                                   headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                   body: JSON.stringify({ status: next })
                                 })
                                 fetchAdminData()
                               }}
                               className={`px-3 py-1 rounded ${user.status === 'active' ? 'bg-yellow-500 text-purple-900 hover:bg-yellow-600' : 'bg-green-600 text-white hover:bg-green-700'}`}
                             >
                               {user.status === 'active' ? 'Disable' : 'Enable'}
                             </button>
                             <button
                               onClick={async () => {
                                 if (!confirm('Delete this user?')) return
                                 const token = localStorage.getItem('adminToken'); if (!token) return;
                                 await fetch(`/api/admin/users/${user.id}`, {
                                   method: 'DELETE',
                                   headers: { 'Authorization': `Bearer ${token}` }
                                 })
                                 fetchAdminData()
                               }}
                               className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                             >
                               Delete
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}

                     {activeTab === 'progress' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Milestone Progress</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-purple-600/30">
                  <thead className="bg-purple-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Group</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Trophies</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Milestones</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Avg %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Trophy Request</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-purple-600/50 divide-y divide-purple-600/30">
                    {adminData.milestoneProgress.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.user_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">{item.group_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                          <div className="flex items-center space-x-2">
                            <span className="inline-block min-w-[1.5rem] text-center font-semibold text-white">{item.trophies_count || 0}</span>
                            <span className="text-xs text-purple-300">trophies</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-medium">{item.milestones_completed || 0}</span>
                            <span className="text-purple-300">/</span>
                            <span className="text-purple-300">{item.milestones_tracked || 0}</span>
                            <span className="text-xs text-purple-300">completed</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                          <div className="flex items-center">
                            <div className="w-16 bg-purple-700 rounded-full h-2 mr-2">
                              <div 
                                className="bg-amber-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(100, Math.round(item.avg_percentage || 0))}%` }}
                              ></div>
                            </div>
                            <span className="text-xs">{Math.round(item.avg_percentage || 0)}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                          {item.trophy_request_id ? (
                            <span className="text-amber-400 font-medium">Journey Completion</span>
                          ) : (
                            <span className="text-purple-300">No request</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                          {item.trophy_request_status ? (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.trophy_request_status === 'approved' ? 'bg-green-600 text-white' :
                              item.trophy_request_status === 'rejected' ? 'bg-red-600 text-white' :
                              item.trophy_request_status === 'pending' ? 'bg-amber-600 text-purple-900' :
                              'bg-gray-600 text-white'
                            }`}>
                              {item.trophy_request_status}
                            </span>
                          ) : (
                            <span className="text-purple-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {adminData.milestoneProgress.length === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Milestone Data</h3>
                  <p className="text-purple-300">No milestone progress data available yet.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div>
              <AdminMessageManager />
            </div>
          )}

                     {activeTab === 'donations' && (
             <div>
               <h2 className="text-xl font-semibold text-white mb-6">Donations</h2>
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-purple-600/30">
                   <thead className="bg-purple-700/50">
                     <tr>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Donor</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Amount</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Type</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Status</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-amber-500 uppercase tracking-wider">Date</th>
                     </tr>
                   </thead>
                   <tbody className="bg-purple-600/50 divide-y divide-purple-600/30">
                     {adminData.donations.map((donation) => (
                       <tr key={donation.id}>
                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                           {donation.anonymous ? 'Anonymous' : donation.donor_name}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">${donation.amount}</td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">{donation.type}</td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                             donation.status === 'completed' ? 'bg-green-600 text-white' :
                             donation.status === 'pending' ? 'bg-amber-600 text-purple-900' :
                             'bg-red-600 text-white'
                           }`}>
                             {donation.status}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                           {formatDate(donation.created_at)}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}

                     {activeTab === 'password' && (
             <div>
               <h2 className="text-xl font-semibold text-white mb-6">Change Admin Password</h2>
               <div className="max-w-md">
                 <form onSubmit={handlePasswordChange} className="space-y-4">
                   <div>
                     <label className="block text-sm font-medium text-white mb-2">
                       Current Password
                     </label>
                     <input
                       type="password"
                       value={passwordChange.currentPassword}
                       onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                       className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                       placeholder="Enter current password"
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-white mb-2">
                       New Password
                     </label>
                     <input
                       type="password"
                       value={passwordChange.newPassword}
                       onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                       className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                       placeholder="Enter new password (min 6 characters)"
                       required
                     />
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-white mb-2">
                       Confirm New Password
                     </label>
                     <input
                       type="password"
                       value={passwordChange.confirmPassword}
                       onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                       className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                       placeholder="Confirm new password"
                       required
                     />
                   </div>

                   {passwordError && (
                     <div className="text-red-400 text-sm">{passwordError}</div>
                   )}

                   {passwordSuccess && (
                     <div className="text-green-400 text-sm">{passwordSuccess}</div>
                   )}

                   <button
                     type="submit"
                     className="w-full bg-amber-500 text-purple-900 py-2 px-4 rounded-md hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
                   >
                     Change Password
                   </button>
                 </form>
               </div>
             </div>
           )}

          {/* Group Members Modal */}
          {showMembersModal && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 pt-10 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-purple-600/30"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {selectedGroup?.name} - Members
                  </h2>
                  <button
                    onClick={() => setShowMembersModal(false)}
                    className="text-purple-300 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mb-4 text-sm text-purple-200">
                  Total Members: {groupMembers.length} / {selectedGroup?.max_members || 50}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-white font-medium">Members</h3>
                      <p className="text-xs text-purple-300">Add existing users to this group.</p>
                    </div>
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('adminToken')
                        if (!token) return
                        try {
                          const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } })
                          const data = await res.json()
                          setAllUsers(data.data || [])
                          setSelectedUserIds([])
                          setUserSearch('')
                          setShowSelectUsersModal(true)
                          try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch {}
                        } catch (e) {
                          console.error('Failed to load users', e)
                        }
                      }}
                      className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-purple-900 rounded-lg font-medium"
                    >
                      Add Members
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-96">
                  {groupMembers.length > 0 ? (
                    <div className="space-y-3">
                      {groupMembers.map((member: any) => (
                        <div key={member.id} className="bg-purple-700/50 rounded-lg p-4 border border-purple-600/30">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-white font-medium">{member.name}</h3>
                              <p className="text-purple-300 text-sm">{member.email}</p>
                              {member.city && (
                                <p className="text-purple-400 text-xs mt-1">📍 {member.city}</p>
                              )}
                              {member.completed_at && (
                                <p className="text-green-300 text-xs mt-1">🏁 Completed: {formatDate(member.completed_at)}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                member.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                              }`}>
                                {member.status}
                              </span>
                              <p className="text-purple-400 text-xs mt-1">
                                Joined: {formatDate(member.join_date)}
                              </p>
                              <button
                                onClick={async () => {
                                  const token = localStorage.getItem('adminToken')
                                  if (!token || !selectedGroup) return
                                  if (member.completed_at) return
                                  try {
                                    const res = await fetch(`/api/admin/groups/${selectedGroup.id}/members/${member.user_id}/complete`, {
                                      method: 'POST',
                                      headers: { 'Authorization': `Bearer ${token}` }
                                    })
                                    const data = await res.json()
                                    if (data.success) {
                                      // Refresh list
                                      const fresh = await fetch(`/api/admin/groups/${selectedGroup.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
                                      const freshData = await fresh.json()
                                      setGroupMembers(freshData?.data?.members || [])
                                    } else {
                                      alert(data.error?.message || 'Failed to mark completed')
                                    }
                                  } catch (e) {
                                    console.error(e)
                                  }
                                }}
                                disabled={!!member.completed_at}
                                className={`mt-2 px-3 py-1 rounded text-xs ${member.completed_at ? 'bg-green-700/50 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                              >
                                {member.completed_at ? 'Completed' : 'Mark Completed'}
                              </button>
                              <button
                                onClick={async () => {
                                  const token = localStorage.getItem('adminToken')
                                  if (!token || !selectedGroup) return
                                  const res = await fetch(`/api/admin/groups/${selectedGroup.id}/members/${member.user_id}`, {
                                    method: 'DELETE',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  })
                                  const data = await res.json()
                                  if (data.success) {
                                    setGroupMembers(data.data.members || [])
                                  } else {
                                    alert(data.error?.message || 'Failed to remove member')
                                  }
                                }}
                                className="mt-2 ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                      <p className="text-purple-300">No members in this group yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Create Group Modal */}
          {showCreateGroupModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto border border-purple-600/30"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">Create New Group</h2>
                  <button onClick={() => setShowCreateGroupModal(false)} className="text-purple-300 hover:text-white transition-colors">✕</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Group Name (Optional)</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                      placeholder="e.g., Bible Bus October 2025 Travelers"
                    />
                    <p className="text-xs text-purple-300 mt-1">If left blank, name will be auto-generated.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Start Date (YYYY-MM-DD or MM/DD/YYYY)</label>
                    <input
                      type="date"
                      value={newGroupStart}
                      onChange={(e) => setNewGroupStart(normalizeToISO(e.target.value))}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                    />
                    <p className="text-xs text-purple-300 mt-1">Will auto-align to Jan 1, Apr 1, Jul 1, or Oct 1.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Max Members</label>
                    <input
                      type="number"
                      min={1}
                      value={newGroupMax}
                      onChange={(e) => setNewGroupMax(parseInt(e.target.value || '50', 10))}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('adminToken')
                      if (!token || !newGroupStart) { return }
                      try {
                        setCreatingGroup(true)
                        const res = await fetch('/api/admin/groups', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ start_date: normalizeToISO(newGroupStart), max_members: newGroupMax, name: newGroupName })
                        })
                        const data = await res.json()
                        if (data.success) {
                          setShowCreateGroupModal(false)
                          setNewGroupStart('')
                          setNewGroupMax(50)
                          setNewGroupName('')
                          await fetchAdminData()
                        }
                      } finally {
                        setCreatingGroup(false)
                      }
                    }}
                    disabled={creatingGroup || !newGroupStart}
                    className={`flex-1 ${creatingGroup ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-600'} text-purple-900 py-2 px-4 rounded-lg transition-colors font-medium`}
                  >
                    {creatingGroup ? 'Creating…' : 'Create Group'}
                  </button>
                  <button onClick={() => setShowCreateGroupModal(false)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Group Management Modal */}
          {showManageModal && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 pt-10 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-purple-600/30"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    Manage {groupToManage?.name}
                  </h2>
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="text-purple-300 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Group Status Management */}
                  <div className="bg-purple-700/50 rounded-lg p-4 border border-purple-600/30">
                    <h3 className="text-lg font-medium text-white mb-4">Group Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Current Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white"
                        >
                          <option value="active">active</option>
                          <option value="upcoming">upcoming</option>
                          <option value="closed">closed</option>
                          <option value="completed">completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Member Count</label>
                        <p className="text-white font-medium">{groupToManage?.member_count || 0} / {groupToManage?.max_members || 50}</p>
                      </div>
                    </div>
                  </div>

                  {/* Group Settings */}
                  <div className="bg-purple-700/50 rounded-lg p-4 border border-purple-600/30">
                    <h3 className="text-lg font-medium text-white mb-4">Group Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Group Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">WhatsApp Invite URL</label>
                        <input
                          type="url"
                          defaultValue={groupToManage?.whatsapp_invite_url || ''}
                          onBlur={async (e) => {
                            const val = e.target.value.trim() || null
                            if (!groupToManage) return
                            const token = localStorage.getItem('adminToken'); if (!token) return
                            try {
                              await fetch(`/api/admin/groups/${groupToManage.id}`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ whatsapp_invite_url: val })
                              })
                            } catch {}
                          }}
                          placeholder="https://chat.whatsapp.com/..."
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">YouVersion Plan URL</label>
                        <input
                          type="url"
                          defaultValue={groupToManage?.youversion_plan_url || ''}
                          onBlur={async (e) => {
                            const val = e.target.value.trim() || null
                            if (!groupToManage) return
                            const token = localStorage.getItem('adminToken'); if (!token) return
                            try {
                              await fetch(`/api/admin/groups/${groupToManage.id}`, {
                                method: 'PUT',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ youversion_plan_url: val })
                              })
                            } catch {}
                          }}
                          placeholder="https://www.bible.com/..."
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Max Members</label>
                        <input
                          type="number"
                          value={editMax}
                          onChange={(e) => setEditMax(parseInt(e.target.value || '50', 10))}
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                          placeholder="Maximum members"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Registration Deadline</label>
                        <input
                          type="date"
                          defaultValue={groupToManage?.registration_deadline}
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-purple-200 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={editStart}
                          onChange={(e) => setEditStart(e.target.value)}
                          className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                        />
                        <p className="text-xs text-purple-300 mt-1">Will align to Jan 1, Apr 1, Jul 1, or Oct 1.</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-purple-700/50 rounded-lg p-4 border border-purple-600/30">
                    <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={postMessageToGroup}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                      >
                        Post Message
                      </button>
                      <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">
                        Export Members
                      </button>
                      <button className="bg-amber-600 hover:bg-amber-700 text-purple-900 py-2 px-4 rounded-lg transition-colors text-sm font-medium">
                        View Progress
                      </button>
                      <button className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium">
                        Archive Group
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={async () => {
                        const token = localStorage.getItem('adminToken')
                        if (!token || !groupToManage) return
                        const payload: any = {}
                        if ((editName || '') !== (groupToManage.name || '')) payload.name = editName
                        if ((editStatus || '') !== (groupToManage.status || '')) payload.status = editStatus
                        if ((editStart || '') !== (groupToManage.start_date || '')) payload.start_date = editStart
                        if ((editMax || 0) !== (groupToManage.max_members || 0)) payload.max_members = editMax
                        if (Object.keys(payload).length === 0) { setShowManageModal(false); return }
                        try {
                          const endpoint = (Object.keys(payload).length === 1 && payload.status)
                            ? `/api/admin/groups/${groupToManage.id}/status`
                            : `/api/admin/groups/${groupToManage.id}`
                          const method = (Object.keys(payload).length === 1 && payload.status) ? 'POST' : 'PUT'
                          const res = await fetch(endpoint, {
                            method,
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          })
                          const data = await res.json()
                          if (data.success) {
                            setShowManageModal(false)
                            await fetchAdminData()
                          }
                        } catch (e) {
                          console.error('Failed to update group', e)
                        }
                      }}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-purple-900 py-2 px-4 rounded-lg transition-colors font-medium"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setShowManageModal(false)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Select Users Modal */}
          {showSelectUsersModal && (
            <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 pt-10 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-purple-600/30"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Add Members to {selectedGroup?.name}</h2>
                  <button onClick={() => setShowSelectUsersModal(false)} className="text-purple-300 hover:text-white">✕</button>
                </div>

                <div className="mb-3">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                  />
                </div>

                <div className="border border-purple-600/30 rounded-lg divide-y divide-purple-600/20">
                  {allUsers
                    .filter(u => {
                      const q = userSearch.trim().toLowerCase()
                      if (!q) return true
                      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)
                    })
                    .map(u => {
                      const checked = selectedUserIds.includes(u.id)
                      return (
                        <label key={u.id} className="flex items-center justify-between px-4 py-2 hover:bg-purple-700/30 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedUserIds(prev => e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id))
                              }}
                            />
                            <div>
                              <div className="text-white text-sm font-medium">{u.name}</div>
                              <div className="text-purple-300 text-xs">{u.email}</div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${u.status === 'active' ? 'bg-green-700 text-white' : 'bg-gray-600 text-white'}`}>{u.status}</span>
                        </label>
                      )
                    })}
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('adminToken')
                      if (!token || !selectedGroup || selectedUserIds.length === 0) return
                      try {
                        setAddingMembers(true)
                        for (const uid of selectedUserIds) {
                          await fetch(`/api/admin/groups/${selectedGroup.id}/members`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: uid })
                          })
                        }
                        // Refresh members in the background modal if open
                        const res = await fetch(`/api/admin/groups/${selectedGroup.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
                        const data = await res.json()
                        setGroupMembers(data?.data?.members || [])
                        setShowSelectUsersModal(false)
                      } finally {
                        setAddingMembers(false)
                      }
                    }}
                    disabled={addingMembers || selectedUserIds.length === 0}
                    className={`flex-1 ${addingMembers ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-600'} text-purple-900 py-2 px-4 rounded-lg transition-colors font-medium`}
                  >
                    {addingMembers ? 'Adding…' : 'Add Selected'}
                  </button>
                  <button onClick={() => setShowSelectUsersModal(false)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
          {/* Post Message Modal */}
          {showPostMessageModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-purple-600/30"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    Post Message to {groupToManage?.name}
                  </h2>
                  <button
                    onClick={() => setShowPostMessageModal(false)}
                    className="text-purple-300 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {postMessageError && (
                  <div className="mb-4 text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm">
                    {postMessageError}
                  </div>
                )}

                <form onSubmit={handlePostMessage} className="space-y-6">
                  {/* Message Title */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Message Title *
                    </label>
                    <input
                      type="text"
                      value={newGroupMessage.title}
                      onChange={(e) => setNewGroupMessage({ ...newGroupMessage, title: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300"
                      placeholder="Enter message title"
                      required
                    />
                  </div>

                  {/* Message Type */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Message Type
                    </label>
                    <select
                      value={newGroupMessage.type}
                      onChange={(e) => setNewGroupMessage({ ...newGroupMessage, type: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white"
                    >
                      <option value="encouragement">Encouragement</option>
                      <option value="reminder">Reminder</option>
                      <option value="announcement">Announcement</option>
                      <option value="milestone">Milestone</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Priority
                    </label>
                    <select
                      value={newGroupMessage.priority}
                      onChange={(e) => setNewGroupMessage({ ...newGroupMessage, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Message Content */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Message Content *
                    </label>
                    <textarea
                      value={newGroupMessage.content}
                      onChange={(e) => setNewGroupMessage({ ...newGroupMessage, content: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300 resize-none"
                      placeholder="Write your message here..."
                      required
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={postingMessage}
                      className={`flex-1 ${postingMessage ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-600'} text-purple-900 py-2 px-4 rounded-lg transition-colors font-medium`}
                    >
                      {postingMessage ? 'Posting…' : 'Post Message'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowPostMessageModal(false)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Create/Edit User Modal */}
          {showCreateUserModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto border border-purple-600/30"
              >
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-white">{editingUser ? 'Edit User' : 'Add User'}</h2>
                  <button onClick={() => setShowCreateUserModal(false)} className="text-purple-300 hover:text-white transition-colors">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Full Name</label>
                    <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
                    <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Avatar URL</label>
                    <input type="url" value={newUser.avatar_url} onChange={(e) => setNewUser({ ...newUser, avatar_url: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" placeholder="https://..." />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input id="awardApproved" type="checkbox" checked={!!newUser.award_approved} onChange={(e) => setNewUser({ ...newUser, award_approved: e.target.checked })} />
                    <label htmlFor="awardApproved" className="text-sm text-purple-200">Approved to appear on Awards page</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Phone</label>
                    <input type="text" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">City</label>
                    <input type="text" value={newUser.city} onChange={(e) => setNewUser({ ...newUser, city: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Role</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white">
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-200 mb-2">Status</label>
                    <select value={newUser.status} onChange={(e) => setNewUser({ ...newUser, status: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white">
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-purple-200 mb-2">Mailing Address</label>
                    <input type="text" value={newUser.mailing_address} onChange={(e) => setNewUser({ ...newUser, mailing_address: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-purple-200 mb-2">Referral</label>
                    <input type="text" value={newUser.referral} onChange={(e) => setNewUser({ ...newUser, referral: e.target.value })} className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-800/50 text-white placeholder-purple-300" />
                  </div>
                </div>

                {newUserError && (
                  <div className="mt-4 text-red-300 bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-sm">
                    {newUserError}
                  </div>
                )}

                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem('adminToken'); if (!token) return;
                      try {
                        setCreatingUser(true)
                        setNewUserError('')
                        const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
                        const method = editingUser ? 'PUT' : 'POST'
                        // Omit empty optional fields to pass backend validators
                        const payload: any = {
                          name: (newUser.name || '').trim(),
                          email: (newUser.email || '').trim(),
                          role: newUser.role || 'user',
                          status: newUser.status || 'active',
                          award_approved: !!newUser.award_approved
                        }
                        if ((newUser.phone || '').trim().length > 0) payload.phone = newUser.phone.trim()
                        if ((newUser.avatar_url || '').trim().length > 0) payload.avatar_url = newUser.avatar_url.trim()
                        if ((newUser.city || '').trim().length > 0) payload.city = newUser.city.trim()
                        if ((newUser.mailing_address || '').trim().length > 0) payload.mailing_address = newUser.mailing_address.trim()
                        if ((newUser.referral || '').trim().length > 0) payload.referral = newUser.referral.trim()

                        const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                        let data: any = null
                        try { data = await res.json() } catch {}
                        if (res.ok && data?.success) {
                          setShowCreateUserModal(false)
                          setNewUser({ name: '', email: '', phone: '', role: 'user', status: 'active', award_approved: false, avatar_url: '', city: '', mailing_address: '', referral: '' })
                          setEditingUser(null)
                          await fetchAdminData()
                        } else {
                          const detail = Array.isArray(data?.error?.details) ? data.error.details.map((d:any)=>d.msg).join('; ') : ''
                          const msg = (data && (data.error?.message || data.message)) || (res.status === 409 ? 'Email already exists' : 'Failed to save user')
                          setNewUserError(detail ? `${msg}: ${detail}` : msg)
                        }
                      } finally {
                        setCreatingUser(false)
                      }
                    }}
                    disabled={creatingUser || !newUser.name || !newUser.email}
                    className={`flex-1 ${creatingUser ? 'bg-amber-600' : 'bg-amber-500 hover:bg-amber-600'} text-purple-900 py-2 px-4 rounded-lg transition-colors font-medium`}
                  >
                    {creatingUser ? (editingUser ? 'Updating…' : 'Creating…') : (editingUser ? 'Update User' : 'Create User')}
                  </button>
                  <button onClick={() => { setShowCreateUserModal(false); setEditingUser(null) }} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium">Cancel</button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Admin

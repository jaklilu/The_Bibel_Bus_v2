import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Heart, 
  Bell, 
  Megaphone, 
  Trophy,
  Calendar,
  Users,
} from 'lucide-react'

interface GroupMessage {
  id: number
  title: string
  content: string
  message_type: 'encouragement' | 'reminder' | 'announcement' | 'milestone'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  author_name: string
  group_name: string
  group_id: number
}

interface BibleGroup {
  id: number
  name: string
  status: string
}

interface UserMessage {
  id: number
  title: string | null
  content: string
  message_type: string
  status: string
  visibility: string
  created_at: string
  user_id: number
  user_name: string
  user_email: string
  group_id: number | null
  group_name: string | null
}

const AdminMessageManager = () => {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [userMessages, setUserMessages] = useState<UserMessage[]>([])
  const [groups, setGroups] = useState<BibleGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingMessage, setEditingMessage] = useState<GroupMessage | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showUserMessages, setShowUserMessages] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    group_id: '',
    title: '',
    content: '',
    message_type: 'encouragement',
    priority: 'normal'
  })

  useEffect(() => {
    fetchMessages()
    fetchUserMessages()
    fetchGroups()
  }, [])

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        console.error('No admin token found')
        setLoading(false)
        return
      }
      const response = await fetch('/api/admin/group-messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data || [])
      } else {
        console.error('Failed to fetch messages:', response.status)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserMessages = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        console.error('No admin token found')
        return
      }
      const response = await fetch('/api/admin/user-messages', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setUserMessages(data.data || [])
      } else {
        console.error('Failed to fetch user messages:', response.status)
      }
    } catch (error) {
      console.error('Error fetching user messages:', error)
    }
  }

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return
      const response = await fetch('/api/admin/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setGroups(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingMessage 
        ? `/api/admin/group-messages/${editingMessage.id}`
        : '/api/admin/group-messages'
      
      const method = editingMessage ? 'PUT' : 'POST'
      
      const token = localStorage.getItem('adminToken')
      if (!token) return
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
       //onst data = await response.json()
       await response.json()
        // Reset form and refresh messages
        setFormData({
          group_id: '',
          title: '',
          content: '',
          message_type: 'encouragement',
          priority: 'normal'
        })
        setShowCreateForm(false)
        setEditingMessage(null)
        fetchMessages()
      }
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }

  const handleDelete = async (messageId: number) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return
      const response = await fetch(`/api/admin/group-messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        fetchMessages()
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const startEdit = (message: GroupMessage) => {
    setEditingMessage(message)
    setFormData({
      group_id: message.group_id.toString(),
      title: message.title,
      content: message.content,
      message_type: message.message_type,
      priority: message.priority
    })
    setShowCreateForm(true)
  }

  const cancelEdit = () => {
    setEditingMessage(null)
    setShowCreateForm(false)
    setFormData({
      group_id: '',
      title: '',
      content: '',
      message_type: 'encouragement',
      priority: 'normal'
    })
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'encouragement':
        return <Heart className="h-5 w-5 text-pink-500" />
      case 'reminder':
        return <Bell className="h-5 w-5 text-blue-500" />
      case 'announcement':
        return <Megaphone className="h-5 w-5 text-orange-500" />
      case 'milestone':
        return <Trophy className="h-5 w-5 text-yellow-500" />
      default:
        return <MessageCircle className="h-5 w-5 text-purple-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 bg-red-500/10'
      case 'high':
        return 'text-orange-500 bg-orange-500/10'
      case 'normal':
        return 'text-blue-500 bg-blue-500/10'
      case 'low':
        return 'text-gray-500 bg-gray-500/10'
      default:
        return 'text-blue-500 bg-blue-500/10'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredMessages = messages.filter(message => {
    const groupMatch = selectedGroup === 'all' || message.group_id.toString() === selectedGroup
    const typeMatch = selectedType === 'all' || message.message_type === selectedType
    return groupMatch && typeMatch
  })

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-purple-200">Loading message manager...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-8 w-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Message Manager</h2>
            <p className="text-purple-200">Create and manage group messages</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-purple-900 font-semibold rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Message</span>
        </button>
      </div>

      {/* Member Messages Section */}
      <div className="mb-8 bg-purple-700/30 rounded-xl p-6 border border-purple-600/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-amber-400" />
            <div>
              <h3 className="text-xl font-semibold text-white">Messages from Members</h3>
              <p className="text-purple-300 text-sm">View messages posted by group members</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowUserMessages(!showUserMessages)
              if (showUserMessages) {
                fetchUserMessages() // Refresh when expanding
              }
            }}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
          >
            {showUserMessages ? 'Hide' : 'Show'} ({userMessages.length})
          </button>
        </div>

        {showUserMessages && (
          <div className="space-y-4 mt-4">
            {userMessages.length === 0 ? (
              <div className="text-center py-8 text-purple-300">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No messages from members yet</p>
              </div>
            ) : (
              userMessages.map((userMsg, index) => (
                <motion.div
                  key={userMsg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-4 bg-purple-800/50 rounded-lg border border-purple-600/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2 py-1 rounded">
                          FROM MEMBER
                        </span>
                        {userMsg.status && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            userMsg.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            userMsg.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {userMsg.status}
                          </span>
                        )}
                      </div>
                      {userMsg.title && (
                        <h4 className="text-lg font-semibold text-white mb-1">{userMsg.title}</h4>
                      )}
                      <div className="flex items-center space-x-3 text-sm text-purple-300 mb-2">
                        <span className="font-medium text-white">{userMsg.user_name}</span>
                        <span>•</span>
                        <span>{userMsg.user_email}</span>
                        {userMsg.group_name && (
                          <>
                            <span>•</span>
                            <span>Group: {userMsg.group_name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(userMsg.created_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('Are you sure you want to delete this message?')) return
                        try {
                          const token = localStorage.getItem('adminToken')
                          if (!token) return
                          const response = await fetch(`/api/admin/user-messages/${userMsg.id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                          if (response.ok) {
                            fetchUserMessages()
                          }
                        } catch (error) {
                          console.error('Error deleting user message:', error)
                        }
                      }}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-purple-200 leading-relaxed whitespace-pre-wrap">{userMsg.content}</p>
                  {userMsg.message_type && (
                    <div className="mt-2">
                      <span className="text-xs text-purple-400">Type: {userMsg.message_type}</span>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-purple-200"
        >
          <option value="all">All Groups</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-purple-200"
        >
          <option value="all">All Types</option>
          <option value="encouragement">Encouragement</option>
          <option value="reminder">Reminder</option>
          <option value="announcement">Announcement</option>
          <option value="milestone">Milestone</option>
        </select>

        <div className="text-purple-200 text-sm flex items-center justify-center">
          <Users className="h-4 w-4 mr-2" />
          {filteredMessages.length} messages
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-purple-800/90 backdrop-blur-sm rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-600/30"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {editingMessage ? 'Edit Message' : 'Create New Message'}
                </h3>
                <button
                  onClick={cancelEdit}
                  className="text-purple-300 hover:text-white transition-colors text-2xl leading-none"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Group *</label>
                    <select
                      required
                      value={formData.group_id}
                      onChange={(e) => setFormData({...formData, group_id: e.target.value})}
                      className="w-full px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-purple-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Select Group</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Message Type *</label>
                    <select
                      required
                      value={formData.message_type}
                      onChange={(e) => setFormData({...formData, message_type: e.target.value as any})}
                      className="w-full px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-purple-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="encouragement">Encouragement</option>
                      <option value="reminder">Reminder</option>
                      <option value="announcement">Announcement</option>
                      <option value="milestone">Milestone</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Message Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="Enter message title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Priority *</label>
                    <select
                      required
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-purple-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Message Content *</label>
                  <textarea
                    required
                    placeholder="Enter message content"
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={6}
                    className="w-full px-4 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-purple-900 font-semibold rounded-lg transition-colors"
                  >
                    {editingMessage ? 'Update Message' : 'Create Message'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white border border-purple-500/30 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="p-6 bg-purple-700/30 rounded-xl border border-purple-600/20"
          >
            {/* Message Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getMessageTypeIcon(message.message_type)}
                <div>
                  <h3 className="text-lg font-semibold text-white">{message.title}</h3>
                  <div className="flex items-center space-x-2 text-sm text-purple-300">
                    <span>Group: {message.group_name}</span>
                    <span>•</span>
                    <span>by {message.author_name}</span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(message.priority)}`}>
                  {message.priority}
                </span>
                
                <button
                  onClick={() => startEdit(message)}
                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => handleDelete(message.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Message Content */}
            <p className="text-purple-200 leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </motion.div>
        ))}
      </div>

      {filteredMessages.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-purple-200 mb-2">No messages found</h3>
          <p className="text-purple-300">Create your first group message to get started!</p>
        </div>
      )}
    </motion.div>
  )
}

export default AdminMessageManager

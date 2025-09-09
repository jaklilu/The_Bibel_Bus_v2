import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageCircle, 
  Heart, 
  Bell, 
  Megaphone, 
  Trophy, 
  Calendar,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  User
} from 'lucide-react'

interface GroupMessage {
  id: number
  title: string
  content: string
  message_type: 'encouragement' | 'reminder' | 'announcement' | 'milestone' | 'prayer' | 'testimony' | 'question'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  author_name: string
  group_name: string
  message_source?: string
  comments?: Comment[]
  comment_count?: number
}

interface Comment {
  id: number
  content: string
  created_at: string
  user_name: string
  user_email: string
}

const MessageBoard = () => {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [showCreateMessage, setShowCreateMessage] = useState(false)
  const [newMessage, setNewMessage] = useState({ content: '' })
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null)
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({})
  const [lastReadTime, setLastReadTime] = useState<string | null>(null)
  const [_, setForceUpdate] = useState(0)

  useEffect(() => {
    // Load last read time from localStorage
    const savedLastReadTime = localStorage.getItem('messageBoardLastRead')
    setLastReadTime(savedLastReadTime)
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('userToken')
      if (!token) {
        console.error('No user token found')
        return
      }

      const response = await fetch('/api/auth/my-group-all-messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.data.messages || [])
      } else {
        console.error('Failed to fetch messages:', response.status)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
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
      case 'prayer':
        return <MessageSquare className="h-5 w-5 text-green-500" />
      case 'testimony':
        return <User className="h-5 w-5 text-purple-500" />
      case 'question':
        return <MessageCircle className="h-5 w-5 text-cyan-500" />
      default:
        return <MessageCircle className="h-5 w-5 text-purple-500" />
    }
  }

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'encouragement':
        return 'bg-pink-500/10 border-pink-500/20'
      case 'reminder':
        return 'bg-blue-500/10 border-blue-500/20'
      case 'announcement':
        return 'bg-orange-500/10 border-orange-500/20'
      case 'milestone':
        return 'bg-yellow-500/10 border-yellow-500/20'
      case 'prayer':
        return 'bg-green-500/10 border-green-500/20'
      case 'testimony':
        return 'bg-purple-500/10 border-purple-500/20'
      case 'question':
        return 'bg-cyan-500/10 border-cyan-500/20'
      default:
        return 'bg-purple-500/10 border-purple-500/20'
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

  const handleCreateMessage = async () => {
    try {
      const token = localStorage.getItem('userToken')
      if (!token) return

      const response = await fetch('/api/auth/create-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage.content })
      })

      if (response.ok) {
        setNewMessage({ content: '' })
        setShowCreateMessage(false)
        fetchMessages()
      }
    } catch (error) {
      console.error('Error creating message:', error)
    }
  }

  const handleAddComment = async (messageId: number) => {
    try {
      const token = localStorage.getItem('userToken')
      if (!token) return

      const content = newComment[messageId]
      if (!content.trim()) return

      const response = await fetch('/api/auth/add-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messageId, content })
      })

      if (response.ok) {
        setNewComment({ ...newComment, [messageId]: '' })
        fetchMessages()
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  // Admin-only delete (available if adminToken exists)
  const handleAdminDelete = async (message: GroupMessage) => {
    const adminToken = localStorage.getItem('adminToken')
    if (!adminToken) return
    if (!confirm('Delete this message?')) return
    try {
      if (message.message_source === 'admin') {
        await fetch(`/api/admin/group-messages/${message.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })
      } else {
        await fetch(`/api/admin/user-messages/${message.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        })
      }
      await fetchMessages()
    } catch (e) {
      console.error('Failed to delete message', e)
    }
  }

  const markAsRead = () => {
    // Use the latest message timestamp to avoid timezone edge cases
    if (messages.length > 0) {
      const maxTs = messages.reduce((max, m) => {
        const t = new Date(m.created_at).getTime()
        return t > max ? t : max
      }, 0)
      const readUntil = new Date(maxTs + 1000).toISOString()
      setLastReadTime(readUntil)
      localStorage.setItem('messageBoardLastRead', readUntil)
    } else {
      const now = new Date().toISOString()
      setLastReadTime(now)
      localStorage.setItem('messageBoardLastRead', now)
    }
    setForceUpdate(prev => prev + 1)
  }

  const isMessageUnread = (messageCreatedAt: string) => {
    if (!lastReadTime) return true
    const isUnread = new Date(messageCreatedAt) > new Date(lastReadTime)
    return isUnread
  }

  const getUnreadCount = () => {
    if (!lastReadTime) return messages.length
    return messages.filter(msg => isMessageUnread(msg.created_at)).length
  }

  const getUnreadCountByType = (type: string) => {
    const typeMessages = messages.filter(m => m.message_type === type)
    if (typeMessages.length === 0) return 0 // No messages of this type = 0 unread
    
    if (!lastReadTime) return typeMessages.length
    const unreadCount = typeMessages.filter(m => isMessageUnread(m.created_at)).length
    if (type === 'question' && unreadCount > 0) {
      
    }
    return unreadCount
  }

  const markTypeAsRead = (type: string) => {
    // Get the most recent message of this type
    const typeMessages = messages.filter(m => m.message_type === type)
    if (typeMessages.length === 0) return

    // Find the most recent message timestamp for this type
    const latestTypeTs = typeMessages.reduce((max, m) => {
      const t = new Date(m.created_at).getTime()
      return t > max ? t : max
    }, 0)

    // Never move lastReadTime backwards; take the max of current and this type's latest
    const currentTs = lastReadTime ? new Date(lastReadTime).getTime() : 0
    const newTs = Math.max(currentTs, latestTypeTs + 1000)
    const newIso = new Date(newTs).toISOString()
    setLastReadTime(newIso)
    localStorage.setItem('messageBoardLastRead', newIso)
    setForceUpdate(prev => prev + 1)
  }

  const filteredMessages = (selectedType === 'all' 
    ? messages 
    : messages.filter(msg => msg.message_type === selectedType))
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const messageTypes = [
    { value: 'milestone', label: 'Milestones', count: getUnreadCountByType('milestone'), total: messages.filter(m => m.message_type === 'milestone').length },
    { value: 'encouragement', label: 'Encouragement', count: getUnreadCountByType('encouragement'), total: messages.filter(m => m.message_type === 'encouragement').length },
    { value: 'prayer', label: 'Prayer Requests', count: getUnreadCountByType('prayer'), total: messages.filter(m => m.message_type === 'prayer').length },
    { value: 'testimony', label: 'Testimonies', count: getUnreadCountByType('testimony'), total: messages.filter(m => m.message_type === 'testimony').length },
    { value: 'question', label: 'Questions', count: getUnreadCountByType('question'), total: messages.filter(m => m.message_type === 'question').length },
    { value: 'reminder', label: 'Reminders', count: getUnreadCountByType('reminder'), total: messages.filter(m => m.message_type === 'reminder').length },
    { value: 'announcement', label: 'Announcements', count: getUnreadCountByType('announcement'), total: messages.filter(m => m.message_type === 'announcement').length },
    { value: 'all', label: 'All Messages', count: getUnreadCount(), total: messages.length }
  ]

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-purple-200">Loading group messages...</p>
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
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="relative">
              <MessageCircle className="h-8 w-8 text-yellow-400" />
              {getUnreadCount() > 0 && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-purple-900 font-extrabold">{getUnreadCount()}</span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-white">Message Board</h2>
                {getUnreadCount() > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-purple-900 text-xs font-extrabold rounded-full animate-pulse">
                    {getUnreadCount()} NEW
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
            {getUnreadCount() > 0 && (
              <button
                onClick={markAsRead}
                className="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Mark All as Read
              </button>
            )}
            <button
              onClick={() => setShowCreateMessage(true)}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 min-h-[44px] bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Post Message</span>
            </button>
          </div>
        </div>
        
        {/* Compact Filter - Dropdown */}
        <div className="mb-4">
          <label className="block text-purple-200 text-sm font-medium mb-2">Filter messages</label>
          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => {
                const v = e.target.value
                setSelectedType(v)
                if (v !== 'all') {
                  markTypeAsRead(v)
                }
              }}
              className="flex-1 px-3 py-2 min-h-[44px] bg-purple-700/50 border border-purple-600/30 rounded-lg text-white"
            >
              {messageTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} {type.count > 0 ? `(${type.count})` : `(${type.total})`}
                </option>
              ))}
            </select>
          </div>
        </div>
        
      </div>

      {/* Create Message Modal */}
      {showCreateMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-purple-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">Create New Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">Content</label>
                <textarea
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400"
                  placeholder="Share your message with the group..."
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateMessage(false)}
                className="flex-1 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMessage}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
              >
                Post Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="h-16 w-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-purple-200 mb-2">No messages yet</h3>
          <p className="text-purple-300">Check back later for updates from your group!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-6 rounded-xl border ${getMessageTypeColor(message.message_type)}`}
            >
              {/* Message Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getMessageTypeIcon(message.message_type)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-white">{message.title}</h3>
                      {isMessageUnread(message.created_at) && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-purple-300">
                      <span>by {message.author_name}</span>
                      {message.message_source === 'user' && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Member</span>
                      )}
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {message.comment_count && message.comment_count > 0 && (
                    <button
                      onClick={() => setExpandedMessage(expandedMessage === message.id ? null : message.id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span className="text-xs">{message.comment_count}</span>
                    </button>
                  )}
                  {localStorage.getItem('adminToken') && (
                    <button
                      onClick={() => handleAdminDelete(message)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Message Content */}
              <p className="text-purple-200 leading-relaxed mb-4">{message.content}</p>

              {/* Comments Section */}
              {expandedMessage === message.id && (
                <div className="mt-4 pt-4 border-t border-purple-600/20">
                  {/* Comments List */}
                  {message.comments && message.comments.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {message.comments.map((comment) => (
                        <div key={comment.id} className="bg-purple-700/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-purple-300" />
                            <span className="text-sm font-medium text-purple-200">{comment.user_name}</span>
                            <span className="text-xs text-purple-400">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-purple-200 text-sm">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment Form */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newComment[message.id] || ''}
                      onChange={(e) => setNewComment({ ...newComment, [message.id]: e.target.value })}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 bg-purple-700/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-yellow-400"
                    />
                    <button
                      onClick={() => handleAddComment(message.id)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Expand/Collapse Comments Button */}
              {message.comment_count && message.comment_count > 0 && (
                <button
                  onClick={() => setExpandedMessage(expandedMessage === message.id ? null : message.id)}
                  className="text-sm text-purple-300 hover:text-purple-200 transition-colors"
                >
                  {expandedMessage === message.id ? 'Hide comments' : `View ${message.comment_count} comment${message.comment_count > 1 ? 's' : ''}`}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={fetchMessages}
          className="w-full sm:w-auto px-6 py-2 min-h-[44px] bg-yellow-500 hover:bg-yellow-600 text-purple-900 font-semibold rounded-lg transition-colors"
        >
          Refresh Messages
        </button>
      </div>
    </motion.div>
  )
}

export default MessageBoard

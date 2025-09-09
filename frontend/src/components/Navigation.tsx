import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const Navigation = () => {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  
  // Show navigation on all pages including admin

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/messages', label: 'Messages' },
    { to: '/awards', label: 'Awards' },
    { to: '/donate', label: 'Donate' },
    { to: '/login', label: 'Login' },
    { to: '/admin', label: 'Admin' },
  ]

  // Unread messages badge for Messages tab
  const [unread, setUnread] = useState<number>(0)
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('userToken')
        if (!token) { setUnread(0); return }
        const res = await fetch('/api/auth/my-group-all-messages', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        const messages: any[] = data?.data?.messages || []
        const lastRead = localStorage.getItem('messageBoardLastRead')
        const count = lastRead
          ? messages.filter(m => new Date(m.created_at) > new Date(lastRead)).length
          : messages.length
        setUnread(count)
      } catch {
        setUnread(0)
      }
    }
    fetchUnread()
    // Update when tab regains focus or storage changes
    const onFocus = () => fetchUnread()
    const onStorage = (e: StorageEvent) => { if (e.key === 'messageBoardLastRead') fetchUnread() }
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-purple-800 to-purple-700 backdrop-blur-sm border-b border-purple-600/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          {/* Left: brand */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-white" />
            <span className="hidden md:inline text-lg font-heading text-white">
              <span className="text-white">The </span>
              <span className="text-amber-500">Bible Bus</span>
            </span>
          </Link>

          {/* Center: brand title (mobile only) */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-xl font-heading text-white hover:text-purple-200 transition-colors md:hidden"
          >
            <span className="text-white">The </span>
            <span className="text-amber-500">Bible Bus</span>
          </Link>

          {/* Desktop links */}
          <div className="ml-auto hidden md:flex items-center space-x-8">
            {navItems.map(item => {
              const isMessages = item.to === '/messages'
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative transition-colors ${
                    isActive(item.to)
                      ? 'text-amber-500 font-semibold'
                      : 'text-white hover:text-purple-200'
                  }`}
                >
                  <span className="inline-flex items-center">
                    {item.label}
                    {isMessages && unread > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white">
                        {unread}
                      </span>
                    )}
                  </span>
                </Link>
              )
            })}
            <Link
              to="/register"
              className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Join Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <motion.button
            aria-label="Toggle menu"
            className="md:hidden ml-auto p-2 rounded-lg text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
            onClick={() => setOpen(!open)}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1 }}
          >
            <motion.div
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </motion.div>
          </motion.button>
        </div>
      </div>
      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-purple-800/95 backdrop-blur-sm border-t border-purple-700/50 overflow-hidden"
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="px-4 py-3 space-y-1"
            >
              {navItems.map((item, index) => {
                const isMessages = item.to === '/messages'
                return (
                  <motion.div
                    key={item.to}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link
                      to={item.to}
                      className={`block px-3 py-3 rounded-lg transition-all duration-200 ${
                        isActive(item.to)
                          ? 'text-amber-400 bg-purple-700/60'
                          : 'text-white hover:text-amber-300 hover:bg-purple-700/50'
                      }`}
                      onClick={() => setOpen(false)}
                    >
                      <span className="inline-flex items-center">
                        {item.label}
                        {isMessages && unread > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.3 }}
                            className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold rounded-full bg-red-600 text-white"
                          >
                            {unread}
                          </motion.span>
                        )}
                      </span>
                    </Link>
                  </motion.div>
                )
              })}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, delay: navItems.length * 0.05 }}
              >
                <Link
                  to="/register"
                  className="block px-3 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold transition-all duration-200"
                  onClick={() => setOpen(false)}
                >
                  Join Now
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navigation

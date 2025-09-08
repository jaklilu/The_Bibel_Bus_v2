import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Menu, X } from 'lucide-react'
import { useState } from 'react'

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

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-purple-800 to-purple-700 backdrop-blur-sm border-b border-purple-600/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">
          {/* Left: icon */}
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-white" />
          </Link>

          {/* Center: brand title */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-xl font-heading text-white hover:text-purple-200 transition-colors"
          >
            <span className="text-white">The </span>
            <span className="text-amber-500">Bible Bus</span>
          </Link>

          {/* Desktop links */}
          <div className="ml-auto hidden md:flex items-center space-x-8">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition-colors ${
                  isActive(item.to)
                    ? 'text-amber-500 font-semibold'
                    : 'text-white hover:text-purple-200'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/register"
              className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Join Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            aria-label="Toggle menu"
            className="md:hidden ml-auto p-2 rounded-lg text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden bg-purple-800/95 backdrop-blur-sm border-t border-purple-700/50">
          <div className="px-4 py-3 space-y-1">
            {navItems.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={`block px-3 py-2 rounded-lg ${
                  isActive(item.to)
                    ? 'text-amber-400 bg-purple-700/60'
                    : 'text-white hover:text-amber-300 hover:bg-purple-700/50'
                }`}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/register"
              className="block px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold"
              onClick={() => setOpen(false)}
            >
              Join Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navigation

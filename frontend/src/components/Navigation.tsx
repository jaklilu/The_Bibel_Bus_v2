import { Link, useLocation } from 'react-router-dom'
import { BookOpen } from 'lucide-react'

const Navigation = () => {
  const location = useLocation()
  
  // Show navigation on all pages including admin

  return (
                <nav className="bg-gradient-to-r from-purple-800 to-purple-700 backdrop-blur-sm border-b border-purple-600/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
                            <div className="flex items-center space-x-2">
                    <BookOpen className="h-8 w-8 text-white" />
                    <Link to="/" className="text-xl font-heading text-white hover:text-purple-200 transition-colors">
                      <span className="text-white">The </span>
                      <span className="text-amber-500">Bible Bus</span>
                    </Link>
                  </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`transition-colors ${
                                        location.pathname === '/'
                          ? 'text-amber-500 font-semibold'
                          : 'text-white hover:text-purple-200'
              }`}
            >
              Home
            </Link>
            <Link 
              to="/awards" 
              className={`transition-colors ${
                                        location.pathname === '/awards'
                          ? 'text-amber-500 font-semibold'
                          : 'text-white hover:text-purple-200'
              }`}
            >
              Awards
            </Link>
            <Link 
              to="/donate" 
              className={`transition-colors ${
                                        location.pathname === '/donate'
                          ? 'text-amber-500 font-semibold'
                          : 'text-white hover:text-purple-200'
              }`}
            >
              Donate
            </Link>
            <Link 
              to="/login" 
              className={`transition-colors ${
                                        location.pathname === '/login'
                          ? 'text-amber-500 font-semibold'
                          : 'text-white hover:text-purple-200'
              }`}
            >
              Login
            </Link>
            <Link 
              to="/admin" 
              className={`transition-colors ${
                                        location.pathname === '/admin'
                          ? 'text-amber-500 font-semibold'
                          : 'text-purple-200 hover:text-white'
              }`}
            >
              Admin
            </Link>
                                <Link
                      to="/register"
                      className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold px-6 py-2 rounded-lg transition-colors"
                    >
                      Join Now
                    </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation

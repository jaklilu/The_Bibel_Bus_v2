import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import MessageBoard from '../components/MessageBoard'

const Messages = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-heading text-white">Messages</h1>
          </div>
          <Link
            to="/dashboard"
            className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg"
          >
            Back to Dashboard
          </Link>
        </motion.div>

        <MessageBoard />
      </div>
    </div>
  )
}

export default Messages



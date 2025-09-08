import { motion } from 'framer-motion'
import MessageBoard from '../components/MessageBoard'

const Messages = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-heading text-white">Messages</h1>
          <p className="text-purple-200">All your group messages in one place</p>
        </motion.div>

        <MessageBoard />
      </div>
    </div>
  )
}

export default Messages



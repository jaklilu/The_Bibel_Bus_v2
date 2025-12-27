import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {  Play, ArrowRight, } from 'lucide-react'

// Force frontend rebuild to trigger both Netlify and Render deployments

const Home = () => {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })
  const [currentGroup, setCurrentGroup] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch current active group from backend
  useEffect(() => {
    const fetchCurrentGroup = async () => {
      try {
        const response = await fetch('/api/auth/public/current-group')
        const data = await response.json()
        if (data.success && data.data) {
          setCurrentGroup(data.data)
        }
      } catch (error) {
        console.error('Error fetching current group:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCurrentGroup()
  }, [])

  useEffect(() => {
    if (!currentGroup) return

    const groupStartDate = new Date(currentGroup.start_date + 'T00:00:00')
    const registrationDeadline = new Date(currentGroup.registration_deadline + 'T23:59:59')
    
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distanceToStart = groupStartDate.getTime() - now
      const distanceToDeadline = registrationDeadline.getTime() - now
      
      // If group hasn't started yet, count down to start date
      if (distanceToStart > 0) {
        setCountdown({
          days: Math.floor(distanceToStart / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distanceToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distanceToStart % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distanceToStart % (1000 * 60)) / 1000)
        })
      }
      // If group has started but registration is still open, count down to registration deadline
      else if (distanceToDeadline > 0) {
        setCountdown({
          days: Math.floor(distanceToDeadline / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distanceToDeadline % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distanceToDeadline % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distanceToDeadline % (1000 * 60)) / 1000)
        })
      } else {
        // Registration has closed
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [currentGroup])

  return (
    <div className="min-h-screen">
      {/* Hero Section with Bible Bus Image */}
      <section className="text-center py-10 md:py-16 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
                     {/* Bible Bus Logo Image */}
           <motion.div
             initial={{ opacity: 0, scale: 0.8, y: -20 }}
             animate={{ 
               opacity: 1, 
               scale: 1, 
               y: [0, -15, 0]
             }}
             transition={{ 
               duration: 1.2, 
               delay: 0.3,
               y: {
                 duration: 2,
                 repeat: Infinity,
                 ease: "easeInOut"
               }
             }}
             className="mb-8"
           >
             <div className="relative inline-block">
               <img 
                 src="/BibleBusLogo.jpg" 
                 alt="The Bible Bus - Customized Yellow School Bus"
                 className="w-64 sm:w-80 h-auto rounded-lg shadow-2xl mx-auto"
                 style={{ maxHeight: '300px' }}
               />
             </div>
           </motion.div>

                     {/* Main Heading */}
           <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.5 }}
             className="text-2xl sm:text-3xl md:text-4xl font-heading text-amber-500 mb-1 text-center leading-tight"
           >
             Getting to know God,{' '}
             <span className="text-white font-heading drop-shadow-lg">intimately.</span>
           </motion.h1>
           
           {/* Tagline */}
           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.7 }}
             className="text-xl font-tagline text-amber-500 mb-8 text-right pr-4 md:pr-0 md:w-fit md:ml-auto md:mr-[240px] md:text-right"
           >
             It's a journey...
           </motion.p>

           {/* Countdown Section - moved up */}
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8, delay: 0.9 }}
             className="max-w-4xl mx-auto"
           >
             <div className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-purple-700/30">
               {loading ? (
                 <p className="text-white text-center">Loading group information...</p>
               ) : currentGroup ? (
                 <>
                   <h2 className="text-xl font-bold text-white text-center mb-2">
                     {currentGroup.name}
                   </h2>
                   <h3 className="text-lg font-semibold text-amber-500 text-center mb-4">
                     {new Date(currentGroup.start_date).getTime() > new Date().getTime() 
                       ? 'Group Starts In' 
                       : 'Registration Closes In'}
                   </h3>
                   <p className="text-base text-white text-center mb-6">
                     {new Date(currentGroup.start_date).getTime() > new Date().getTime()
                       ? new Date(currentGroup.start_date).toLocaleDateString('en-US', { 
                           weekday: 'long', 
                           year: 'numeric', 
                           month: 'long', 
                           day: 'numeric' 
                         })
                       : new Date(currentGroup.registration_deadline).toLocaleDateString('en-US', { 
                           weekday: 'long', 
                           year: 'numeric', 
                           month: 'long', 
                           day: 'numeric' 
                         })
                     }
                   </p>
                 </>
               ) : (
                 <p className="text-white text-center">No active group found</p>
               )}
               
               {/* Countdown Timer */}
               <div className="grid grid-cols-4 gap-2 md:gap-4 mb-3">
                 <div className="text-center">
                   <div className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-12 md:h-14 flex flex-col justify-center border border-purple-600">
                     <div className="text-lg md:text-xl font-bold text-amber-500">{countdown.days}</div>
                     <div className="text-xs text-white font-medium leading-none">DAYS</div>
                   </div>
                 </div>
                 <div className="text-center">
                   <div className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-12 md:h-14 flex flex-col justify-center border border-purple-600">
                     <div className="text-lg md:text-xl font-bold text-amber-500">{countdown.hours}</div>
                     <div className="text-xs text-white font-medium leading-none">HOURS</div>
                   </div>
                 </div>
                 <div className="text-center">
                   <div className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-12 md:h-14 flex flex-col justify-center border border-purple-600">
                     <div className="text-lg md:text-xl font-bold text-amber-500">{countdown.minutes}</div>
                     <div className="text-xs text-white font-medium leading-none">MINUTES</div>
                   </div>
                 </div>
                 <div className="text-center">
                   <motion.div
                     initial={{ opacity: 0.8, backgroundColor: '#3b0764' }}
                     animate={{ opacity: [0.8, 1, 0.8], backgroundColor: ['#3b0764', '#4c1d95', '#3b0764'] }}
                     transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                     className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-12 md:h-14 flex flex-col justify-center border border-purple-600"
                   >
                     <div className="text-lg md:text-xl font-bold text-amber-500">{countdown.seconds}</div>
                     <div className="text-xs text-white font-medium leading-none">SECONDS</div>
                   </motion.div>
                 </div>
               </div>
               
               {currentGroup && (
                 <p className="text-xs text-white text-center mb-4">
                   Group started {new Date(currentGroup.start_date).toLocaleDateString()} • {currentGroup.member_count} / {currentGroup.max_members} members
                 </p>
               )}
             </div>
           </motion.div>

           {/* Action Buttons - Simplified Two-Button System */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 1.1 }}
             className="mt-6"
           >
             <div className="flex flex-col sm:flex-col gap-4 justify-center max-w-md mx-auto">
               {/* New Users - Register Now */}
               <motion.div
                 animate={{ 
                   opacity: [0.7, 1, 0.7]
                 }}
                 transition={{ 
                   duration: 2,
                   repeat: Infinity,
                   ease: "easeInOut"
                 }}
               >
                 <Link
                   to="/register"
                   className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-bold px-8 md:px-10 py-3.5 md:py-4 rounded-lg transition-colors flex flex-col items-center justify-center space-y-1 shadow-lg text-lg w-full"
                 >
                   <span>Register</span>
                   <span className="text-sm font-normal opacity-80">New to The Bible Bus?</span>
                   <ArrowRight className="h-5 w-5 mt-1" />
                 </Link>
               </motion.div>

               {/* Existing Users - Login */}
               <Link
                 to="/login"
                 className="bg-purple-700 hover:bg-purple-800 text-white font-semibold px-8 md:px-10 py-3.5 md:py-4 rounded-lg transition-colors flex flex-col items-center justify-center space-y-1 text-lg w-full"
               >
                 <span>Login</span>
                 <span className="text-sm font-normal opacity-80">Returning member?</span>
                 <ArrowRight className="h-5 w-5 mt-1" />
               </Link>
             
               {/* Watch Introduction - Secondary Action */}
               <a 
                 href="https://www.youtube.com/watch?v=c-VWZN76hoc"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 md:px-10 py-2.5 md:py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-base w-full border border-blue-500 shadow-lg"
               >
                 <Play className="h-4 w-4" />
                 <span>Watch Introduction Video</span>
               </a>
             </div>
           </motion.div>
        </motion.div>
      </section>



      {/* Journey to the Heart of God Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-6">
              Journey to the Heart of God
            </h2>
            <p className="text-lg text-purple-200 leading-relaxed max-w-4xl mx-auto">
              The Bible Bus is more than a reading plan—it's a transformative journey that brings you closer to the heart of God through His Word.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">What is The Bible Bus?</h3>
              <p className="text-white">A year-long Bible reading journey that takes you through the entire Scripture, from Genesis to Revelation, in just 15 minutes daily.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">Why embark on this journey?</h3>
              <p className="text-white">To cultivate an intimate relationship with God and discover His heart through the pages of Scripture.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">What qualities do passengers need?</h3>
              <p className="text-white">A heart committed to the journey and the integrity to stay faithful through all 365 days of discovery.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">When does the journey begin?</h3>
              <p className="text-white">New groups depart quarterly throughout the year—January, April, July, and October. Your next adventure awaits!</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.0 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">Who guides this journey?</h3>
              <p className="text-white">The Holy Spirit Himself serves as our faithful guide, illuminating truth and revealing God's heart at every turn.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">How long is this sacred journey?</h3>
              <p className="text-white">A full year of discovery—365 days from Genesis to Revelation, with just 15 minutes of daily commitment.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">What investment is required?</h3>
              <p className="text-white">Only 15 precious minutes each day—a small offering of time that yields eternal dividends in spiritual growth.</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">What treasures await you?</h3>
              <ul className="text-white space-y-1">
                <li>• Deep knowledge of Scripture's truths and wisdom</li>
                <li>• Personal reflection on your faith and beliefs</li>
                <li>• Alignment between what you believe and how you live</li>
                <li>• The profound satisfaction of completing the entire Bible</li>
                <li>• Unwavering support from fellow travelers</li>
                <li>• The joy of reaching our destination together</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center px-12 py-5 text-xl font-bold text-green-800 bg-gradient-to-b from-amber-300 to-orange-500 hover:from-amber-400 hover:to-orange-600 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              <span>Start Your Journey Today</span>
              <ArrowRight className="h-6 w-6 ml-3" />
            </Link>
          </motion.div>
        </div>
      </section>


    </div>
  )
}

export default Home

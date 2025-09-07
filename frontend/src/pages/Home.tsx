import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {  Play, ArrowRight, } from 'lucide-react'

const Home = () => {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Calculate next group start date (quarterly: Jan 1, Apr 1, Jul 1, Oct 1)
  const getNextGroupStart = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const quarters = [
      new Date(currentYear, 0, 1),   // Jan 1
      new Date(currentYear, 3, 1),   // Apr 1
      new Date(currentYear, 6, 1),   // Jul 1
      new Date(currentYear, 9, 1)    // Oct 1
    ]
    
    let nextStart = quarters.find(date => date > now)
    if (!nextStart) {
      nextStart = new Date(currentYear + 1, 0, 1) // Next year Jan 1
    }
    
    return nextStart
  }

  useEffect(() => {
    const nextStart = getNextGroupStart()
    const registrationEnd = new Date(nextStart.getTime() + (17 * 24 * 60 * 60 * 1000))
    
    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distanceToStart = nextStart.getTime() - now
      const distanceToRegistrationEnd = registrationEnd.getTime() - now
      
      // If group hasn't started yet, count down to start
      if (distanceToStart > 0) {
        setCountdown({
          days: Math.floor(distanceToStart / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distanceToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distanceToStart % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distanceToStart % (1000 * 60)) / 1000)
        })
      } 
      // If group has started but registration is still open, count down to registration end
      else if (distanceToRegistrationEnd > 0) {
        setCountdown({
          days: Math.floor(distanceToRegistrationEnd / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distanceToRegistrationEnd % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distanceToRegistrationEnd % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distanceToRegistrationEnd % (1000 * 60)) / 1000)
        })
      }
      // If registration has closed, show zeros
      else {
        setCountdown({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        })
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const nextStart = getNextGroupStart()
  const registrationEnd = new Date(nextStart.getTime() + (17 * 24 * 60 * 60 * 1000))

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
             className="text-xl font-tagline text-amber-500 mb-4 text-right pr-4 md:pr-0 md:text-left md:ml-[300px]"
           >
             It's a journey...
           </motion.p>
        </motion.div>
      </section>

      {/* Countdown Section */}
      <section className="py-6 md:py-8 px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-5 md:p-8 border border-purple-700/30">
            <h2 className="text-2xl font-bold text-white text-center mb-6">
              {new Date().getTime() < getNextGroupStart().getTime() ? 'Next Group Starts' : 'Registration Closes'}
            </h2>
            <p className="text-lg text-white text-center mb-8">
              {nextStart.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            
            {/* Countdown Timer */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4">
              <div className="text-center">
                <div className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-14 md:h-16 flex flex-col justify-center border border-purple-600">
                  <div className="text-xl md:text-2xl font-bold text-amber-500">{countdown.days}</div>
                  <div className="text-xs md:text-sm text-white font-medium leading-none">DAYS</div>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-14 md:h-16 flex flex-col justify-center border border-purple-600">
                  <div className="text-xl md:text-2xl font-bold text-amber-500">{countdown.hours}</div>
                  <div className="text-xs md:text-sm text-white font-medium leading-none">HOURS</div>
                </div>
              </div>
              <div className="text-center">
                <div className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-14 md:h-16 flex flex-col justify-center border border-purple-600">
                  <div className="text-xl md:text-2xl font-bold text-amber-500">{countdown.minutes}</div>
                  <div className="text-xs md:text-sm text-white font-medium leading-none">MINUTES</div>
                </div>
              </div>
              <div className="text-center">
                <motion.div
                  key={countdown.seconds}
                  initial={{ rotateX: -45, scale: 0.98, opacity: 0 }}
                  animate={{ rotateX: 0, scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
                  className="bg-purple-900/80 rounded-lg px-3 py-2 md:px-4 md:py-3 h-14 md:h-16 flex flex-col justify-center border border-purple-600"
                >
                  <div className="text-xl md:text-2xl font-bold text-amber-500">{countdown.seconds}</div>
                  <div className="text-xs md:text-sm text-white font-medium leading-none">SECONDS</div>
                </motion.div>
              </div>
            </div>
            
            <p className="text-sm text-white text-center mb-8">
              Registration closes 17 days after start date • {registrationEnd.toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Action Buttons Section */}
      <section className="py-6 md:py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
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
                  className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-bold px-8 md:px-10 py-3.5 md:py-4 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg text-lg"
                >
                  <span>Register Now</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </motion.div>
            
                          <a 
              href="https://www.youtube.com/watch?v=c-VWZN76hoc"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-purple-700 hover:bg-amber-500 hover:text-purple-900 text-white font-semibold px-8 md:px-10 py-3.5 md:py-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-lg"
            >
              <Play className="h-5 w-5" />
              <span>Watch Introduction</span>
            </a>
          </div>
        </div>
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
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.3 }}
              className="bg-purple-800/60 backdrop-blur-sm rounded-xl p-6 border border-purple-700/40"
            >
              <h3 className="text-xl font-semibold text-amber-500 mb-3">What investment is required?</h3>
              <p className="text-white">Only 15 precious minutes each day—a small offering of time that yields eternal dividends in spiritual growth.</p>
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

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, DollarSign, Heart, Shield, Lock } from 'lucide-react'

const Donate = () => {
  const [donationType, setDonationType] = useState<'one-time' | 'monthly'>('one-time')
  const [donationAmount, setDonationAmount] = useState<number | string>('')
  const [donorInfo, setDonorInfo] = useState({
    fullName: '',
    email: '',
    anonymous: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const presetAmounts = [25, 50, 100, 250, 500, 1000]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!donationAmount || !donorInfo.fullName || !donorInfo.email) {
      alert('Please fill in all required fields and select a donation amount.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donor_name: donorInfo.fullName,
          donor_email: donorInfo.email,
          amount: totalAmount,
          type: donationType,
          anonymous: donorInfo.anonymous
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Thank you for your donation of $${totalAmount.toFixed(2)}! Your donation has been recorded. We'll contact you soon to complete the payment process.`)
        
        // Reset form
        setDonationAmount('')
        setDonorInfo({
          fullName: '',
          email: '',
          anonymous: false
        })
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error?.message || 'Failed to process donation. Please try again.'}`)
      }
    } catch (error) {
      console.error('Error submitting donation:', error)
      alert('Failed to process donation. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setDonorInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const totalAmount = typeof donationAmount === 'number' ? donationAmount : parseFloat(donationAmount as string) || 0

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-4">Make a Donation</h1>
          <p className="text-xl text-purple-200">Support The Bible Bus and help us continue our mission</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Donation Type */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Donation Type</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDonationType('one-time')}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  donationType === 'one-time'
                    ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                    : 'border-purple-600 bg-purple-700/30 text-white hover:border-purple-500'
                }`}
              >
                <div className="text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">One-Time Gift</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setDonationType('monthly')}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  donationType === 'monthly'
                    ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                    : 'border-purple-600 bg-purple-700/30 text-white hover:border-purple-500'
                }`}
              >
                <div className="text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Monthly Support</div>
                </div>
              </button>
            </div>
          </motion.div>

          {/* Donation Amount */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Donation Amount</h2>
            
            {/* Preset Amounts */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setDonationAmount(amount)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    donationAmount === amount
                      ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                      : 'border-purple-600 bg-purple-700/30 text-white hover:border-purple-500'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400" />
              <input
                type="number"
                placeholder="Custom amount"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                min="1"
                step="0.01"
              />
            </div>
          </motion.div>

          {/* Donor Information */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Donor Information</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-white mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={donorInfo.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={donorInfo.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-purple-700/50 border border-purple-600 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="Email Address"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="anonymous"
                  checked={donorInfo.anonymous}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-yellow-400 bg-purple-700 border-purple-600 rounded focus:ring-yellow-400 focus:ring-2"
                />
                <span className="text-white">Make this donation anonymous</span>
              </label>
            </div>
          </motion.div>

          {/* Payment Method */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>
            
            <div className="space-y-4">
              <button
                type="button"
                className="w-full p-4 border-2 border-purple-600 bg-purple-700/30 rounded-lg text-white hover:border-purple-500 transition-colors flex items-center space-x-3"
              >
                <CreditCard className="h-6 w-6" />
                <span>Credit/Debit Card</span>
              </button>
              
              {(!donationAmount || !donorInfo.fullName || !donorInfo.email) && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 text-yellow-300">
                  Please fill in the donation amount and donor information above to enable card payment.
                </div>
              )}
            </div>
          </motion.div>

          {/* Donation Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30"
          >
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">Donation Summary</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white">
                  {donationType === 'one-time' ? 'One-Time Donation:' : 'Monthly Donation:'}
                </span>
                <span className="text-2xl font-bold text-yellow-400">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
              
              {donationType === 'monthly' && (
                <p className="text-purple-200 text-sm">
                  This amount will be charged monthly until you cancel.
                </p>
              )}
            </div>
          </motion.div>

          {/* Security & Submit */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="text-center space-y-6"
          >
            {/* Security Badges */}
            <div className="flex justify-center items-center space-x-6 text-purple-200">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm">SSL Secure</span>
              </div>
              <div className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span className="text-sm">PCI Compliant</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!donationAmount || !donorInfo.fullName || !donorInfo.email || isSubmitting}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-purple-900 font-semibold py-4 px-12 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isSubmitting ? 'Processing...' : 'Complete Donation'}
            </button>

            <p className="text-purple-300 text-sm max-w-2xl mx-auto">
              Your donation is secure and will be processed by our trusted payment partners. 
              You will receive a confirmation email with your donation receipt.
            </p>
          </motion.div>
        </form>
      </div>
    </div>
  )
}

export default Donate

import { useState } from 'react'

const LegacyIntake = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const webhookUrl = (import.meta as any).env?.VITE_N8N_WEBHOOK_URL || 'https://jakilu.app.n8n.cloud/webhook/9b83a615-173d-4b7a-b992-af9554463898'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    if (trimmedName.length < 2) { setError('Please enter your full name.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Please enter a valid email.'); return }
    try {
      setLoading(true)
      const body = new URLSearchParams({
        name: trimmedName,
        email: trimmedEmail,
        source: 'alumni-intake',
        userAgent: navigator.userAgent
      })
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString()
      })
      if (!res.ok) throw new Error('Submission failed')
      setSuccess('Thank you! We received your information and will create your account. Watch your email for next steps.')
      setName('')
      setEmail('')
    } catch (e) {
      setError('Could not submit right now. Please try again in a moment or email us directly.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col items-center mb-4">
          <img src="/BibleBusLogo.jpg" alt="The Bible Bus" className="h-24 w-32 rounded-2xl border border-purple-500/40 mb-2 object-cover" />
          <div className="text-amber-400 font-semibold">The Bible Bus</div>
        </div>
        <h1 className="text-3xl font-heading text-white text-center mb-2">Alumni Intake</h1>
        <p className="text-purple-100 text-center mb-6">We’re moving the Bible Bus to a new platform. Please share your info so we can create your account and place you in the right group.</p>

        {success && (
          <div className="mb-4 p-3 rounded-lg border border-green-500/40 bg-green-900/20 text-green-200 text-sm">{success}</div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/40 bg-red-900/20 text-red-200 text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="bg-purple-800/60 border border-purple-700/40 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-100 mb-1">Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="First Last" className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-900/40 text-white placeholder-purple-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-100 mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full px-3 py-2 border border-purple-600 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-purple-900/40 text-white placeholder-purple-300" />
          </div>
          <button disabled={loading} type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg transition-colors">{loading ? 'Submitting…' : 'Submit'}</button>
          <p className="text-xs text-purple-200/80 text-center">By submitting, you agree to be contacted about your Bible Bus account setup.</p>
        </form>
      </div>
    </div>
  )
}

export default LegacyIntake



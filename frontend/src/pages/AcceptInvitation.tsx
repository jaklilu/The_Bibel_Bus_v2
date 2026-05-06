import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader, CheckCircle, AlertCircle } from 'lucide-react'

const AcceptInvitation = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupIdRaw = searchParams.get('groupId') || searchParams.get('g')
  const groupId = groupIdRaw ? parseInt(groupIdRaw, 10) : NaN

  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('userToken')

    if (!Number.isFinite(groupId)) {
      setError('This link is missing a group id. Ask your leader for the correct link.')
      return
    }

    if (!token) {
      // Bounce to Register Step 2 to establish a session, then come right back here.
      navigate(`/register?step=email&next=accept&groupId=${groupId}`, { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        setError('')
        const res = await fetch('/api/auth/accept-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ groupId }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return

        if (data?.success) {
          setDone(true)
          const url = data?.data?.youversion_url
          if (typeof url === 'string' && url.trim()) {
            window.location.assign(url)
            return
          }
          // If the group doesn't have a YouVersion link, fall back to dashboard.
          window.setTimeout(() => navigate('/dashboard', { replace: true }), 800)
          return
        }

        setError(data?.error?.message || 'Could not accept invitation. Please try again.')
      } catch {
        if (!cancelled) setError('Network error. Please try again.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [groupId, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700 px-4 py-10 pb-16">
      <div className="max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-600/40 shadow-xl"
        >
          {!error && !done && (
            <div className="text-center">
              <Loader className="h-10 w-10 animate-spin text-amber-400 mx-auto mb-3" />
              <h1 className="text-xl font-semibold text-white">Accepting your invitation…</h1>
              <p className="text-sm text-purple-200 mt-2">
                One moment while we connect your account to the reading plan.
              </p>
            </div>
          )}

          {done && !error && (
            <div className="text-center">
              <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <h1 className="text-xl font-semibold text-white">Accepted</h1>
              <p className="text-sm text-purple-200 mt-2">Opening your YouVersion plan…</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <AlertCircle className="h-10 w-10 text-red-300 mx-auto mb-3" />
              <h1 className="text-xl font-semibold text-white">Couldn’t accept invitation</h1>
              <p className="text-sm text-red-200 mt-2">{error}</p>
              <button
                type="button"
                onClick={() => navigate('/register?step=email', { replace: true })}
                className="mt-5 w-full py-3 rounded-xl font-semibold text-purple-900 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 transition-colors"
              >
                Go to sign-in
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default AcceptInvitation


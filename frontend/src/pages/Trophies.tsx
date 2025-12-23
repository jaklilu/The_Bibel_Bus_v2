import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Gem, Crown, Star, Shield, Award as AwardIcon, ChevronDown, ChevronRight } from 'lucide-react'

const Trophies = () => {
  const navigate = useNavigate()
  const [name, setName] = useState<string>('')
  const [count, setCount] = useState<number>(0)
  const [publicList, setPublicList] = useState<Array<{id:number;name:string;trophies_count:number;tier:string;avatar_url?:string|null}>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [open, setOpen] = useState<Record<string, boolean>>({ diamond: false, platinum: false, gold: false, silver: false, bronze: false })
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)

  useEffect(() => {
    // Check if user is logged in (optional - page is public)
    const token = localStorage.getItem('userToken')
    setIsLoggedIn(!!token)
    
    if (token) {
      const stored = localStorage.getItem('userData')
      if (stored) {
        try {
          const u = JSON.parse(stored)
          setName(u.name)
          setCount(u.trophies_count || 0)
        } catch {}
      }
    }
    
    // Fetch public trophies list (no auth required)
    ;(async () => {
      try {
        const res = await fetch('/api/auth/public/trophies')
        const data = await res.json()
        if (data?.success) setPublicList(data.data)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const grouped = useMemo(() => {
    const tiers: Record<string, Array<{name:string;count:number;avatar?:string|null}>> = { diamond: [], platinum: [], gold: [], silver: [], bronze: [] }
    for (const r of publicList) {
      tiers[r.tier] = tiers[r.tier] || []
      tiers[r.tier].push({ name: r.name, count: r.trophies_count, avatar: r.avatar_url || null })
    }
    return tiers
  }, [publicList])

  const toggle = (key: string) => setOpen(prev => {
    const isOpening = !prev[key]
    return {
      diamond: false,
      platinum: false,
      gold: false,
      silver: false,
      bronze: false,
      [key]: isOpening
    } as Record<string, boolean>
  })

  const tierConfigs: Record<string, { label: string; gradient: string; border: string; icon: JSX.Element; accent: string; subtitle: string }> = {
    diamond: {
      label: 'Diamond (10+)',
      gradient: 'from-cyan-500/30 via-blue-500/20 to-purple-500/30',
      border: 'border-cyan-400/40',
      icon: <Gem className="h-7 w-7 text-cyan-300" />,
      accent: 'text-cyan-200',
      subtitle: 'Elite finishers with 10+ completions'
    },
    platinum: {
      label: 'Platinum (7-9)',
      gradient: 'from-blue-500/25 via-slate-400/20 to-purple-500/25',
      border: 'border-blue-300/40',
      icon: <Shield className="h-7 w-7 text-blue-200" />,
      accent: 'text-blue-200',
      subtitle: 'Remarkable dedication (7–9 completions)'
    },
    gold: {
      label: 'Gold (4-6)',
      gradient: 'from-amber-400/30 via-yellow-500/20 to-orange-400/30',
      border: 'border-amber-300/50',
      icon: <Crown className="h-7 w-7 text-amber-300" />,
      accent: 'text-amber-300',
      subtitle: 'Consistent and inspiring achievement (4–6 completions)'
    },
    silver: {
      label: 'Silver (2-3)',
      gradient: 'from-gray-300/20 via-slate-300/10 to-purple-300/10',
      border: 'border-gray-200/40',
      icon: <Star className="h-7 w-7 text-gray-200" />,
      accent: 'text-gray-200',
      subtitle: 'Strong momentum and growth'
    },
    bronze: {
      label: 'Bronze (0-1)',
      gradient: 'from-orange-400/20 via-rose-400/10 to-purple-400/10',
      border: 'border-orange-300/40',
      icon: <AwardIcon className="h-7 w-7 text-orange-300" />,
      accent: 'text-orange-300',
      subtitle: 'Every journey starts with one step'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 via-purple-600 to-purple-700">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-4xl font-heading text-white mb-1">Awards</h1>
          {name && <p className="text-amber-400">{name}</p>}
        </motion.div>

        {/* Celebration hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 via-pink-500/10 to-purple-500/20 rounded-2xl border border-amber-400/30 p-6 mb-6 text-center"
        >
          {/* Confetti dots */}
          <div className="pointer-events-none absolute inset-0">
            {[...Array(30)].map((_, i) => (
              <span
                key={i}
                className="absolute block rounded-full opacity-40"
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                  width: 6 + (i % 4) * 2,
                  height: 6 + (i % 4) * 2,
                  background: ['#F59E0B','#F43F5E','#22C55E','#38BDF8','#A78BFA'][i % 5]
                }}
              />
            ))}
          </div>

          <div className="relative">
            <div className="text-amber-300 text-3xl font-extrabold mb-2">Congratulations!</div>
            <h2 className="text-white text-xl font-heading mb-2">These travelers have completed reading the entire Scripture</h2>
            <p className="text-purple-100/90 text-sm">Genesis to Revelation — this page is their acknowledgment. The number next to each traveler shows how many times they’ve read the entire Scripture.</p>
          </div>
        </motion.div>

        {isLoggedIn && count > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-purple-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-700/30 text-center mb-8">
            <div className="text-6xl font-extrabold text-amber-400">{count}</div>
            <div className="mt-2 text-purple-200">Your Completed Journey</div>
          </motion.div>
        )}

        {loading ? (
          <div className="text-center text-white">Loading…</div>
        ) : (
          <div className="space-y-4">
            {(['diamond','platinum','gold','silver','bronze'] as const).map((key) => {
              const cfg = tierConfigs[key]
              const members = (grouped as any)[key] as Array<{name:string;count:number;avatar?:string|null}>
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border ${cfg.border} bg-gradient-to-br ${cfg.gradient} p-0 relative overflow-hidden`}
                >
                  {/* Decorative glow */}
                  <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl"></div>

                  {/* Header (tap to expand) */}
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
                  >
                    <div className="flex items-center space-x-3">
                      {cfg.icon}
                      <div>
                        <h2 className={`text-xl font-heading ${cfg.accent}`}>{cfg.label}</h2>
                        <div className="text-sm text-purple-100/80">{cfg.subtitle}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-purple-100/80 text-sm">
                      <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                      {open[key] ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open[key] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-6 pb-6"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {members.length === 0 ? (
                            <div className="text-purple-100">No entries</div>
                          ) : (
                            members.map((m, idx) => (
                              <div key={idx} className="bg-purple-900/40 border border-purple-700/40 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-black/20">
                                <div className="flex items-center space-x-3">
                                  {m.avatar ? (
                                    <img src={m.avatar} alt={m.name} className="h-10 w-10 rounded-full object-cover border border-purple-600/50" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-purple-700/70 border border-purple-700/50 flex items-center justify-center text-white font-semibold">
                                      {m.name.slice(0,1).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="text-white">{m.name}</div>
                                </div>
                                <div className="text-amber-300 font-bold">{m.count}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          {isLoggedIn ? (
            <button onClick={() => navigate('/dashboard')} className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg">Back to Dashboard</button>
          ) : (
            <button onClick={() => navigate('/')} className="bg-amber-500 hover:bg-amber-600 text-purple-900 font-semibold py-2 px-4 rounded-lg">Back to Home</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Trophies



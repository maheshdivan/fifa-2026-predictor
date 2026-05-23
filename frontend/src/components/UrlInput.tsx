import { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, Zap } from 'lucide-react'

interface Props {
  onSubmit: (url: string) => void
  loading: boolean
}

export default function UrlInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/2026_FIFA_World_Cup')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) onSubmit(url.trim())
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="text-8xl mb-4">⚽</div>
        <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
          FIFA <span className="text-green-400">2026</span> Predictor
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          AI-powered World Cup predictions based on 20 years of FIFA history,
          current squad form, and top European league data.
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-8 w-full max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Wikipedia URL for the World Cup
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/2026_FIFA_World_Cup"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            <Zap className="w-5 h-5" />
            {loading ? 'Analysing…' : 'Predict the Tournament'}
          </button>
        </form>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: '🏆', label: '20 Years', sub: 'of WC history' },
            { icon: '👟', label: '5 Leagues', sub: 'player form data' },
            { icon: '🤖', label: 'Claude AI', sub: 'predictions engine' },
          ].map(item => (
            <div key={item.label} className="bg-slate-900 rounded-lg p-3">
              <div className="text-2xl mb-1">{item.icon}</div>
              <div className="text-xs font-bold text-slate-200">{item.label}</div>
              <div className="text-xs text-slate-500">{item.sub}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

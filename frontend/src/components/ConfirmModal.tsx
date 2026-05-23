import { motion } from 'framer-motion'
import { X, RefreshCw, AlertTriangle } from 'lucide-react'
import type { UserOverrides } from '../types'

interface Props {
  overrides: UserOverrides
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ overrides, onConfirm, onCancel }: Props) {
  const { groupOverrides, knockoutOverrides } = overrides
  const totalChanges = groupOverrides.length + knockoutOverrides.filter(o => o.newWinner !== o.originalWinner).length

  // Only keep real knockout overrides (not resets)
  const realKnockoutOverrides = knockoutOverrides.filter(o => o.newWinner !== o.originalWinner)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="relative card border-slate-600 w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Apply Your Changes?</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <p className="text-sm text-slate-400">
            You've made <span className="text-white font-semibold">{totalChanges} change{totalChanges !== 1 ? 's' : ''}</span> to the AI predictions.
            Claude will re-run the tournament simulation with your picks as fixed constraints.
          </p>

          {groupOverrides.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                🏟️ Group Stage Changes ({groupOverrides.length})
              </h3>
              <div className="space-y-2">
                {groupOverrides.map(ov => (
                  <div key={ov.group} className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-400 mb-1">Group {ov.group}</p>
                    <div className="flex flex-wrap gap-1">
                      {ov.teams.map((t, i) => (
                        <span
                          key={t.name}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            i === 0 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            i === 1 ? 'bg-green-800/30 text-green-500 border border-green-700/30' :
                            'bg-slate-700 text-slate-400'
                          }`}
                        >
                          {i + 1}. {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {realKnockoutOverrides.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                ⚔️ Knockout Stage Changes ({realKnockoutOverrides.length})
              </h3>
              <div className="space-y-2">
                {realKnockoutOverrides.map(ov => (
                  <div key={`${ov.round}-${ov.matchId}`} className="bg-slate-900 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5 capitalize">{ov.round.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-slate-300">
                        <span className="line-through text-slate-600">{ov.originalWinner}</span>
                        <span className="mx-2 text-slate-500">→</span>
                        <span className="text-amber-400 font-semibold">{ov.newWinner}</span>
                      </p>
                      <p className="text-xs text-slate-600">{ov.team1} vs {ov.team2}</p>
                    </div>
                    <span className="badge-gold text-xs">your pick</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <p className="text-xs text-amber-300/80">
              ⚠️ Claude will re-predict all downstream matches based on your picks.
              The quiz won't repeat — this re-run goes straight to results.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-700">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-sm font-semibold transition-all"
          >
            Go Back
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Confirm & Re-predict
          </button>
        </div>
      </motion.div>
    </div>
  )
}

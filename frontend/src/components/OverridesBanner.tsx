import { motion } from 'framer-motion'
import { RefreshCw, Trash2 } from 'lucide-react'

interface Props {
  changeCount: number
  onApply: () => void
  onDiscard: () => void
}

export default function OverridesBanner({ changeCount, onApply, onDiscard }: Props) {
  if (changeCount === 0) return null

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-slate-800 border border-amber-500/40 rounded-2xl px-5 py-3 shadow-2xl shadow-black/60"
    >
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center">
          {changeCount}
        </span>
        <span className="text-sm text-slate-200 font-semibold">
          {changeCount === 1 ? '1 change made' : `${changeCount} changes made`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onDiscard}
          className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-sm transition-colors px-3 py-1.5 rounded-xl hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
          Discard
        </button>
        <button
          onClick={onApply}
          className="btn-primary flex items-center gap-2 py-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Apply & Re-predict
        </button>
      </div>
    </motion.div>
  )
}

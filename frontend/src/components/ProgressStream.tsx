import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

interface ProgressItem {
  step: string
  message: string
  progress: number
}

interface Props {
  events: ProgressItem[]
  currentProgress: number
}

const STEP_ORDER = ['start', 'wiki', 'wiki_done', 'football_data', 'football_data_done', 'predicting', 'predictions_done']

export default function ProgressStream({ events, currentProgress }: Props) {
  const latest = events[events.length - 1]

  return (
    <div className="card p-6 h-full flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">🔬</span> Live Analysis
      </h2>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Processing</span>
          <span>{currentProgress}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <motion.div
            className="bg-green-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${currentProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <AnimatePresence initial={false}>
          {events.map((evt, i) => {
            const isDone = i < events.length - 1
            const isCurrent = i === events.length - 1
            return (
              <motion.div
                key={`${evt.step}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className={`text-sm ${isCurrent ? 'text-white font-semibold' : 'text-slate-400'}`}>
                    {evt.message}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {latest && (
        <div className="mt-4 text-xs text-slate-500 border-t border-slate-700 pt-3">
          Step: <span className="text-slate-400 font-mono">{latest.step}</span>
        </div>
      )}
    </div>
  )
}

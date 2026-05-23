import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, XCircle, Trophy } from 'lucide-react'
import type { QuizQuestion } from '../types'

interface Props {
  questions: QuizQuestion[]
  onComplete: (score: number) => void
}

const SECONDS_PER_QUESTION = 30

export default function QuizPanel({ questions, onComplete }: Props) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<{ correct: boolean; selected: string }[]>([])

  const advance = useCallback(() => {
    const isLast = current === questions.length - 1
    if (isLast) {
      setDone(true)
      onComplete(score + (selected === questions[current].correct_answer ? 1 : 0))
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setRevealed(false)
      setTimeLeft(SECONDS_PER_QUESTION)
    }
  }, [current, questions, selected, score, onComplete])

  const handleSelect = (letter: string) => {
    if (revealed) return
    setSelected(letter)
    setRevealed(true)
    const correct = letter === questions[current].correct_answer
    if (correct) setScore(s => s + 1)
    setAnswers(prev => [...prev, { correct, selected: letter }])
  }

  // Timer
  useEffect(() => {
    if (revealed || done) return
    if (timeLeft <= 0) {
      setRevealed(true)
      setAnswers(prev => [...prev, { correct: false, selected: '' }])
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, revealed, done])

  // Auto-advance after answer is shown
  useEffect(() => {
    if (!revealed) return
    const t = setTimeout(advance, 2500)
    return () => clearTimeout(t)
  }, [revealed, advance])

  if (done) {
    const total = questions.length
    const pct = Math.round((score / total) * 100)
    return (
      <div className="card p-6 h-full flex flex-col items-center justify-center text-center">
        <Trophy className="w-14 h-14 text-amber-400 mb-4" />
        <h2 className="text-2xl font-black text-white mb-2">Quiz Complete!</h2>
        <p className="text-5xl font-black text-green-400 mb-1">{score}/{total}</p>
        <p className="text-slate-400 mb-6">{pct}% correct — {pct >= 80 ? '⚽ World Cup Expert!' : pct >= 50 ? '🎯 Good effort!' : '📚 Keep studying!'}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          {answers.map((a, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${a.correct ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm mt-6">Waiting for predictions to complete…</p>
      </div>
    )
  }

  const q = questions[current]
  const options = Object.entries(q.options) as [string, string][]
  const timerPct = (timeLeft / SECONDS_PER_QUESTION) * 100
  const timerColor = timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="card p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❓</span>
          <h2 className="text-lg font-bold text-white">FIFA Quiz</h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>{current + 1} / {questions.length}</span>
          <div className="flex items-center gap-1 text-amber-400 font-semibold">
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full bg-slate-700 rounded-full h-1.5 mb-5">
        <motion.div
          className={`${timerColor} h-1.5 rounded-full transition-colors`}
          style={{ width: `${timerPct}%` }}
          transition={{ duration: 0.9 }}
        />
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-5">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < current ? 'bg-green-500' : i === current ? 'bg-amber-400' : 'bg-slate-700'}`}
          />
        ))}
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 flex flex-col"
        >
          <p className="text-white font-semibold text-base mb-5 leading-snug">{q.question}</p>

          <div className="grid grid-cols-1 gap-2">
            {options.map(([letter, text]) => {
              const isCorrect = letter === q.correct_answer
              const isSelected = letter === selected
              let cls = 'border border-slate-600 bg-slate-900 hover:border-green-500 hover:bg-slate-800 cursor-pointer'
              if (revealed) {
                if (isCorrect) cls = 'border border-green-500 bg-green-500/10 cursor-default'
                else if (isSelected && !isCorrect) cls = 'border border-red-500 bg-red-500/10 cursor-default'
                else cls = 'border border-slate-700 bg-slate-900 opacity-50 cursor-default'
              }
              return (
                <button
                  key={letter}
                  onClick={() => handleSelect(letter)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${cls}`}
                  disabled={revealed}
                >
                  <span className={`font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full border ${revealed && isCorrect ? 'border-green-500 text-green-400' : revealed && isSelected ? 'border-red-500 text-red-400' : 'border-slate-600 text-slate-400'}`}>
                    {letter}
                  </span>
                  <span className={revealed && isCorrect ? 'text-green-300' : revealed && isSelected && !isCorrect ? 'text-red-300' : 'text-slate-200'}>
                    {text}
                  </span>
                  {revealed && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                </button>
              )
            })}
          </div>

          {revealed && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-700"
            >
              <p className="text-xs text-slate-400">
                <span className="text-amber-400 font-semibold">⚽ Fun fact: </span>
                {q.fun_fact}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Score */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-700 pt-3">
        <span>Score: <span className="text-green-400 font-semibold">{score}</span> correct</span>
        {revealed && <span className="text-slate-400 animate-pulse">Next question soon…</span>}
      </div>
    </div>
  )
}

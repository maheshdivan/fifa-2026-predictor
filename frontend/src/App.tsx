import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, Pencil, Eye } from 'lucide-react'
import UrlInput from './components/UrlInput'
import QuizPanel from './components/QuizPanel'
import ProgressStream from './components/ProgressStream'
import GroupStageResults from './components/GroupStageResults'
import TournamentBracket from './components/TournamentBracket'
import ConfirmModal from './components/ConfirmModal'
import OverridesBanner from './components/OverridesBanner'
import { fetchQuiz, streamPredictions, streamOverridePredictions } from './api/client'
import type {
  AppState, QuizQuestion, Predictions, WCData,
  GroupOverride, KnockoutOverride, UserOverrides,
} from './types'

interface ProgressItem { step: string; message: string; progress: number }
type Tab = 'groups' | 'bracket'

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [wikiUrl, setWikiUrl] = useState('https://en.wikipedia.org/wiki/2026_FIFA_World_Cup')

  // Quiz
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [quizDone, setQuizDone] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  // Prediction pipeline
  const [progressEvents, setProgressEvents] = useState<ProgressItem[]>([])
  const [currentProgress, setCurrentProgress] = useState(0)
  const [predictions, setPredictions] = useState<Predictions | null>(null)
  const [wcData, setWcData] = useState<WCData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // UI
  const [activeTab, setActiveTab] = useState<Tab>('groups')
  const [isEditing, setIsEditing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Overrides
  const [groupOverrides, setGroupOverrides] = useState<GroupOverride[]>([])
  const [knockoutOverrides, setKnockoutOverrides] = useState<KnockoutOverride[]>([])

  const cleanupRef = useRef<(() => void) | null>(null)

  // ----- Total change count -----
  const realKnockoutOverrides = knockoutOverrides.filter(o => o.newWinner !== o.originalWinner)
  const changeCount = groupOverrides.length + realKnockoutOverrides.length

  // ----- Start initial prediction -----
  const handleStart = async (url: string) => {
    setWikiUrl(url)
    setAppState('loading')
    setError(null)
    setProgressEvents([])
    setCurrentProgress(0)
    setPredictions(null)
    setQuestions([])
    setQuizDone(false)
    setGroupOverrides([])
    setKnockoutOverrides([])

    try {
      const qs = await fetchQuiz()
      setQuestions(qs)
    } catch (e) {
      console.warn('Quiz fetch failed:', e)
    }

    const cleanup = streamPredictions(
      url,
      (evt) => {
        setProgressEvents(prev => [...prev, evt as ProgressItem])
        setCurrentProgress(evt.progress)
      },
      (data) => {
        setPredictions(data.predictions as Predictions)
        setWcData(data.wc_data as WCData)
        setAppState('complete')
      },
      (msg) => { setError(msg); setAppState('error') }
    )
    cleanupRef.current = cleanup
  }

  // ----- Re-predict with overrides -----
  const handleRePredict = () => {
    setShowConfirm(false)
    setAppState('rerunning')
    setProgressEvents([])
    setCurrentProgress(0)
    setIsEditing(false)

    const overrides: UserOverrides = {
      groupOverrides,
      knockoutOverrides: realKnockoutOverrides,
    }

    const cleanup = streamOverridePredictions(
      wikiUrl,
      overrides,
      (evt) => {
        setProgressEvents(prev => [...prev, evt as ProgressItem])
        setCurrentProgress(evt.progress)
      },
      (data) => {
        setPredictions(data.predictions as Predictions)
        setWcData(data.wc_data as WCData)
        setAppState('complete')
        setGroupOverrides([])
        setKnockoutOverrides([])
      },
      (msg) => { setError(msg); setAppState('error') }
    )
    cleanupRef.current = cleanup
  }

  // ----- Override handlers -----
  const handleGroupChange = (override: GroupOverride) => {
    setGroupOverrides(prev => {
      const existing = prev.findIndex(o => o.group === override.group)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = override
        return updated
      }
      return [...prev, override]
    })
  }

  const handleWinnerChange = (override: KnockoutOverride) => {
    setKnockoutOverrides(prev => {
      const existing = prev.findIndex(o => o.matchId === override.matchId && o.round === override.round)
      if (existing >= 0) {
        const updated = [...prev]
        if (override.newWinner === override.originalWinner) {
          // reset — remove the override
          updated.splice(existing, 1)
          return updated
        }
        updated[existing] = override
        return updated
      }
      if (override.newWinner === override.originalWinner) return prev
      return [...prev, override]
    })
  }

  const handleDiscardOverrides = () => {
    setGroupOverrides([])
    setKnockoutOverrides([])
    setIsEditing(false)
  }

  const handleReset = () => {
    cleanupRef.current?.()
    setAppState('idle')
    setError(null)
    setProgressEvents([])
    setCurrentProgress(0)
    setPredictions(null)
    setQuestions([])
    setQuizDone(false)
    setQuizScore(0)
    setGroupOverrides([])
    setKnockoutOverrides([])
    setIsEditing(false)
  }

  useEffect(() => () => cleanupRef.current?.(), [])

  const isResultsState = appState === 'complete'
  const isLoadingState = appState === 'loading' || appState === 'rerunning'

  return (
    <div className="min-h-screen pb-24">
      {/* Nav */}
      {appState !== 'idle' && (
        <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="font-black text-white">FIFA 2026 Predictor</span>
            {wcData && (
              <span className="hidden sm:inline text-xs text-slate-500 ml-2">
                — {wcData.total_teams} teams · {wcData.total_groups} groups
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isResultsState && (
              <button
                onClick={() => { setIsEditing(e => !e) }}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                    : 'border-slate-600 text-slate-400 hover:text-white'
                }`}
              >
                {isEditing ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {isEditing ? 'View Mode' : 'Edit Results'}
              </button>
            )}
            <button onClick={handleReset} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> New
            </button>
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        {/* IDLE */}
        {appState === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UrlInput onSubmit={handleStart} loading={false} />
          </motion.div>
        )}

        {/* LOADING / RERUNNING */}
        {isLoadingState && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-4 py-8">
            {appState === 'rerunning' && (
              <div className="mb-6 card p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3">
                <span className="text-2xl">🔄</span>
                <div>
                  <p className="font-bold text-amber-400">Re-predicting with your custom picks</p>
                  <p className="text-xs text-slate-400">Claude is factoring in your group & match overrides…</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
              <div className="h-full">
                {appState === 'rerunning' ? (
                  <div className="card p-6 h-full flex flex-col items-center justify-center text-center">
                    <span className="text-5xl mb-4">🏆</span>
                    {quizDone && (
                      <>
                        <p className="text-2xl font-black text-green-400 mb-1">{quizScore}/{questions.length}</p>
                        <p className="text-slate-400 text-sm">Your quiz score</p>
                      </>
                    )}
                    <p className="text-slate-500 text-sm mt-4">Re-running predictions with your changes…</p>
                  </div>
                ) : questions.length > 0 && !quizDone ? (
                  <QuizPanel questions={questions} onComplete={(s) => { setQuizScore(s); setQuizDone(true) }} />
                ) : quizDone ? (
                  <div className="card p-6 h-full flex flex-col items-center justify-center text-center">
                    <span className="text-5xl mb-3">🏆</span>
                    <p className="text-2xl font-black text-green-400 mb-1">{quizScore}/{questions.length}</p>
                    <p className="text-slate-400 text-sm">Quiz complete! Waiting for predictions…</p>
                  </div>
                ) : (
                  <div className="card p-6 h-full flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-3 animate-bounce">❓</div>
                    <p className="text-slate-400">Loading quiz questions…</p>
                  </div>
                )}
              </div>
              <div className="h-full">
                <ProgressStream events={progressEvents} currentProgress={currentProgress} />
              </div>
            </div>
          </motion.div>
        )}

        {/* RESULTS */}
        {isResultsState && predictions && (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-4 py-8">
            {quizDone && (
              <div className="mb-6 card p-4 flex items-center gap-3 border-green-500/30 bg-green-500/5">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-bold text-white">Quiz Score: {quizScore}/{questions.length}</p>
                  <p className="text-xs text-slate-400">
                    {quizScore >= 8 ? 'Outstanding knowledge!' : quizScore >= 5 ? 'Great effort!' : 'Keep watching football!'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab switcher */}
            <div className="flex gap-2 mb-6">
              {(['groups', 'bracket'] as Tab[]).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    activeTab === tab ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>
                  {tab === 'groups' ? '🏟️ Group Stage' : '🏆 Knockout Bracket'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'groups' && (
                <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GroupStageResults
                    groups={predictions.group_results}
                    bestThirdPlace={predictions.best_third_place ?? []}
                    isEditing={isEditing}
                    overriddenGroups={groupOverrides}
                    onGroupChange={handleGroupChange}
                  />
                </motion.div>
              )}
              {activeTab === 'bracket' && (
                <motion.div key="bracket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <TournamentBracket
                    predictions={predictions}
                    isEditing={isEditing}
                    knockoutOverrides={knockoutOverrides}
                    onWinnerChange={handleWinnerChange}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ERROR */}
        {appState === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="min-h-screen flex items-center justify-center px-4">
            <div className="card p-8 max-w-lg w-full text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
              <p className="text-slate-400 text-sm mb-6 font-mono break-all">{error}</p>
              <button onClick={handleReset} className="btn-primary flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overrides banner */}
      <AnimatePresence>
        {isResultsState && changeCount > 0 && (
          <OverridesBanner
            changeCount={changeCount}
            onApply={() => setShowConfirm(true)}
            onDiscard={handleDiscardOverrides}
          />
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      <AnimatePresence>
        {showConfirm && (
          <ConfirmModal
            overrides={{ groupOverrides, knockoutOverrides: realKnockoutOverrides }}
            onConfirm={handleRePredict}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

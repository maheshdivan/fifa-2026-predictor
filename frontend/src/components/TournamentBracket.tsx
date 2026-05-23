import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import type { KnockoutMatch, FinalMatch, Predictions, KnockoutOverride } from '../types'

interface MatchCardProps {
  match: KnockoutMatch | FinalMatch
  round: string
  delay?: number
  isEditing: boolean
  overrides: KnockoutOverride[]
  onWinnerChange: (override: KnockoutOverride) => void
}

function getMatchId(m: KnockoutMatch | FinalMatch): string {
  return 'match' in m ? m.match : 'final'
}

function getEffectiveWinner(match: KnockoutMatch | FinalMatch, round: string, overrides: KnockoutOverride[]): string {
  const id = getMatchId(match)
  const ov = overrides.find(o => o.matchId === id && o.round === round)
  return ov ? ov.newWinner : match.winner
}

function isOverridden(match: KnockoutMatch | FinalMatch, round: string, overrides: KnockoutOverride[]): boolean {
  const id = getMatchId(match)
  return overrides.some(o => o.matchId === id && o.round === round)
}

function MatchCard({ match, round, delay = 0, isEditing, overrides, onWinnerChange }: MatchCardProps) {
  const [open, setOpen] = useState(false)
  const matchId = getMatchId(match)
  const winner = getEffectiveWinner(match, round, overrides)
  const overridden = isOverridden(match, round, overrides)

  const handleFlip = () => {
    const loser = match.team1 === winner ? match.team2 : match.team1
    if (overridden && loser === match.winner) {
      // clicking back to original — remove override
      onWinnerChange({
        matchId,
        round,
        team1: match.team1,
        team2: match.team2,
        newWinner: match.winner,
        originalWinner: match.winner,
      })
    } else {
      onWinnerChange({
        matchId,
        round,
        team1: match.team1,
        team2: match.team2,
        newWinner: loser,
        originalWinner: match.winner,
      })
    }
  }

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    onWinnerChange({
      matchId,
      round,
      team1: match.team1,
      team2: match.team2,
      newWinner: match.winner,
      originalWinner: match.winner,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      layout
      className={`card overflow-hidden ${overridden ? 'border-amber-500/40' : ''}`}
    >
      <div
        className={`p-3 transition-colors ${isEditing ? '' : 'cursor-pointer hover:bg-slate-700/50'}`}
        onClick={isEditing ? undefined : () => setOpen(o => !o)}
      >
        {overridden && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="badge-gold text-xs">your pick</span>
            <button onClick={handleReset} className="text-slate-500 hover:text-amber-400 transition-colors">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <TeamRow
              name={match.team1}
              winner={winner === match.team1}
              isEditing={isEditing}
              onPick={isEditing ? () => {
                if (winner !== match.team1) handleFlip()
              } : undefined}
            />
            <div className="text-xs text-slate-600 text-center">vs</div>
            <TeamRow
              name={match.team2}
              winner={winner === match.team2}
              isEditing={isEditing}
              onPick={isEditing ? () => {
                if (winner !== match.team2) handleFlip()
              } : undefined}
            />
          </div>

          <div className="ml-2 text-right flex-shrink-0">
            <div className="text-sm font-bold text-amber-400">{match.score}</div>
            {!isEditing && (
              open
                ? <ChevronDown className="w-4 h-4 text-slate-500 ml-auto mt-1" />
                : <ChevronRight className="w-4 h-4 text-slate-500 ml-auto mt-1" />
            )}
          </div>
        </div>

        {isEditing && (
          <p className="text-xs text-slate-600 mt-2">Click a team to pick them as winner</p>
        )}
      </div>

      <AnimatePresence>
        {open && !isEditing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700 px-3 py-2 bg-slate-900"
          >
            <p className="text-xs text-slate-400 leading-relaxed">{match.reasoning}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface TeamRowProps {
  name: string
  winner: boolean
  isEditing: boolean
  onPick?: () => void
}

function TeamRow({ name, winner, isEditing, onPick }: TeamRowProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg transition-all ${
        isEditing && !winner
          ? 'cursor-pointer hover:bg-slate-700/60 px-1.5 py-1 -mx-1.5'
          : winner ? '' : 'opacity-40'
      }`}
      onClick={onPick}
      title={isEditing && !winner ? `Pick ${name} as winner` : undefined}
    >
      {winner && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
      {!winner && <span className="w-1.5 h-1.5 rounded-full bg-transparent flex-shrink-0" />}
      <span className={`text-sm font-semibold ${winner ? 'text-white' : 'text-slate-400'}`}>{name}</span>
      {winner && !isEditing && <span className="badge-green ml-auto text-xs">WIN</span>}
      {winner && isEditing && <span className="badge-green ml-auto text-xs">✓</span>}
      {!winner && isEditing && <span className="text-xs text-slate-600 ml-auto">pick</span>}
    </div>
  )
}

interface RoundSectionProps {
  title: string
  emoji: string
  round: string
  matches: (KnockoutMatch | FinalMatch)[]
  startDelay?: number
  isEditing: boolean
  overrides: KnockoutOverride[]
  onWinnerChange: (override: KnockoutOverride) => void
}

function RoundSection({ title, emoji, round, matches, startDelay = 0, isEditing, overrides, onWinnerChange }: RoundSectionProps) {
  const overriddenCount = matches.filter(m => isOverridden(m, round, overrides)).length
  return (
    <div className="mb-10">
      <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">{emoji}</span> {title}
        <span className="text-xs text-slate-500 font-normal ml-1">({matches.length} matches)</span>
        {overriddenCount > 0 && (
          <span className="badge-gold text-xs">{overriddenCount} changed</span>
        )}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {matches.map((m, i) => (
          <MatchCard
            key={getMatchId(m)}
            match={m}
            round={round}
            delay={startDelay + i * 0.04}
            isEditing={isEditing}
            overrides={overrides}
            onWinnerChange={onWinnerChange}
          />
        ))}
      </div>
    </div>
  )
}

interface Props {
  predictions: Predictions
  isEditing: boolean
  knockoutOverrides: KnockoutOverride[]
  onWinnerChange: (override: KnockoutOverride) => void
}

export default function TournamentBracket({ predictions, isEditing, knockoutOverrides, onWinnerChange }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="text-3xl">🏆</span> Knockout Stage Predictions
          {!isEditing && (
            <span className="text-sm font-normal text-slate-400 ml-2">(click any match for AI reasoning)</span>
          )}
        </h2>
        {isEditing && (
          <span className="badge-gold animate-pulse">Edit Mode — click a team name to pick them as winner</span>
        )}
      </div>

      <RoundSection title="Round of 16" emoji="⚔️" round="r16" matches={predictions.r16} startDelay={0.1}
        isEditing={isEditing} overrides={knockoutOverrides} onWinnerChange={onWinnerChange} />
      <RoundSection title="Quarter-Finals" emoji="🥊" round="qf" matches={predictions.qf} startDelay={0.2}
        isEditing={isEditing} overrides={knockoutOverrides} onWinnerChange={onWinnerChange} />
      <RoundSection title="Semi-Finals" emoji="🌟" round="sf" matches={predictions.sf} startDelay={0.3}
        isEditing={isEditing} overrides={knockoutOverrides} onWinnerChange={onWinnerChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div>
          <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🥉</span> Third Place
            {isOverridden(predictions.third_place, 'third_place', knockoutOverrides) && (
              <span className="badge-gold text-xs">changed</span>
            )}
          </h3>
          <MatchCard match={predictions.third_place} round="third_place" delay={0.4}
            isEditing={isEditing} overrides={knockoutOverrides} onWinnerChange={onWinnerChange} />
        </div>
        <div>
          <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span> The Final
            {isOverridden(predictions.final, 'final', knockoutOverrides) && (
              <span className="badge-gold text-xs">changed</span>
            )}
          </h3>
          <MatchCard match={predictions.final} round="final" delay={0.45}
            isEditing={isEditing} overrides={knockoutOverrides} onWinnerChange={onWinnerChange} />
        </div>
      </div>

      {/* Champion banner */}
      <motion.div
        layout
        className="card border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-slate-800 p-8 text-center"
      >
        <div className="text-6xl mb-4">🏆</div>
        <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-2">
          2026 FIFA World Cup Champion
        </p>
        <h2 className="text-4xl font-black text-amber-400 mb-4">{predictions.champion}</h2>
        <p className="text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
          {predictions.champion_reasoning}
        </p>
      </motion.div>
    </div>
  )
}

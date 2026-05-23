import { motion } from 'framer-motion'
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import type { GroupResult, TeamResult, GroupOverride } from '../types'

interface Props {
  groups: GroupResult[]
  bestThirdPlace: string[]
  isEditing: boolean
  overriddenGroups: GroupOverride[]
  onGroupChange: (override: GroupOverride) => void
}

function getEffectiveTeams(
  group: GroupResult,
  overriddenGroups: GroupOverride[]
): TeamResult[] {
  const ov = overriddenGroups.find(o => o.group === group.group)
  return ov ? ov.teams : group.teams
}

function isGroupOverridden(groupName: string, overriddenGroups: GroupOverride[]): boolean {
  return overriddenGroups.some(o => o.group === groupName)
}

function moveTeam(teams: TeamResult[], fromIdx: number, toIdx: number): TeamResult[] {
  const copy = [...teams]
  const [moved] = copy.splice(fromIdx, 1)
  copy.splice(toIdx, 0, moved)
  return copy.map((t, i) => ({ ...t, position: i + 1 }))
}

interface GroupCardProps {
  group: GroupResult
  bestThirdPlace: string[]
  isEditing: boolean
  overriddenGroups: GroupOverride[]
  onGroupChange: (override: GroupOverride) => void
}

function GroupCard({ group, bestThirdPlace, isEditing, overriddenGroups, onGroupChange }: GroupCardProps) {
  const teams = getEffectiveTeams(group, overriddenGroups)
  const isOverridden = isGroupOverridden(group.group, overriddenGroups)

  const handleMove = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= teams.length) return
    const newTeams = moveTeam(teams, idx, newIdx)
    onGroupChange({ group: group.group, teams: newTeams })
  }

  const handleReset = () => {
    onGroupChange({ group: group.group, teams: [...group.teams].map((t, i) => ({ ...t, position: i + 1 })) })
  }

  return (
    <motion.div
      layout
      className={`card p-4 ${isOverridden ? 'border-amber-500/40' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-lg text-white">Group {group.group}</h3>
          {isOverridden && (
            <span className="badge-gold text-xs">edited</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500">Pts</span>
          {isEditing && isOverridden && (
            <button
              onClick={handleReset}
              title="Reset group to AI prediction"
              className="ml-2 text-slate-500 hover:text-amber-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {teams.map((team, ti) => {
          const isQ = ti < 2
          const isBest3rd = ti === 2 && bestThirdPlace.includes(team.name)
          const isElim = !isQ && !isBest3rd

          return (
            <div
              key={team.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
                isQ
                  ? 'bg-green-500/10 border border-green-500/20'
                  : isBest3rd
                  ? 'bg-amber-500/10 border border-amber-500/20'
                  : 'bg-slate-900'
              }`}
            >
              <span
                className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0 ${
                  ti === 0 ? 'bg-green-500 text-white' :
                  ti === 1 ? 'bg-green-700 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}
              >
                {team.position}
              </span>

              <span className={`flex-1 font-medium truncate ${isElim ? 'text-slate-500' : 'text-slate-100'}`}>
                {team.name}
              </span>

              <span className={`font-bold text-xs mr-1 ${isQ ? 'text-green-400' : isBest3rd ? 'text-amber-400' : 'text-slate-500'}`}>
                {team.points}
              </span>

              {isEditing && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(ti, -1)}
                    disabled={ti === 0}
                    className="text-slate-400 hover:text-green-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleMove(ti, 1)}
                    disabled={ti === teams.length - 1}
                    className="text-slate-400 hover:text-green-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isEditing && (
        <p className="text-xs text-slate-600 mt-2">
          Use ↑↓ to reorder teams
        </p>
      )}
    </motion.div>
  )
}

export default function GroupStageResults({
  groups,
  bestThirdPlace,
  isEditing,
  overriddenGroups,
  onGroupChange,
}: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="text-3xl">🏟️</span> Group Stage Results
        </h2>
        {isEditing && (
          <span className="badge-gold animate-pulse">Edit Mode</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {groups.map((group) => (
          <GroupCard
            key={group.group}
            group={group}
            bestThirdPlace={bestThirdPlace}
            isEditing={isEditing}
            overriddenGroups={overriddenGroups}
            onGroupChange={onGroupChange}
          />
        ))}
      </div>

      {bestThirdPlace.length > 0 && (
        <div className="card p-4 mb-4">
          <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
            <span>⭐</span> Best Third-Place Teams Advancing to Round of 16
          </h3>
          <div className="flex flex-wrap gap-2">
            {bestThirdPlace.map(team => (
              <span key={team} className="badge-gold px-3 py-1 text-sm">{team}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 text-xs text-slate-500 mt-2">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500/30 inline-block" /> Qualified</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/30 inline-block" /> Best 3rd Place</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-700 inline-block" /> Eliminated</div>
      </div>
    </div>
  )
}

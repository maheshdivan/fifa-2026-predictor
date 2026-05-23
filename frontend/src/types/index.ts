export interface GroupData {
  name: string
  teams: string[]
}

export interface WCData {
  year: string
  tournament_name: string
  groups: GroupData[]
  teams: string[]
  total_groups: number
  total_teams: number
}

export interface TeamResult {
  name: string
  position: number
  points: number
  gf: number
  ga: number
}

export interface GroupResult {
  group: string
  teams: TeamResult[]
}

export interface KnockoutMatch {
  match: string
  team1: string
  team2: string
  winner: string
  score: string
  reasoning: string
}

export interface FinalMatch {
  team1: string
  team2: string
  winner: string
  score: string
  reasoning: string
}

export interface Predictions {
  group_results: GroupResult[]
  best_third_place: string[]
  r16: KnockoutMatch[]
  qf: KnockoutMatch[]
  sf: KnockoutMatch[]
  third_place: FinalMatch
  final: FinalMatch
  champion: string
  champion_reasoning: string
}

export interface ProgressEvent {
  step: string
  message: string
  progress: number
  wc_data?: WCData
}

export interface QuizOption {
  A: string
  B: string
  C: string
  D: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption
  correct_answer: string
  fun_fact: string
}

export type AppState = 'idle' | 'loading' | 'complete' | 'error' | 'rerunning'

export interface GroupOverride {
  group: string
  teams: TeamResult[]
}

export interface KnockoutOverride {
  matchId: string
  round: string
  team1: string
  team2: string
  newWinner: string
  originalWinner: string
}

export interface UserOverrides {
  groupOverrides: GroupOverride[]
  knockoutOverrides: KnockoutOverride[]
}

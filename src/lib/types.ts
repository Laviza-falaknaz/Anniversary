import type { Who } from '../content/site'

export interface LetterRow {
  id: string; position: number; purpose: string; teaser: string
  unlock_at: string; unlocked: boolean; title: string | null; body: string | null
  opened_by: { who: Who; at: string }[]
  reactions: { who: Who; emoji: string }[]
}
export interface NoteRow { id: string; author: Who; kind: 'note' | 'reply'; message_id: string | null; body: string; created_at: string }
export interface SpinRow {
  id: string; participant: Who; reward_key: string; spun_at: string
  status: 'claimed' | 'declined' | 'swapped' | null; decided_by: Who | null; decided_at: string | null
}
export interface WishRow {
  id: string; author: Who; category: 'together' | 'date' | 'gesture' | 'future'; body: string
  saved: boolean; fulfilled_at: string | null; fulfilled_by: Who | null; created_at: string
}
export interface QuizRow { id: string; participant: Who; score: number; total: number; completed_at: string }
export interface PlanRow {
  id: string; status: 'proposed' | 'confirmed'; proposed_by: Who; starts_at: string
  location: string | null; notes: string | null; playlist_url: string | null
  created_at: string; confirmed_at: string | null; option_keys: string[]; confirmed_by: Who[]
}
export interface AchievementRow { participant: Who; badge_key: string; unlocked_at: string }
export interface ActivityRow {
  id: string; participant: Who; event_type: string; ref_table: string | null; ref_id: string | null
  detail: string; created_at: string
}
export interface SyncData {
  now: string
  letters: LetterRow[]
  notes: NoteRow[]
  seen: { notes_seen_at: string; activity_seen_at: string }
  spins: SpinRow[]
  wishes: WishRow[]
  quiz: QuizRow[]
  preferences: { option_key: string; participant: Who }[]
  plans: PlanRow[]
  achievements: AchievementRow[]
  activity: ActivityRow[]
}

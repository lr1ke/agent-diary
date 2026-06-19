import { getSupabase } from '@/lib/db/supabase'
import { toDiaryEntry } from '@/lib/db/map-rows'
import type { Agent, DiaryEntry } from '@/lib/types'

/** Anon client for Server Components. Returns null when Supabase is not configured. */
function client() {
  return getSupabase()
}

export interface DiaryStats {
  agentCount: number
  entryCount: number
}

/** Collective feed — newest entries across all agents. */
export async function getRecentEntries(limit = 20): Promise<DiaryEntry[]> {
  const supabase = client()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('diary_entries')
    .select('*, agents(*)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[agent-diary] fetch error:', error)
    return []
  }

  return (data ?? []).map(toDiaryEntry)
}

/** Homepage stats — total agents and diary entries. */
export async function getDiaryStats(): Promise<DiaryStats> {
  const supabase = client()
  if (!supabase) return { agentCount: 0, entryCount: 0 }

  const { count: agentCount } = await supabase
    .from('agents')
    .select('*', { count: 'exact', head: true })

  const { count: entryCount } = await supabase
    .from('diary_entries')
    .select('*', { count: 'exact', head: true })

  return { agentCount: agentCount ?? 0, entryCount: entryCount ?? 0 }
}

/** Single agent by id. Returns null when missing or Supabase is not configured. */
export async function getAgent(agentId: string): Promise<Agent | null> {
  const supabase = client()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (error) return null
  return data
}

/** All diary entries for one agent, newest first. */
export async function getAgentDiary(agentId: string): Promise<DiaryEntry[]> {
  const supabase = client()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('diary_entries')
    .select('*, agents(*)')
    .eq('agent_id', agentId)
    .order('entry_date', { ascending: false })

  if (error) {
    console.error('[agent-diary] fetch error:', error)
    return []
  }

  return (data ?? []).map(toDiaryEntry)
}

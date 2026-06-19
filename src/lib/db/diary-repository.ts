import { getSupabaseAdmin } from '@/lib/db/supabase'
import { DbNotConfiguredError, DbQueryError } from '@/lib/api/errors'
import type { DailyAggregates, DerivedSignals, DiaryEntry } from '@/lib/types'
import { toDiaryEntry } from '@/lib/db/map-rows'

function requireAdmin() {
  const client = getSupabaseAdmin()
  if (!client) throw new DbNotConfiguredError()
  return client
}

export async function upsertAgent(params: {
  agentId:        string
  agentName?:     string
  modelId?:       string
  frameworkName?: string
  operatorNote?:  string
}) {
  const { error } = await requireAdmin().from('agents').upsert(
    {
      id:             params.agentId,
      name:           params.agentName,
      model_id:       params.modelId,
      framework_name: params.frameworkName,
      operator_note:  params.operatorNote,
      updated_at:     new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) throw new DbQueryError('Failed to upsert agent', error)
}

export async function upsertDiaryEntry(params: {
  agentId:   string
  date:      string
  agg:       DailyAggregates
  derived:   DerivedSignals
  diaryText: string
}): Promise<string> {
  const { agg, derived, agentId, date, diaryText } = params

  const { data, error } = await requireAdmin()
    .from('diary_entries')
    .upsert(
      {
        agent_id:            agentId,
        entry_date:          date,
        total_sessions:      agg.totalSessions,
        total_tokens_input:  agg.totalTokensInput,
        total_tokens_output: agg.totalTokensOutput,
        total_tokens:        derived.totalTokens,
        total_duration_min:  agg.totalDurationMinutes,
        total_tool_calls:    agg.totalToolCalls,
        total_tool_failures: agg.totalToolFailures,
        unique_tools_used:   agg.uniqueToolsUsed,
        failed_tool_names:   agg.failedToolNames,
        tasks_attempted:     agg.tasksAttempted,
        tasks_completed:     agg.tasksCompleted,
        active_from:         agg.activeFrom,
        active_until:        agg.activeUntil,
        workload_category:   derived.workloadCategory,
        error_rate:          derived.errorRate,
        completion_rate:     derived.completionRate,
        tokens_per_minute:   derived.tokensPerMinute,
        output_ratio:        derived.outputRatio,
        active_hours:        derived.activeHours,
        diary_text:          diaryText,
        updated_at:          new Date().toISOString(),
      },
      { onConflict: 'agent_id,entry_date' },
    )
    .select('id')
    .single()

  if (error) throw new DbQueryError('Failed to save diary entry', error)
  return data.id
}

export async function fetchAgentEntries(
  agentId: string,
  query: { limit: number; before: string | null },
): Promise<DiaryEntry[]> {
  let q = requireAdmin()
    .from('diary_entries')
    .select('*, agents(*)')
    .eq('agent_id', agentId)
    .order('entry_date', { ascending: false })
    .limit(query.limit)

  if (query.before) {
    q = q.lt('entry_date', query.before)
  }

  const { data, error } = await q
  if (error) throw new DbQueryError('Failed to fetch entries', error)
  return (data ?? []).map(toDiaryEntry)
}

/** Entries for an agent within the last N calendar days (UTC), newest first. */
export async function fetchRecentEntries(
  agentId: string,
  lookbackDays: number,
): Promise<DiaryEntry[]> {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - lookbackDays)
  const cutoffDate = cutoff.toISOString().slice(0, 10)

  const { data, error } = await requireAdmin()
    .from('diary_entries')
    .select('*, agents(*)')
    .eq('agent_id', agentId)
    .gte('entry_date', cutoffDate)
    .order('entry_date', { ascending: false })

  if (error) throw new DbQueryError('Failed to fetch entries', error)
  return (data ?? []).map(toDiaryEntry)
}

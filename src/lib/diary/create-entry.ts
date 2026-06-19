import { aggregateDailySessions, deriveSignals, synthesizeDiaryEntry } from '@/lib/diary'
import { inferAgentMetadata } from '@/lib/api/validation'
import { upsertAgent, upsertDiaryEntry } from '@/lib/db/diary-repository'
import type { AgentDailyInput } from '@/lib/types'

export interface CreateEntryResult {
  entryId:          string
  diaryText:        string
  workloadCategory: string
  date:             string
  agentId:          string
}

export async function createDiaryEntry(input: AgentDailyInput): Promise<CreateEntryResult> {
  const { agentId, date, sessions, operatorNote } = input
  const { agentName, modelId, frameworkName } = inferAgentMetadata(sessions)

  await upsertAgent({ agentId, agentName, modelId, frameworkName, operatorNote })

  const agg     = aggregateDailySessions(sessions)
  const derived = deriveSignals(agg)

  const diaryText = await synthesizeDiaryEntry({
    agentId,
    agentName,
    modelId,
    frameworkName,
    operatorNote,
    agg,
    derived,
  })

  const entryId = await upsertDiaryEntry({ agentId, date, agg, derived, diaryText })

  return {
    entryId,
    diaryText,
    workloadCategory: derived.workloadCategory,
    date,
    agentId,
  }
}

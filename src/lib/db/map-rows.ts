import type { DiaryEntry, WorkloadCategory } from '@/lib/types'
import type { DiaryEntryWithAgent } from '@/lib/db/database.types'

export function toDiaryEntry(row: DiaryEntryWithAgent): DiaryEntry {
  return {
    ...row,
    workload_category: row.workload_category as WorkloadCategory,
    agents: row.agents ?? undefined,
  }
}

import type { DailyAggregates, DerivedSignals, WorkloadCategory } from '@/lib/types'

/** Compute derived metrics from raw daily aggregates. */
export function deriveSignals(agg: DailyAggregates): DerivedSignals {
  const totalTokens = agg.totalTokensInput + agg.totalTokensOutput

  const errorRate = agg.totalToolCalls > 0
    ? agg.totalToolFailures / agg.totalToolCalls
    : 0

  const completionRate = agg.tasksAttempted > 0
    ? agg.tasksCompleted / agg.tasksAttempted
    : 0

  const tokensPerMinute = agg.totalDurationMinutes > 0
    ? totalTokens / agg.totalDurationMinutes
    : 0

  const outputRatio = totalTokens > 0
    ? agg.totalTokensOutput / totalTokens
    : 0

  const activeHours = agg.totalDurationMinutes / 60

  const workloadCategory: WorkloadCategory =
    totalTokens === 0     ? 'idle'    :
    totalTokens < 10_000  ? 'quiet'   :
    totalTokens < 50_000  ? 'normal'  :
    totalTokens < 200_000 ? 'heavy'   : 'intense'

  return {
    totalTokens,
    workloadCategory,
    errorRate,
    completionRate,
    tokensPerMinute,
    outputRatio,
    activeHours,
  }
}

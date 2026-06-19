import type { AgentSessionReport, DailyAggregates } from '@/lib/types'

/**
 * Aggregate all of an agent's sessions from one day into a single summary.
 * Framework-agnostic — works on the normalized AgentSessionReport interface.
 */
export function aggregateDailySessions(sessions: AgentSessionReport[]): DailyAggregates {
  if (sessions.length === 0) {
    const now = new Date().toISOString()
    return {
      totalSessions:        0,
      totalTokensInput:     0,
      totalTokensOutput:    0,
      totalDurationMinutes: 0,
      totalToolCalls:       0,
      totalToolFailures:    0,
      uniqueToolsUsed:      [],
      failedToolNames:      [],
      tasksAttempted:       0,
      tasksCompleted:       0,
      activeFrom:           now,
      activeUntil:          now,
    }
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.sessionStart).getTime() - new Date(b.sessionStart).getTime()
  )

  const durationOf = (s: AgentSessionReport) =>
    (new Date(s.sessionEnd).getTime() - new Date(s.sessionStart).getTime()) / 60_000

  return {
    totalSessions:        sessions.length,
    totalTokensInput:     sessions.reduce((n, s) => n + s.tokenUsageInput,  0),
    totalTokensOutput:    sessions.reduce((n, s) => n + s.tokenUsageOutput, 0),
    totalDurationMinutes: sessions.reduce((n, s) => n + durationOf(s),      0),
    totalToolCalls:       sessions.reduce((n, s) => n + s.toolCallsTotal,   0),
    totalToolFailures:    sessions.reduce((n, s) => n + s.toolCallsFailed,  0),
    uniqueToolsUsed: [...new Set(sessions.flatMap(s => s.uniqueToolsUsed))],
    failedToolNames: [...new Set(sessions.flatMap(s => s.failedToolNames))],
    tasksAttempted: sessions.length,
    tasksCompleted: sessions.filter(s => s.taskCompleted).length,
    activeFrom:  sorted.at(0)!.sessionStart,
    activeUntil: sorted.at(-1)!.sessionEnd,
  }
}

import { describe, it, expect } from 'vitest'
import { aggregateDailySessions } from '@/lib/diary/aggregator'
import type { AgentSessionReport } from '@/lib/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeSession = (overrides: Partial<AgentSessionReport> = {}): AgentSessionReport => ({
  agentId:           'agent-001',
  frameworkName:     'openai',
  sessionStart:      '2020-01-15T08:00:00.000Z',
  sessionEnd:        '2020-01-15T08:30:00.000Z',   // 30 minutes
  tokenUsageInput:   1000,
  tokenUsageOutput:  500,
  toolCallsTotal:    5,
  toolCallsSucceeded: 4,
  toolCallsFailed:   1,
  uniqueToolsUsed:   ['web_search', 'code_interpreter'],
  failedToolNames:   ['web_search'],
  taskDescription:   'Research competitors',
  taskCompleted:     true,
  ...overrides,
})

// ─────────────────────────────────────────────────────────────────────────────

describe('aggregateDailySessions', () => {
  it('returns zero-state for empty sessions array', () => {
    const result = aggregateDailySessions([])
    expect(result.totalSessions).toBe(0)
    expect(result.totalTokensInput).toBe(0)
    expect(result.totalTokensOutput).toBe(0)
    expect(result.totalToolCalls).toBe(0)
    expect(result.uniqueToolsUsed).toEqual([])
    expect(result.failedToolNames).toEqual([])
  })

  it('sums token usage across sessions', () => {
    const sessions = [
      makeSession({ tokenUsageInput: 1000, tokenUsageOutput: 500 }),
      makeSession({ tokenUsageInput: 2000, tokenUsageOutput: 800 }),
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.totalTokensInput).toBe(3000)
    expect(result.totalTokensOutput).toBe(1300)
  })

  it('sums tool calls and failures', () => {
    const sessions = [
      makeSession({ toolCallsTotal: 5, toolCallsFailed: 1 }),
      makeSession({ toolCallsTotal: 10, toolCallsFailed: 3 }),
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.totalToolCalls).toBe(15)
    expect(result.totalToolFailures).toBe(4)
  })

  it('deduplicates tools across sessions', () => {
    const sessions = [
      makeSession({ uniqueToolsUsed: ['web_search', 'code_interpreter'] }),
      makeSession({ uniqueToolsUsed: ['web_search', 'file_writer'] }),  // web_search duplicate
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.uniqueToolsUsed).toHaveLength(3)
    expect(result.uniqueToolsUsed).toContain('web_search')
    expect(result.uniqueToolsUsed).toContain('code_interpreter')
    expect(result.uniqueToolsUsed).toContain('file_writer')
  })

  it('deduplicates failed tool names across sessions', () => {
    const sessions = [
      makeSession({ failedToolNames: ['web_search'] }),
      makeSession({ failedToolNames: ['web_search', 'file_writer'] }),
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.failedToolNames).toHaveLength(2)
    expect(result.failedToolNames).toContain('web_search')
    expect(result.failedToolNames).toContain('file_writer')
  })

  it('counts task completion correctly', () => {
    const sessions = [
      makeSession({ taskCompleted: true }),
      makeSession({ taskCompleted: false }),
      makeSession({ taskCompleted: true }),
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.tasksAttempted).toBe(3)
    expect(result.tasksCompleted).toBe(2)
  })

  it('computes duration from session timestamps', () => {
    const sessions = [
      makeSession({
        sessionStart: '2020-01-15T08:00:00.000Z',
        sessionEnd:   '2020-01-15T08:30:00.000Z',  // 30 min
      }),
      makeSession({
        sessionStart: '2020-01-15T10:00:00.000Z',
        sessionEnd:   '2020-01-15T11:00:00.000Z',  // 60 min
      }),
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.totalDurationMinutes).toBeCloseTo(90, 1)
  })

  it('sets activeFrom to earliest sessionStart and activeUntil to latest sessionEnd', () => {
    const sessions = [
      makeSession({
        sessionStart: '2020-01-15T10:00:00.000Z',
        sessionEnd:   '2020-01-15T11:00:00.000Z',
      }),
      makeSession({
        sessionStart: '2020-01-15T08:00:00.000Z',  // earlier
        sessionEnd:   '2020-01-15T09:00:00.000Z',
      }),
      makeSession({
        sessionStart: '2020-01-15T14:00:00.000Z',
        sessionEnd:   '2020-01-15T16:00:00.000Z',  // latest end
      }),
    ]
    const result = aggregateDailySessions(sessions)
    expect(result.activeFrom).toBe('2020-01-15T08:00:00.000Z')
    expect(result.activeUntil).toBe('2020-01-15T16:00:00.000Z')
  })

  it('handles single session correctly', () => {
    const session = makeSession()
    const result  = aggregateDailySessions([session])
    expect(result.totalSessions).toBe(1)
    expect(result.totalTokensInput).toBe(1000)
    expect(result.activeFrom).toBe(session.sessionStart)
    expect(result.activeUntil).toBe(session.sessionEnd)
  })
})

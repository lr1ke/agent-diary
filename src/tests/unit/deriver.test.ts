import { describe, it, expect } from 'vitest'
import { deriveSignals } from '@/lib/diary/deriver'
import type { DailyAggregates } from '@/lib/types'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeAgg = (overrides: Partial<DailyAggregates> = {}): DailyAggregates => ({
  totalSessions:        2,
  totalTokensInput:     10_000,
  totalTokensOutput:    5_000,
  totalDurationMinutes: 60,
  totalToolCalls:       10,
  totalToolFailures:    1,
  uniqueToolsUsed:      ['web_search'],
  failedToolNames:      ['web_search'],
  tasksAttempted:       2,
  tasksCompleted:       2,
  activeFrom:           '2020-01-15T08:00:00.000Z',
  activeUntil:          '2020-01-15T09:00:00.000Z',
  ...overrides,
})

// ─────────────────────────────────────────────────────────────────────────────

describe('deriveSignals', () => {
  describe('workloadCategory', () => {
    it('returns idle when totalTokens is 0', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 0, totalTokensOutput: 0 }))
      expect(result.workloadCategory).toBe('idle')
    })

    it('returns quiet for < 10k tokens', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 5_000, totalTokensOutput: 4_000 }))
      expect(result.workloadCategory).toBe('quiet')
    })

    it('returns normal for 10k–50k tokens', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 20_000, totalTokensOutput: 15_000 }))
      expect(result.workloadCategory).toBe('normal')
    })

    it('returns heavy for 50k–200k tokens', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 100_000, totalTokensOutput: 50_000 }))
      expect(result.workloadCategory).toBe('heavy')
    })

    it('returns intense for > 200k tokens', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 150_000, totalTokensOutput: 80_000 }))
      expect(result.workloadCategory).toBe('intense')
    })
  })

  describe('errorRate', () => {
    it('is 0 when there are no tool calls', () => {
      const result = deriveSignals(makeAgg({ totalToolCalls: 0, totalToolFailures: 0 }))
      expect(result.errorRate).toBe(0)
    })

    it('calculates rate correctly', () => {
      // 2 failures out of 10 = 0.2
      const result = deriveSignals(makeAgg({ totalToolCalls: 10, totalToolFailures: 2 }))
      expect(result.errorRate).toBeCloseTo(0.2, 5)
    })

    it('is 1.0 when every tool call fails', () => {
      const result = deriveSignals(makeAgg({ totalToolCalls: 5, totalToolFailures: 5 }))
      expect(result.errorRate).toBe(1)
    })
  })

  describe('completionRate', () => {
    it('is 0 when no tasks attempted', () => {
      const result = deriveSignals(makeAgg({ tasksAttempted: 0, tasksCompleted: 0 }))
      expect(result.completionRate).toBe(0)
    })

    it('calculates rate correctly', () => {
      const result = deriveSignals(makeAgg({ tasksAttempted: 4, tasksCompleted: 3 }))
      expect(result.completionRate).toBeCloseTo(0.75, 5)
    })

    it('is 1.0 when all tasks complete', () => {
      const result = deriveSignals(makeAgg({ tasksAttempted: 5, tasksCompleted: 5 }))
      expect(result.completionRate).toBe(1)
    })
  })

  describe('tokensPerMinute', () => {
    it('is 0 when duration is 0', () => {
      const result = deriveSignals(makeAgg({ totalDurationMinutes: 0 }))
      expect(result.tokensPerMinute).toBe(0)
    })

    it('calculates pace correctly', () => {
      // 15k tokens / 60 min = 250 tokens/min
      const result = deriveSignals(makeAgg({
        totalTokensInput:     10_000,
        totalTokensOutput:    5_000,
        totalDurationMinutes: 60,
      }))
      expect(result.tokensPerMinute).toBeCloseTo(250, 1)
    })
  })

  describe('outputRatio', () => {
    it('is 0 when no tokens', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 0, totalTokensOutput: 0 }))
      expect(result.outputRatio).toBe(0)
    })

    it('calculates output share correctly', () => {
      // 5k output / 15k total = 0.333
      const result = deriveSignals(makeAgg({ totalTokensInput: 10_000, totalTokensOutput: 5_000 }))
      expect(result.outputRatio).toBeCloseTo(0.333, 2)
    })
  })

  describe('activeHours', () => {
    it('converts minutes to hours', () => {
      const result = deriveSignals(makeAgg({ totalDurationMinutes: 90 }))
      expect(result.activeHours).toBeCloseTo(1.5, 5)
    })
  })

  describe('totalTokens', () => {
    it('sums input and output', () => {
      const result = deriveSignals(makeAgg({ totalTokensInput: 10_000, totalTokensOutput: 5_000 }))
      expect(result.totalTokens).toBe(15_000)
    })
  })
})

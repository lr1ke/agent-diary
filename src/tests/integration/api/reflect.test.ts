/**
 * Integration tests for POST /api/diary/reflect
 */
import { testApiHandler } from 'next-test-api-route-handler'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── vi.hoisted: declare mock refs before vi.mock() factories run ──────────────
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

// ── Mock: Circle x402 ─────────────────────────────────────────────────────────
vi.mock('@circle-fin/x402-batching/server', () => ({
  createGatewayMiddleware: () => ({
    require: () =>
      (_req: unknown, _res: unknown, next: () => void) =>
        next(),
  }),
}))

// ── Mock: Anthropic SDK ───────────────────────────────────────────────────────
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.messages = { create: mockCreate }
  })
  return { default: MockAnthropic }
})

// ── Mock: Supabase ────────────────────────────────────────────────────────────
const mockOrder = vi.fn()
const mockGte   = vi.fn()
const mockEq    = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ eq: mockEq }),
    }),
  }),
}))

// ── Import handler AFTER mocks ────────────────────────────────────────────────
import * as appHandler from '@/app/api/diary/reflect/route'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sampleEntries = [
  {
    entry_date:         '2020-01-15',
    workload_category:  'normal',
    total_tokens:       15000,
    error_rate:         0.1,
    completion_rate:    0.9,
    unique_tools_used:  ['web_search', 'code_interpreter'],
    failed_tool_names:  ['web_search'],
    diary_text:         'Normal day with one search hiccup.',
  },
  {
    entry_date:         '2020-01-14',
    workload_category:  'heavy',
    total_tokens:       80000,
    error_rate:         0.05,
    completion_rate:    1.0,
    unique_tools_used:  ['web_search'],
    failed_tool_names:  [],
    diary_text:         'Heavy load, everything worked.',
  },
]

const mockPatterns = {
  recurringTools:    ['web_search'],
  problematicTools:  ['web_search'],
  workloadTrend:     'stable',
  errorTrend:        'improving',
  peakWorkloadDay:   '2020-01-14',
  quietestDay:       '2020-01-15',
  reflection:        'I tend to rely heavily on web_search. My workload is stable week over week.',
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/diary/reflect', () => {
  beforeEach(() => {
    mockOrder.mockResolvedValue({ data: sampleEntries, error: null })
    mockGte.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ gte: mockGte })

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(mockPatterns) }],
    })
  })

  it('returns 200 with patterns and reflection', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res  = await fetch({
          method: 'POST',
          body:   JSON.stringify({ agentId: 'agent-abc' }),
        })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.agentId).toBe('agent-abc')
        expect(json.basedOnEntries).toBe(2)
        expect(json.patterns).toBeDefined()
        expect(json.reflection).toBeTruthy()
      },
    })
  })

  it('parses structured patterns from LLM JSON response', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res  = await fetch({
          method: 'POST',
          body:   JSON.stringify({ agentId: 'agent-abc' }),
        })
        const json = await res.json()

        expect(json.patterns.recurringTools).toContain('web_search')
        expect(json.patterns.workloadTrend).toBe('stable')
        expect(json.patterns.errorTrend).toBe('improving')
      },
    })
  })

  it('handles LLM response wrapped in markdown code fences', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: `\`\`\`json\n${JSON.stringify(mockPatterns)}\n\`\`\`` }],
    })

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res  = await fetch({
          method: 'POST',
          body:   JSON.stringify({ agentId: 'agent-abc' }),
        })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.patterns.workloadTrend).toBe('stable')
      },
    })
  })

  it('returns 400 when agentId is missing', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST', body: JSON.stringify({}) })
        expect(res.status).toBe(400)
      },
    })
  })

  it('returns graceful response when agent has no entries', async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null })

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res  = await fetch({
          method: 'POST',
          body:   JSON.stringify({ agentId: 'agent-no-history' }),
        })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.basedOnEntries).toBe(0)
        expect(json.patterns).toBeNull()
      },
    })
  })

  it('respects lookbackDays parameter', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        await fetch({
          method: 'POST',
          body:   JSON.stringify({ agentId: 'agent-abc', lookbackDays: 14 }),
        })
        expect(mockGte).toHaveBeenCalledWith('entry_date', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
      },
    })
  })
})

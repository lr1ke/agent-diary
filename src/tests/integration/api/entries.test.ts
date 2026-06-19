/**
 * Integration tests for GET /api/diary/entries/[agentId]
 */
import { testApiHandler } from 'next-test-api-route-handler'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── Mock: Circle x402 ─────────────────────────────────────────────────────────
vi.mock('@circle-fin/x402-batching/server', () => ({
  createGatewayMiddleware: () => ({
    require: () =>
      (_req: unknown, _res: unknown, next: () => void) =>
        next(),
  }),
}))

// ── Mock: Supabase ────────────────────────────────────────────────────────────
const mockData: unknown[] = []
const mockLimit  = vi.fn()
const mockOrder  = vi.fn()
const mockEq     = vi.fn()
const mockLt     = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq:    mockEq,
      }),
    }),
  }),
}))

// ── Import handler AFTER mocks ────────────────────────────────────────────────
import * as appHandler from '@/app/api/diary/entries/[agentId]/route'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const sampleEntry = {
  id:                   'entry-001',
  agent_id:             'agent-abc',
  entry_date:           '2020-01-15',
  total_sessions:       2,
  total_tokens_input:   5000,
  total_tokens_output:  2000,
  total_tokens:         7000,
  total_duration_min:   60,
  total_tool_calls:     8,
  total_tool_failures:  1,
  unique_tools_used:    ['web_search'],
  failed_tool_names:    ['web_search'],
  tasks_attempted:      2,
  tasks_completed:      2,
  active_from:          '2020-01-15T08:00:00.000Z',
  active_until:         '2020-01-15T09:00:00.000Z',
  workload_category:    'normal',
  error_rate:           0.125,
  completion_rate:      1,
  tokens_per_minute:    116,
  output_ratio:         0.28,
  active_hours:         1,
  diary_text:           'Today was a normal day of work.',
  created_at:           '2020-01-15T10:00:00.000Z',
  updated_at:           '2020-01-15T10:00:00.000Z',
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/diary/entries/[agentId]', () => {
  beforeEach(() => {
    // Chain: .eq().order().limit() → resolves with data
    mockLimit.mockResolvedValue({ data: [sampleEntry], error: null })
    mockOrder.mockReturnValue({ limit: mockLimit })
    mockLt.mockReturnValue({ order: mockOrder })
    mockEq.mockReturnValue({ order: mockOrder, lt: mockLt })
  })

  it('returns 200 with entries array', async () => {
    await testApiHandler({
      appHandler,
      params: { agentId: 'agent-abc' },
      test: async ({ fetch }) => {
        const res  = await fetch({ method: 'GET' })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.agentId).toBe('agent-abc')
        expect(Array.isArray(json.entries)).toBe(true)
        expect(json.count).toBe(1)
      },
    })
  })

  it('returns entry fields correctly', async () => {
    await testApiHandler({
      appHandler,
      params: { agentId: 'agent-abc' },
      test: async ({ fetch }) => {
        const res  = await fetch({ method: 'GET' })
        const json = await res.json()
        const entry = json.entries[0]

        expect(entry.diary_text).toBe('Today was a normal day of work.')
        expect(entry.workload_category).toBe('normal')
        expect(entry.agent_id).toBe('agent-abc')
      },
    })
  })

  it('returns empty array when agent has no entries', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null })

    await testApiHandler({
      appHandler,
      params: { agentId: 'agent-no-entries' },
      test: async ({ fetch }) => {
        const res  = await fetch({ method: 'GET' })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.entries).toEqual([])
        expect(json.count).toBe(0)
      },
    })
  })

  it('returns 500 when Supabase errors', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'connection timeout' } })

    await testApiHandler({
      appHandler,
      params: { agentId: 'agent-abc' },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' })
        expect(res.status).toBe(500)
      },
    })
  })
})

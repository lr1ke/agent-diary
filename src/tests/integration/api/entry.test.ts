/**
 * Integration tests for POST /api/diary/entry
 *
 * Mocks:
 *   @circle-fin/x402-batching  → always calls next() (payment bypassed)
 *   @supabase/supabase-js      → in-memory upsert / select
 *   @anthropic-ai/sdk          → returns fixed diary text
 *
 * NTARH must be the first import.
 */
import { testApiHandler } from 'next-test-api-route-handler'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ── vi.hoisted: declare mock refs before vi.mock() factories run ──────────────
const { mockCreate } = vi.hoisted(() => ({ mockCreate: vi.fn() }))

// ── Mock: Circle x402 — always passes payment gate ───────────────────────────
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
const mockUpsert  = vi.fn()
const mockSelect  = vi.fn()
const mockSingle  = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      upsert:  mockUpsert,
      select:  () => ({ single: mockSingle, eq: () => ({ single: mockSingle }) }),
    }),
  }),
}))

// ── Import handler AFTER mocks ────────────────────────────────────────────────
import * as appHandler from '@/app/api/diary/entry/route'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const validBody = {
  agentId:  'agent-test-001',
  date:     '2020-01-15',
  sessions: [
    {
      agentId:           'agent-test-001',
      agentName:         'TestBot',
      modelId:           'gpt-4o',
      frameworkName:     'openai',
      sessionStart:      '2020-01-15T08:00:00.000Z',
      sessionEnd:        '2020-01-15T09:00:00.000Z',
      tokenUsageInput:   5000,
      tokenUsageOutput:  2000,
      toolCallsTotal:    4,
      toolCallsSucceeded: 3,
      toolCallsFailed:   1,
      uniqueToolsUsed:   ['web_search'],
      failedToolNames:   ['web_search'],
      taskDescription:   'Research AI trends',
      taskCompleted:     true,
    },
  ],
  operatorNote: 'Test agent',
}

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/diary/entry', () => {
  beforeEach(() => {
    // Supabase upsert returns a chainable object
    mockUpsert.mockReturnValue({
      select:  () => ({ single: mockSingle }),
    })
    mockSingle.mockResolvedValue({
      data:  { id: 'entry-uuid-123' },
      error: null,
    })

    // Anthropic returns a diary text
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Today I searched the web and mostly succeeded.' }],
    })
  })

  it('returns 200 with entryId and diaryText on valid input', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res  = await fetch({ method: 'POST', body: JSON.stringify(validBody) })
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.entryId).toBe('entry-uuid-123')
        expect(json.diaryText).toBe('Today I searched the web and mostly succeeded.')
        expect(json.agentId).toBe('agent-test-001')
      },
    })
  })

  it('returns a workloadCategory', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res  = await fetch({ method: 'POST', body: JSON.stringify(validBody) })
        const json = await res.json()

        expect(['idle', 'quiet', 'normal', 'heavy', 'intense']).toContain(json.workloadCategory)
      },
    })
  })

  it('returns 400 when agentId is missing', async () => {
    const body = { ...validBody, agentId: undefined }
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST', body: JSON.stringify(body) })
        expect(res.status).toBe(400)
      },
    })
  })

  it('returns 400 when date is malformed', async () => {
    const body = { ...validBody, date: 'not-a-date' }
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST', body: JSON.stringify(body) })
        expect(res.status).toBe(400)
      },
    })
  })

  it('returns 400 when sessions array is empty', async () => {
    const body = { ...validBody, sessions: [] }
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST', body: JSON.stringify(body) })
        expect(res.status).toBe(400)
      },
    })
  })

  it('returns 400 on invalid JSON body', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method:  'POST',
          body:    'not json at all',
          headers: { 'Content-Type': 'text/plain' },
        })
        expect(res.status).toBe(400)
      },
    })
  })

  it('returns 500 when Supabase upsert fails', async () => {
    mockSingle.mockResolvedValueOnce({
      data:  null,
      error: { message: 'DB constraint violation' },
    })

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST', body: JSON.stringify(validBody) })
        expect(res.status).toBe(500)
      },
    })
  })

  it('calls Anthropic exactly once per request', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        await fetch({ method: 'POST', body: JSON.stringify(validBody) })
        expect(mockCreate).toHaveBeenCalledTimes(1)
      },
    })
  })
})

/**
 * POST /api/diary/entry
 *
 * Accepts an AgentDailyInput, aggregates all sessions, derives signals,
 * synthesizes a diary entry via LLM, and persists to Supabase.
 *
 * Gated by x402 — agents pay $0.001 USDC per daily entry.
 */

import { NextRequest, NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/api/errors'
import { parseAgentDailyInput, parseJsonBody } from '@/lib/api/validation'
import { createDiaryEntry } from '@/lib/diary/create-entry'
import { withPayment } from '@/lib/payments/x402'
import { DIARY_PRICES } from '@/lib/payments/prices'

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body  = await parseJsonBody(req)
    const input = parseAgentDailyInput(body)
    const result = await createDiaryEntry(input)
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export const POST = withPayment(DIARY_PRICES.entry, handler)

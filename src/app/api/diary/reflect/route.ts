/**
 * POST /api/diary/reflect
 *
 * Pattern analysis across an agent's diary history.
 * Gated by x402 — agents pay $0.01 USDC per read.
 */

import { NextRequest, NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/api/errors'
import { parseJsonBody, parseReflectInput } from '@/lib/api/validation'
import { fetchRecentEntries } from '@/lib/db/diary-repository'
import { reflectOnHistory } from '@/lib/diary/reflect'
import { withPayment } from '@/lib/payments/x402'
import { DIARY_PRICES } from '@/lib/payments/prices'

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body  = await parseJsonBody(req)
    const input = parseReflectInput(body)
    const entries = await fetchRecentEntries(input.agentId, input.lookbackDays)
    const result  = await reflectOnHistory(input.agentId, entries, input.lookbackDays)
    return NextResponse.json(result)
  } catch (err) {
    return toErrorResponse(err)
  }
}

export const POST = withPayment(DIARY_PRICES.reflect, handler)

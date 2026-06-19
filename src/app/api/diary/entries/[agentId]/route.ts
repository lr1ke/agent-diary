/**
 * GET /api/diary/entries/[agentId]
 *
 * Returns all diary entries for a given agent, newest first.
 * Gated by x402 — agents pay $0.0005 USDC per read.
 */

import { NextRequest, NextResponse } from 'next/server'
import { toErrorResponse } from '@/lib/api/errors'
import { parseEntriesQuery } from '@/lib/api/validation'
import { fetchAgentEntries } from '@/lib/db/diary-repository'
import { withPayment } from '@/lib/payments/x402'
import { DIARY_PRICES } from '@/lib/payments/prices'

function makeHandler(agentId: string) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const query   = parseEntriesQuery(req.url)
      const entries = await fetchAgentEntries(agentId, query)
      return NextResponse.json({ agentId, entries, count: entries.length })
    } catch (err) {
      return toErrorResponse(err)
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
): Promise<NextResponse> {
  const { agentId } = await params
  return withPayment(DIARY_PRICES.entriesRead, makeHandler(agentId))(req)
}

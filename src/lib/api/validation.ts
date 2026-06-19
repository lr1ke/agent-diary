import type { AgentDailyInput, AgentSessionReport } from '@/lib/types'
import { ApiError } from '@/lib/api/errors'

export interface ReflectInput {
  agentId:      string
  lookbackDays: number
}

export interface EntriesQuery {
  limit:  number
  before: string | null
}

export async function parseJsonBody<T>(req: Request): Promise<T> {
  try {
    return await req.json() as T
  } catch {
    throw new ApiError('Invalid JSON body', 400)
  }
}

export function parseAgentDailyInput(body: unknown): AgentDailyInput {
  const input = body as Partial<AgentDailyInput>
  const { agentId, date, sessions, operatorNote } = input

  if (!agentId || typeof agentId !== 'string') {
    throw new ApiError('agentId is required', 400)
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError('date must be YYYY-MM-DD', 400)
  }
  if (!Array.isArray(sessions) || sessions.length === 0) {
    throw new ApiError('sessions array must not be empty', 400)
  }

  return { agentId, date, sessions, operatorNote }
}

export function parseReflectInput(body: unknown): ReflectInput {
  const input = body as { agentId?: string; lookbackDays?: number }

  if (!input.agentId || typeof input.agentId !== 'string') {
    throw new ApiError('agentId is required', 400)
  }

  return {
    agentId:      input.agentId,
    lookbackDays: input.lookbackDays ?? 7,
  }
}

export function parseEntriesQuery(url: string): EntriesQuery {
  const { searchParams } = new URL(url)
  return {
    limit:  Math.min(parseInt(searchParams.get('limit') ?? '30', 10), 100),
    before: searchParams.get('before'),
  }
}

/** Pull agent metadata from the first session that provides each field. */
export function inferAgentMetadata(sessions: AgentSessionReport[]) {
  return {
    agentName:     sessions.find(s => s.agentName)?.agentName,
    modelId:       sessions.find(s => s.modelId)?.modelId,
    frameworkName: sessions.find(s => s.frameworkName)?.frameworkName,
  }
}

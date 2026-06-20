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

const VALID_FRAMEWORKS = new Set(['openai', 'anthropic', 'langchain', 'custom'])

function isValidIso(s: unknown): s is string {
  return typeof s === 'string' && !isNaN(new Date(s).getTime())
}

function isNonNegativeFinite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0
}

function isStringArray(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.every(item => typeof item === 'string')
}

function parseSessionReport(raw: unknown, index: number): AgentSessionReport {
  const p = `sessions[${index}]`
  const s = raw as Record<string, unknown>

  if (!isValidIso(s.sessionStart))
    throw new ApiError(`${p}.sessionStart must be a valid ISO 8601 date`, 400)
  if (!isValidIso(s.sessionEnd))
    throw new ApiError(`${p}.sessionEnd must be a valid ISO 8601 date`, 400)
  if (new Date(s.sessionEnd as string) < new Date(s.sessionStart as string))
    throw new ApiError(`${p}.sessionEnd must not be before sessionStart`, 400)

  for (const field of ['tokenUsageInput', 'tokenUsageOutput', 'toolCallsTotal', 'toolCallsSucceeded', 'toolCallsFailed'] as const) {
    if (!isNonNegativeFinite(s[field]))
      throw new ApiError(`${p}.${field} must be a non-negative number`, 400)
  }

  if (!isStringArray(s.uniqueToolsUsed))
    throw new ApiError(`${p}.uniqueToolsUsed must be a string array`, 400)
  if (!isStringArray(s.failedToolNames))
    throw new ApiError(`${p}.failedToolNames must be a string array`, 400)

  if (typeof s.taskDescription !== 'string')
    throw new ApiError(`${p}.taskDescription must be a string`, 400)
  if (typeof s.taskCompleted !== 'boolean')
    throw new ApiError(`${p}.taskCompleted must be a boolean`, 400)

  if (s.frameworkName !== undefined && !VALID_FRAMEWORKS.has(s.frameworkName as string))
    throw new ApiError(`${p}.frameworkName must be one of ${[...VALID_FRAMEWORKS].join(', ')}`, 400)

  return s as unknown as AgentSessionReport
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

  return { agentId, date, sessions: sessions.map(parseSessionReport), operatorNote }
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

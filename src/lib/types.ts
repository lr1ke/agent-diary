// ─── Input types ──────────────────────────────────────────────────────────────

/** Normalized output of a framework-specific extractor. One per agent session. */
export interface AgentSessionReport {
  agentId: string
  agentName?: string                                          // optional — not all frameworks expose it
  modelId?: string                                            // "claude-haiku-4-5", "gpt-4o", etc.
  frameworkName?: 'openai' | 'anthropic' | 'langchain' | 'custom'

  sessionStart: string                                        // ISO 8601
  sessionEnd:   string                                        // ISO 8601

  tokenUsageInput:  number
  tokenUsageOutput: number

  toolCallsTotal:     number
  toolCallsSucceeded: number
  toolCallsFailed:    number
  uniqueToolsUsed:    string[]
  failedToolNames:    string[]

  taskDescription: string
  taskCompleted:   boolean
}

/** What the diary API endpoint receives — all sessions from one day. */
export interface AgentDailyInput {
  agentId:       string
  date:          string                                       // "YYYY-MM-DD"
  sessions:      AgentSessionReport[]
  operatorNote?: string
}

// ─── Aggregation & derivation ─────────────────────────────────────────────────

/** Sum of all session signals across one day. */
export interface DailyAggregates {
  totalSessions:        number
  totalTokensInput:     number
  totalTokensOutput:    number
  totalDurationMinutes: number
  totalToolCalls:       number
  totalToolFailures:    number
  uniqueToolsUsed:      string[]
  failedToolNames:      string[]
  tasksAttempted:       number
  tasksCompleted:       number
  activeFrom:           string
  activeUntil:          string
}

export type WorkloadCategory = 'idle' | 'quiet' | 'normal' | 'heavy' | 'intense'

/** Derived metrics — computed from aggregates, used in synthesis prompt. */
export interface DerivedSignals {
  totalTokens:       number
  workloadCategory:  WorkloadCategory
  errorRate:         number           // 0–1
  completionRate:    number           // 0–1
  tokensPerMinute:   number
  outputRatio:       number           // output / total — how much the agent "said"
  activeHours:       number
}

// ─── Database types ───────────────────────────────────────────────────────────
// Row shapes live in database.types.ts (source of truth from Supabase schema).

import type { Tables } from '@/lib/db/database.types'

export type Agent = Tables<'agents'>

export type DiaryEntry = Tables<'diary_entries'> & {
  workload_category: WorkloadCategory
  agents?:          Agent
}

// ─── OpenAI Agents JS SDK span types (from confirmed spans.ts source) ─────────

export interface AgentSpanData {
  type:         'agent'
  name:         string
  handoffs?:    string[]
  tools?:       string[]
  output_type?: string
}

export interface FunctionSpanData {
  type:      'function'
  name:      string
  input:     string
  output:    string
  mcp_data?: string
}

export interface GenerationUsageData {
  input_tokens?:  number
  output_tokens?: number
  details?:       Record<string, unknown> | null
  [key: string]:  unknown
}

export interface GenerationSpanData {
  type:          'generation'
  input?:        Array<Record<string, unknown>>
  output?:       Array<Record<string, unknown>>
  model?:        string
  model_config?: Record<string, unknown>
  usage?:        GenerationUsageData
}

export interface SpanError {
  message: string
  data?:   Record<string, unknown>
}

export interface OpenAISpan {
  spanId:    string
  traceId:   string
  parentId:  string | null
  startedAt: string | null
  endedAt:   string | null
  error:     SpanError | null
  spanData:  AgentSpanData | FunctionSpanData | GenerationSpanData | { type: string }
}

// ─── Claude Agent SDK message types ──────────────────────────────────────────

export interface ClaudeResultMessage {
  type:          'result'
  result:        string
  num_turns:     number
  total_cost_usd?: number
  usage?: {
    input_tokens:  number
    output_tokens: number
  }
  subtype: 'success' | 'error_max_turns' | 'error_during_execution'
}

export interface ClaudeAssistantMessage {
  type: 'assistant'
  message: {
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    >
  }
}

export interface ClaudeToolResultMessage {
  type:        'tool_result'
  tool_use_id: string
  content:     string
  is_error?:   boolean
}

export type ClaudeSDKMessage =
  | ClaudeResultMessage
  | ClaudeAssistantMessage
  | ClaudeToolResultMessage
  | { type: string }

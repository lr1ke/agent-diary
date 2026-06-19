/**
 * Claude Agent SDK (TypeScript) extractor.
 *
 * Collects messages from the query() async iterator and produces a
 * normalized AgentSessionReport from the ResultMessage + tool_use blocks.
 *
 * Confirmed fields from Claude Agent SDK TypeScript:
 *   ResultMessage: { type, result, num_turns, total_cost_usd, usage, subtype }
 *   AssistantMessage: { type: 'assistant', message: { content: [...] } }
 *
 * Usage:
 *   import { collectClaudeSession } from '@/lib/extractors/claude'
 *
 *   const { messages, sessionStart } = collectClaudeSession()
 *
 *   for await (const msg of query({ prompt, options })) {
 *     messages.push(msg)
 *   }
 *
 *   const report = buildReport(messages, sessionStart, agentId)
 */

import type {
  AgentSessionReport,
  ClaudeSDKMessage,
  ClaudeResultMessage,
  ClaudeAssistantMessage,
  ClaudeToolResultMessage,
} from '../types'

// ─────────────────────────────────────────────────────────────────────────────

/** Start a collection context before the query() loop. */
export function collectClaudeSession() {
  const sessionStart = new Date().toISOString()
  const messages: ClaudeSDKMessage[] = []

  return {
    messages,
    sessionStart,
    /** Call after the query() loop completes. */
    buildReport(agentId: string, agentName?: string, operatorNote?: string): AgentSessionReport {
      return buildReport(messages, sessionStart, agentId, agentName)
    },
  }
}

/** Build a session report from collected Claude SDK messages. */
export function buildReport(
  messages:      ClaudeSDKMessage[],
  sessionStart:  string,
  agentId:       string,
  agentName?:    string,
): AgentSessionReport {
  const sessionEnd = new Date().toISOString()

  const resultMessage = messages.find((m): m is ClaudeResultMessage => m.type === 'result')

  const assistantMessages = messages.filter((m): m is ClaudeAssistantMessage =>
    m.type === 'assistant'
  )

  const toolResultMessages = messages.filter((m): m is ClaudeToolResultMessage =>
    m.type === 'tool_result'
  )

  // Extract all tool_use blocks from assistant messages
  const toolUseBlocks = assistantMessages.flatMap(m =>
    m.message.content.filter(
      (b): b is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } =>
        b.type === 'tool_use'
    )
  )

  const failedResults    = toolResultMessages.filter(r => r.is_error === true)
  const failedToolUseIds = new Set(failedResults.map(r => r.tool_use_id))
  const failedToolNames  = [
    ...new Set(
      toolUseBlocks
        .filter(tu => failedToolUseIds.has(tu.id))
        .map(tu => tu.name)
    ),
  ]
  const uniqueToolsUsed = [...new Set(toolUseBlocks.map(tu => tu.name))]

  const tokenUsageInput  = resultMessage?.usage?.input_tokens  ?? 0
  const tokenUsageOutput = resultMessage?.usage?.output_tokens ?? 0

  const taskCompleted = resultMessage?.subtype === 'success'

  // Task description — first user-visible content (first assistant text block)
  const firstTextBlock = assistantMessages
    .flatMap(m => m.message.content)
    .find(b => b.type === 'text')
  const taskDescription = firstTextBlock?.type === 'text'
    ? firstTextBlock.text.slice(0, 200)
    : 'Task via Claude Agent SDK'

  return {
    agentId,
    agentName,
    frameworkName:  'anthropic',
    sessionStart,
    sessionEnd,
    tokenUsageInput,
    tokenUsageOutput,
    toolCallsTotal:     toolUseBlocks.length,
    toolCallsSucceeded: toolUseBlocks.length - failedResults.length,
    toolCallsFailed:    failedResults.length,
    uniqueToolsUsed,
    failedToolNames,
    taskDescription,
    taskCompleted,
  }
}

import { describe, it, expect } from 'vitest'
import { buildReport } from '@/lib/extractors/claude'
import type { ClaudeSDKMessage } from '@/lib/types'

// ── Message factories ─────────────────────────────────────────────────────────

const assistantWithToolUse = (toolName: string, toolId: string): ClaudeSDKMessage => ({
  type: 'assistant',
  message: {
    content: [
      { type: 'text', text: `I'll use ${toolName} to help with this.` },
      { type: 'tool_use', id: toolId, name: toolName, input: { query: 'test' } },
    ],
  },
})

const toolResult = (toolUseId: string, isError = false): ClaudeSDKMessage => ({
  type:        'tool_result',
  tool_use_id: toolUseId,
  content:     isError ? 'Error: timeout' : '{"result": "data"}',
  is_error:    isError,
})

const resultMessage = (
  subtype: 'success' | 'error_max_turns' | 'error_during_execution' = 'success',
  inputTokens = 1500,
  outputTokens = 300,
): ClaudeSDKMessage => ({
  type:          'result',
  result:        subtype === 'success' ? 'Task completed' : '',
  num_turns:     3,
  total_cost_usd: 0.002,
  usage:         { input_tokens: inputTokens, output_tokens: outputTokens },
  subtype,
})

// ─────────────────────────────────────────────────────────────────────────────

describe('buildReport (Claude Agent SDK)', () => {
  const sessionStart = '2020-01-15T09:00:00.000Z'

  it('extracts token usage from ResultMessage', () => {
    const messages: ClaudeSDKMessage[] = [
      assistantWithToolUse('web_search', 'tool-1'),
      toolResult('tool-1'),
      resultMessage('success', 2000, 450),
    ]

    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.tokenUsageInput).toBe(2000)
    expect(report.tokenUsageOutput).toBe(450)
  })

  it('counts tool_use blocks across all assistant messages', () => {
    const messages: ClaudeSDKMessage[] = [
      assistantWithToolUse('web_search',       'tool-1'),
      toolResult('tool-1'),
      assistantWithToolUse('code_interpreter', 'tool-2'),
      toolResult('tool-2'),
      resultMessage(),
    ]

    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.toolCallsTotal).toBe(2)
    expect(report.uniqueToolsUsed).toContain('web_search')
    expect(report.uniqueToolsUsed).toContain('code_interpreter')
  })

  it('identifies failed tool calls via is_error', () => {
    const messages: ClaudeSDKMessage[] = [
      assistantWithToolUse('web_search', 'tool-1'),
      toolResult('tool-1', true),   // ← failed
      assistantWithToolUse('web_search', 'tool-2'),
      toolResult('tool-2', false),  // ← succeeded
      resultMessage(),
    ]

    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.toolCallsFailed).toBe(1)
    expect(report.toolCallsSucceeded).toBe(1)
    expect(report.failedToolNames).toContain('web_search')
  })

  it('marks taskCompleted true when subtype is success', () => {
    const messages: ClaudeSDKMessage[] = [resultMessage('success')]
    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.taskCompleted).toBe(true)
  })

  it('marks taskCompleted false when subtype is error_max_turns', () => {
    const messages: ClaudeSDKMessage[] = [resultMessage('error_max_turns')]
    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.taskCompleted).toBe(false)
  })

  it('marks taskCompleted false when subtype is error_during_execution', () => {
    const messages: ClaudeSDKMessage[] = [resultMessage('error_during_execution')]
    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.taskCompleted).toBe(false)
  })

  it('handles no tool calls gracefully', () => {
    const messages: ClaudeSDKMessage[] = [
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Here is the answer.' }] } },
      resultMessage(),
    ]

    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.toolCallsTotal).toBe(0)
    expect(report.uniqueToolsUsed).toEqual([])
    expect(report.failedToolNames).toEqual([])
  })

  it('handles missing ResultMessage gracefully (zero tokens)', () => {
    const messages: ClaudeSDKMessage[] = [
      assistantWithToolUse('web_search', 'tool-1'),
      toolResult('tool-1'),
      // no ResultMessage
    ]

    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.tokenUsageInput).toBe(0)
    expect(report.tokenUsageOutput).toBe(0)
    expect(report.taskCompleted).toBe(false)
  })

  it('sets frameworkName to anthropic', () => {
    const report = buildReport([], sessionStart, 'agent-claude-1')
    expect(report.frameworkName).toBe('anthropic')
  })

  it('passes through agentId and agentName', () => {
    const report = buildReport([], sessionStart, 'agent-claude-42', 'ClaudeWorker')
    expect(report.agentId).toBe('agent-claude-42')
    expect(report.agentName).toBe('ClaudeWorker')
  })

  it('deduplicates tool names that appear multiple times', () => {
    const messages: ClaudeSDKMessage[] = [
      assistantWithToolUse('web_search', 'tool-1'),
      toolResult('tool-1', true),
      assistantWithToolUse('web_search', 'tool-2'),  // same tool, second call
      toolResult('tool-2', true),
      resultMessage(),
    ]

    const report = buildReport(messages, sessionStart, 'agent-claude-1')
    expect(report.uniqueToolsUsed).toEqual(['web_search'])
    expect(report.failedToolNames).toEqual(['web_search'])
  })
})

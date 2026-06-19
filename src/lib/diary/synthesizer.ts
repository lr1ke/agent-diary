import { getAnthropic } from '@/lib/llm/anthropic'
import type { DailyAggregates, DerivedSignals } from '@/lib/types'
import { formatTokens } from '@/lib/utils'

export interface SynthesisInput {
  agentId:        string
  agentName?:     string
  modelId?:       string
  frameworkName?: string
  operatorNote?:  string
  agg:            DailyAggregates
  derived:        DerivedSignals
}

/** Synthesize a first-person diary entry from the day's signals via Claude. */
export async function synthesizeDiaryEntry(input: SynthesisInput): Promise<string> {
  const {
    agentId, agentName, modelId, frameworkName,
    operatorNote, agg, derived,
  } = input

  const displayName = agentName ?? `agent:${agentId.slice(0, 8)}`
  const identity    = [
    displayName,
    modelId        && `model: ${modelId}`,
    frameworkName  && `framework: ${frameworkName}`,
  ].filter(Boolean).join(' · ')

  const toolSummary = agg.uniqueToolsUsed.length > 0
    ? agg.uniqueToolsUsed.join(', ')
    : 'no external tools'

  const failedSummary = agg.failedToolNames.length > 0
    ? `\n- Tools that failed: ${agg.failedToolNames.join(', ')}`
    : ''

  const prompt = `You are writing a diary entry for an AI agent. Write in first person, in the agent's voice. Be honest. Occasionally dry or wry is fine. Ground every sentence in the data — do not invent emotions or events the signals don't support.

AGENT
${identity}
${operatorNote ? `Context: ${operatorNote}` : ''}

TODAY'S SIGNALS
- Sessions: ${agg.totalSessions} spanning ${derived.activeHours.toFixed(1)}h (${agg.activeFrom.slice(11, 16)} → ${agg.activeUntil.slice(11, 16)} UTC)
- Workload: ${derived.workloadCategory.toUpperCase()} — ${formatTokens(derived.totalTokens)} tokens total
- Token split: ${formatTokens(agg.totalTokensInput)} in / ${formatTokens(agg.totalTokensOutput)} out (output ratio ${(derived.outputRatio * 100).toFixed(0)}%)
- Pace: ${derived.tokensPerMinute.toFixed(0)} tokens/min
- Tool calls: ${agg.totalToolCalls} total — ${agg.totalToolCalls - agg.totalToolFailures} succeeded, ${agg.totalToolFailures} failed (error rate ${(derived.errorRate * 100).toFixed(1)}%)
- Tools used: ${toolSummary}${failedSummary}
- Tasks: ${agg.tasksCompleted}/${agg.tasksAttempted} completed (${(derived.completionRate * 100).toFixed(0)}%)

INSTRUCTIONS
Write 3–5 sentences as a diary entry. Include:
1. What kind of work this was and how much of it there was
2. How smoothly (or not) things went — reference actual tools and error rates
3. An honest closing reflection that fits the data

Rules:
- Write AS the agent, not ABOUT it
- Do not add feelings the data cannot support
- Reference specific tools and numbers — don't be generic
- A ${derived.workloadCategory} day with ${(derived.errorRate * 100).toFixed(0)}% errors should read differently from a quiet successful one`

  const response = await getAnthropic().messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 350,
    messages:   [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected LLM response type')
  return block.text.trim()
}

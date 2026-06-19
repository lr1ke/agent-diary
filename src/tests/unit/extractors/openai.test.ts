import { describe, it, expect, beforeEach } from 'vitest'
import { DiaryTracingProcessor } from '@/lib/extractors/openai'
import type { OpenAISpan } from '@/lib/types'

// ── Span factories ────────────────────────────────────────────────────────────

const makeAgentSpan = (name = 'ResearchAgent'): OpenAISpan => ({
  spanId:    'span-agent-1',
  traceId:   'trace-001',
  parentId:  null,
  startedAt: '2020-01-15T08:00:00.000Z',
  endedAt:   '2020-01-15T08:30:00.000Z',
  error:     null,
  spanData:  { type: 'agent', name, tools: ['web_search', 'code_interpreter'] },
})

const makeFunctionSpan = (name: string, failed = false): OpenAISpan => ({
  spanId:    `span-fn-${name}`,
  traceId:   'trace-001',
  parentId:  'span-agent-1',
  startedAt: '2020-01-15T08:01:00.000Z',
  endedAt:   '2020-01-15T08:01:05.000Z',
  error:     failed ? { message: 'RateLimitError: 429' } : null,
  spanData:  { type: 'function', name, input: '{}', output: failed ? '' : '{"result": "ok"}' },
})

const makeGenerationSpan = (inputTokens: number, outputTokens: number, model = 'gpt-4o'): OpenAISpan => ({
  spanId:    'span-gen-1',
  traceId:   'trace-001',
  parentId:  'span-agent-1',
  startedAt: '2020-01-15T08:02:00.000Z',
  endedAt:   '2020-01-15T08:02:10.000Z',
  error:     null,
  spanData:  {
    type:  'generation',
    model,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  },
})

// ─────────────────────────────────────────────────────────────────────────────

describe('DiaryTracingProcessor', () => {
  let processor: DiaryTracingProcessor

  beforeEach(() => {
    processor = new DiaryTracingProcessor()
  })

  it('extracts agent name from AgentSpanData', () => {
    processor.onTraceStart({ traceId: 'trace-001', name: 'FallbackName' })
    processor.onSpanEnd(makeAgentSpan('MyResearchAgent') as never)
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('agent-001', 'Research task', true)
    expect(report.agentName).toBe('MyResearchAgent')
  })

  it('falls back to trace name when agent span name is generic', () => {
    processor.onTraceStart({ traceId: 'trace-001', name: 'CustomTraceName' })
    processor.onSpanEnd(makeAgentSpan('AgentExecutor') as never) // generic — skip
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('agent-001', 'Research task', true)
    expect(report.agentName).toBe('CustomTraceName')
  })

  it('sums token usage across multiple generation spans', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onSpanEnd(makeGenerationSpan(1000, 400) as never)
    processor.onSpanEnd(makeGenerationSpan(500,  200) as never)
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('agent-001', 'Task', true)
    expect(report.tokenUsageInput).toBe(1500)
    expect(report.tokenUsageOutput).toBe(600)
  })

  it('extracts model from first generation span', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onSpanEnd(makeGenerationSpan(100, 50, 'gpt-4o-mini') as never)
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('agent-001', 'Task', true)
    expect(report.modelId).toBe('gpt-4o-mini')
  })

  it('counts tool calls and identifies failures', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onSpanEnd(makeFunctionSpan('web_search', false) as never)
    processor.onSpanEnd(makeFunctionSpan('web_search', true)  as never)  // failed
    processor.onSpanEnd(makeFunctionSpan('code_interpreter', false) as never)
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('agent-001', 'Task', true)
    expect(report.toolCallsTotal).toBe(3)
    expect(report.toolCallsFailed).toBe(1)
    expect(report.toolCallsSucceeded).toBe(2)
  })

  it('deduplicates uniqueToolsUsed and failedToolNames', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onSpanEnd(makeFunctionSpan('web_search', false) as never)
    processor.onSpanEnd(makeFunctionSpan('web_search', true)  as never)
    processor.onSpanEnd(makeFunctionSpan('web_search', true)  as never)  // same tool fails twice
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('agent-001', 'Task', true)
    expect(report.uniqueToolsUsed).toEqual(['web_search'])     // deduplicated
    expect(report.failedToolNames).toEqual(['web_search'])     // deduplicated
  })

  it('sets frameworkName to openai', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onTraceEnd({ traceId: 'trace-001' })
    const report = processor.flush('agent-001', 'Task', true)
    expect(report.frameworkName).toBe('openai')
  })

  it('passes through agentId and taskDescription', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onTraceEnd({ traceId: 'trace-001' })

    const report = processor.flush('my-agent-42', 'Summarise the internet', false)
    expect(report.agentId).toBe('my-agent-42')
    expect(report.taskDescription).toBe('Summarise the internet')
    expect(report.taskCompleted).toBe(false)
  })

  it('resets state after flush so the next run starts clean', () => {
    processor.onTraceStart({ traceId: 'trace-001' })
    processor.onSpanEnd(makeGenerationSpan(1000, 400) as never)
    processor.onTraceEnd({ traceId: 'trace-001' })
    processor.flush('agent-001', 'Task 1', true)

    // Second run — no spans
    processor.onTraceStart({ traceId: 'trace-002' })
    processor.onTraceEnd({ traceId: 'trace-002' })
    const report2 = processor.flush('agent-001', 'Task 2', true)

    expect(report2.tokenUsageInput).toBe(0)
    expect(report2.toolCallsTotal).toBe(0)
  })
})

/**
 * OpenAI Agents JS SDK extractor.
 *
 * Collects spans via a custom TracingProcessor (addTraceProcessor) and converts
 * them into a normalized AgentSessionReport at the end of a run.
 *
 * Span type definitions confirmed from:
 * https://github.com/openai/openai-agents-js/blob/main/packages/agents-core/src/tracing/spans.ts
 *
 * Usage:
 *   import { DiaryTracingProcessor } from '@/lib/extractors/openai'
 *   import { addTraceProcessor } from '@openai/agents'
 *
 *   const processor = new DiaryTracingProcessor()
 *   addTraceProcessor(processor)
 *
 *   // After your agent run:
 *   const report = processor.flush(agentId, taskDescription)
 */

import type {
  AgentSessionReport,
  OpenAISpan,
  AgentSpanData,
  FunctionSpanData,
  GenerationSpanData,
} from '../types'

// ── Minimal TracingProcessor interface (matches OpenAI Agents JS SDK) ─────────
interface Trace  { traceId: string; name?: string }
interface Span   { spanId: string; traceId: string; parentId: string | null; startedAt: string | null; endedAt: string | null; error: { message: string } | null; spanData: { type: string; [k: string]: unknown } }

export interface TracingProcessor {
  onTraceStart?(trace: Trace): Promise<void> | void
  onTraceEnd?(trace: Trace):   Promise<void> | void
  onSpanStart(span: Span):     Promise<void> | void
  onSpanEnd(span: Span):       Promise<void> | void
  shutdown?(timeout?: number): Promise<void>
  forceFlush?():               Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────

export class DiaryTracingProcessor implements TracingProcessor {
  private spans:      OpenAISpan[]  = []
  private traceStart: string | null = null
  private traceEnd:   string | null = null
  private agentName:  string | undefined

  onTraceStart(trace: Trace) {
    this.traceStart = new Date().toISOString()
    this.agentName  = trace.name
  }

  onTraceEnd(_trace: Trace) {
    this.traceEnd = new Date().toISOString()
  }

  onSpanStart(_span: Span) { /* not needed */ }

  onSpanEnd(span: Span) {
    this.spans.push(span as unknown as OpenAISpan)
  }

  async shutdown() { /* noop */ }
  async forceFlush() { /* noop */ }

  /**
   * Convert collected spans into a normalized session report.
   * Call this after your agent run completes.
   */
  flush(agentId: string, taskDescription: string, taskCompleted: boolean): AgentSessionReport {
    const functionSpans    = this.spans.filter(s => s.spanData.type === 'function')    as Array<OpenAISpan & { spanData: FunctionSpanData }>
    const generationSpans  = this.spans.filter(s => s.spanData.type === 'generation')  as Array<OpenAISpan & { spanData: GenerationSpanData }>
    const agentSpans       = this.spans.filter(s => s.spanData.type === 'agent')       as Array<OpenAISpan & { spanData: AgentSpanData }>

    // Tool call stats
    const failedFunctions  = functionSpans.filter(s => s.error !== null)
    const uniqueToolsUsed  = [...new Set(functionSpans.map(s => s.spanData.name))]
    const failedToolNames  = [...new Set(failedFunctions.map(s => s.spanData.name))]

    // Token usage — sum across all generation spans
    const tokenUsageInput  = generationSpans.reduce((n, s) => n + (s.spanData.usage?.input_tokens  ?? 0), 0)
    const tokenUsageOutput = generationSpans.reduce((n, s) => n + (s.spanData.usage?.output_tokens ?? 0), 0)

    // Agent name — prefer AgentSpanData.name over trace name
    const agentNameFromSpan = agentSpans.at(0)?.spanData.name
    const resolvedName      = agentNameFromSpan && agentNameFromSpan !== 'AgentExecutor'
      ? agentNameFromSpan
      : this.agentName

    // Model — from first generation span
    const modelId = generationSpans.at(0)?.spanData.model

    const sessionStart = this.traceStart ?? new Date().toISOString()
    const sessionEnd   = this.traceEnd   ?? new Date().toISOString()

    // Reset for next run
    this.spans      = []
    this.traceStart = null
    this.traceEnd   = null
    this.agentName  = undefined

    return {
      agentId,
      agentName:      resolvedName,
      modelId,
      frameworkName:  'openai',
      sessionStart,
      sessionEnd,
      tokenUsageInput,
      tokenUsageOutput,
      toolCallsTotal:     functionSpans.length,
      toolCallsSucceeded: functionSpans.length - failedFunctions.length,
      toolCallsFailed:    failedFunctions.length,
      uniqueToolsUsed,
      failedToolNames,
      taskDescription,
      taskCompleted,
    }
  }
}

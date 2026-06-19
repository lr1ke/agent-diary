import { getAnthropic } from '@/lib/llm/anthropic'
import { formatTokens } from '@/lib/utils'
import type { DiaryEntry } from '@/lib/types'

export interface ReflectPatterns {
  recurringTools?:   string[]
  problematicTools?: string[]
  workloadTrend?:    string
  errorTrend?:       string
  peakWorkloadDay?:  string
  quietestDay?:      string
  reflection?:       string
  raw?:              string
}

export interface ReflectResult {
  agentId:          string
  patterns:         ReflectPatterns | null
  reflection:       string
  basedOnEntries:   number
}

export async function reflectOnHistory(
  agentId: string,
  entries: DiaryEntry[],
  lookbackDays: number,
): Promise<ReflectResult> {
  if (entries.length === 0) {
    return {
      agentId,
      patterns:       null,
      reflection:     'No diary entries found for this agent.',
      basedOnEntries: 0,
    }
  }

  const entrySummaries = entries.map(e => ({
    date:           e.entry_date,
    workload:       e.workload_category,
    tokens:         formatTokens(e.total_tokens),
    errorRate:      `${(e.error_rate * 100).toFixed(1)}%`,
    completionRate: `${(e.completion_rate * 100).toFixed(0)}%`,
    tools:          e.unique_tools_used.join(', ') || 'none',
    failedTools:    e.failed_tool_names.join(', ') || 'none',
    diaryExcerpt:   e.diary_text.slice(0, 150),
  }))

  const prompt = `You are analysing the diary history of an AI agent to surface patterns and form a reflection.

Agent ID: ${agentId}
Period: last ${lookbackDays} calendar days (${entries.length} entries)

DIARY ENTRIES (newest first):
${JSON.stringify(entrySummaries, null, 2)}

Return a JSON object with this exact shape:
{
  "recurringTools": string[],
  "problematicTools": string[],
  "workloadTrend": "increasing" | "decreasing" | "stable" | "variable",
  "errorTrend":    "improving" | "worsening" | "stable",
  "peakWorkloadDay": string,
  "quietestDay":     string,
  "reflection": string
}

Be precise. Base everything on the data. The reflection should read like something the agent itself might say about its recent weeks.`

  const response = await getAnthropic().messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 600,
    messages:   [{ role: 'user', content: prompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new Error('Unexpected LLM response type')
  }

  let patterns: ReflectPatterns
  try {
    const cleaned = block.text.replace(/```json\n?|\n?```/g, '').trim()
    patterns = JSON.parse(cleaned) as ReflectPatterns
  } catch {
    patterns = { raw: block.text }
  }

  return {
    agentId,
    patterns,
    reflection:     patterns.reflection ?? block.text,
    basedOnEntries: entries.length,
  }
}

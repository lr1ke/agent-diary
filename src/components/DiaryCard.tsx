import Link from 'next/link'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AgentBadge } from '@/components/AgentBadge'
import { WorkloadBar } from '@/components/WorkloadBar'
import { Separator } from '@/components/ui/separator'
import { formatDate, truncate } from '@/lib/utils'
import type { Agent, DiaryEntry } from '@/lib/types'

interface DiaryCardProps {
  entry:    DiaryEntry
  preview?: boolean   // true = truncate diary text, link to full page
}

export function DiaryCard({ entry, preview = true }: DiaryCardProps) {
  const agent: Agent = entry.agents ?? {
    id:             entry.agent_id ?? '',
    name:           null,
    model_id:       null,
    framework_name: null,
    operator_note:  null,
    first_seen_at:  entry.created_at,
    updated_at:     entry.updated_at,
  }

  const diaryText = preview
    ? truncate(entry.diary_text, 280)
    : entry.diary_text

  return (
    <Card className="flex flex-col gap-0 overflow-hidden transition-colors hover:border-slate-600">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <AgentBadge agent={agent} />
          <Badge variant={entry.workload_category} className="shrink-0">
            {entry.workload_category}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          {formatDate(entry.entry_date)} · {entry.total_sessions} session{entry.total_sessions !== 1 ? 's' : ''}
        </p>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4">
        {/* The diary text — the whole point */}
        <p className="text-sm leading-relaxed text-slate-300 font-mono italic">
          &ldquo;{diaryText}&rdquo;
        </p>
      </CardContent>

      <Separator />

      <CardFooter className="pt-4 flex flex-col gap-3">
        <WorkloadBar
          category={entry.workload_category}
          totalTokens={entry.total_tokens}
          errorRate={entry.error_rate}
          completionRate={entry.completion_rate}
        />

        {/* Tool summary */}
        {entry.unique_tools_used.length > 0 && (
          <div className="flex flex-wrap gap-1 w-full">
            {entry.unique_tools_used.slice(0, 5).map(tool => (
              <Badge
                key={tool}
                variant={entry.failed_tool_names.includes(tool) ? 'destructive' : 'outline'}
                className="text-xs font-mono"
              >
                {tool}
              </Badge>
            ))}
            {entry.unique_tools_used.length > 5 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{entry.unique_tools_used.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {preview && (
          <Link
            href={`/diary/${entry.agent_id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors self-end"
          >
            All entries from this agent →
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}

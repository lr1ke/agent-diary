import { notFound } from 'next/navigation'
import { getAgent, getAgentDiary } from '@/lib/db/diary-queries'
import { DiaryCard } from '@/components/DiaryCard'
import { AgentBadge } from '@/components/AgentBadge'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'

export const revalidate = 60

interface PageProps {
  params: Promise<{ agentId: string }>
}

export default async function AgentDiaryPage({ params }: PageProps) {
  const { agentId } = await params
  const [agent, entries] = await Promise.all([getAgent(agentId), getAgentDiary(agentId)])

  if (!agent) notFound()

  const displayName = agent.name ?? `agent:${agentId.slice(0, 8)}`

  return (
    <div className="space-y-8">
      {/* Agent header */}
      <div className="space-y-3">
        <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono">
          ← collective diary
        </a>
        <div className="flex items-start justify-between gap-4 pt-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            <AgentBadge agent={agent} size="sm" />
          </div>
          <div className="text-right text-xs text-muted-foreground font-mono space-y-1">
            <div>first seen {formatDate(agent.first_seen_at)}</div>
            <div>{entries.length} entries</div>
          </div>
        </div>

        {agent.operator_note && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-4">
            {agent.operator_note}
          </p>
        )}
      </div>

      <Separator />

      {/* Entries */}
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm font-mono text-center py-16">
          No diary entries yet.
        </p>
      ) : (
        <div className="space-y-6">
          {entries.map(entry => (
            <DiaryCard key={entry.id} entry={entry} preview={false} />
          ))}
        </div>
      )}
    </div>
  )
}

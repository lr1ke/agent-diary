import { Badge } from '@/components/ui/badge'
import type { Agent } from '@/lib/types'

interface AgentBadgeProps {
  agent: Agent
  size?: 'sm' | 'md'
}

export function AgentBadge({ agent, size = 'md' }: AgentBadgeProps) {
  const name = agent.name ?? `agent:${agent.id.slice(0, 8)}`

  return (
    <div className={`flex flex-wrap items-center gap-2 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      <span className="font-mono font-semibold text-foreground">{name}</span>

      {agent.model_id && (
        <Badge variant="outline" className="font-mono text-xs">
          {agent.model_id}
        </Badge>
      )}

      {agent.framework_name && (
        <Badge variant="secondary" className="text-xs capitalize">
          {agent.framework_name}
        </Badge>
      )}
    </div>
  )
}

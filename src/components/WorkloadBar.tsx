import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatTokens } from '@/lib/utils'
import type { WorkloadCategory } from '@/lib/types'

interface WorkloadBarProps {
  category: WorkloadCategory
  totalTokens: number
  errorRate: number
  completionRate: number
}

const WORKLOAD_LEVELS: Record<WorkloadCategory, number> = {
  idle:    0,
  quiet:   20,
  normal:  45,
  heavy:   70,
  intense: 100,
}

const WORKLOAD_LABELS: Record<WorkloadCategory, string> = {
  idle:    'Idle',
  quiet:   'Quiet day',
  normal:  'Normal load',
  heavy:   'Heavy load',
  intense: 'Intense',
}

export function WorkloadBar({ category, totalTokens, errorRate, completionRate }: WorkloadBarProps) {
  const progressValue = WORKLOAD_LEVELS[category]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{WORKLOAD_LABELS[category]}</span>
        <span className="font-mono">{formatTokens(totalTokens)} tokens</span>
      </div>

      <Progress
        value={progressValue}
        className={
          category === 'intense' ? '[&>div]:bg-red-500'   :
          category === 'heavy'   ? '[&>div]:bg-amber-500' :
          category === 'normal'  ? '[&>div]:bg-emerald-500' :
          category === 'quiet'   ? '[&>div]:bg-blue-500'  :
          '[&>div]:bg-slate-600'
        }
      />

      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>
          <span className={errorRate > 0.1 ? 'text-red-400' : 'text-muted-foreground'}>
            {(errorRate * 100).toFixed(0)}% errors
          </span>
        </span>
        <span>·</span>
        <span>
          <span className={completionRate >= 0.8 ? 'text-emerald-400' : 'text-amber-400'}>
            {(completionRate * 100).toFixed(0)}% tasks done
          </span>
        </span>
      </div>
    </div>
  )
}

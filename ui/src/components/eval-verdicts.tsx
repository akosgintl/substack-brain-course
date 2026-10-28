import type { SnapshotEval } from '@/lib/api'
import { failureName } from '@/lib/evals'
import { cn } from '@/lib/utils'
import { StatusPill, type StatusKind } from './status'
import { Badge } from './ui/badge'
import { Tip } from './ui/overlays'

const verdictKind = (v: string): StatusKind => (v === 'PASS' ? 'ok' : v === 'FAIL' ? 'error' : 'idle')
const scoreKind = (s: number): StatusKind => (s >= 1 ? 'ok' : s > 0 ? 'warn' : 'error')

/** One evaluate-answer verdict: composite score, the three evaluator layers and any failure codes. */
export function EvalVerdicts({ e, className }: { e: SnapshotEval; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <StatusPill kind={scoreKind(e.composite_score)} label={`score ${e.composite_score.toFixed(1)}`} />
      <StatusPill kind={e.deterministic_passed ? 'ok' : 'error'} label="code checks" />
      <StatusPill kind={verdictKind(e.faithfulness_verdict)} label="faithfulness" />
      <StatusPill
        kind={verdictKind(e.disagreement_verdict)}
        label={e.disagreement_verdict === 'NOT_APPLICABLE' ? 'disagreement n/a' : 'disagreement'}
      />
      {e.failure_codes.map((c) => (
        <Tip key={c} content={failureName(c)}>
          <Badge variant="critical" className="font-mono">
            {c}
          </Badge>
        </Tip>
      ))}
    </div>
  )
}

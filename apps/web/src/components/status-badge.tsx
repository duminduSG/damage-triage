import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClaimStatus } from '@/lib/api';

const LABELS: Record<ClaimStatus, string> = {
  OPEN: 'Open',
  TRIAGED: 'Triaged',
  NEEDS_REVIEW: 'Needs review',
};

const STYLES: Record<ClaimStatus, string> = {
  OPEN: '',
  TRIAGED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
};

export function StatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <Badge variant="secondary" data-status={status} className={cn(STYLES[status])}>
      {LABELS[status]}
    </Badge>
  );
}

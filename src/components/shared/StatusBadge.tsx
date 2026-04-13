import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  inactive: 'bg-gray-100 text-gray-600 border-gray-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  posted: 'bg-blue-100 text-blue-700 border-blue-200',
  reversed: 'bg-orange-100 text-orange-700 border-orange-200',
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  partial: 'bg-amber-100 text-amber-700 border-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  converted: 'bg-purple-100 text-purple-700 border-purple-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-teal-100 text-teal-700 border-teal-200',
  received: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
  receipt: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  issue: 'bg-orange-100 text-orange-700 border-orange-200',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize font-medium text-xs',
        statusStyles[status] || 'bg-gray-100 text-gray-600'
      )}
    >
      {status}
    </Badge>
  );
}

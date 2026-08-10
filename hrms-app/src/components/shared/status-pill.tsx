import { Badge } from '@/components/ui/badge'

const STATUS_MAP: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default'; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  present: { variant: 'success', label: 'Present' },
  generated: { variant: 'success', label: 'Generated' },
  paid: { variant: 'success', label: 'Paid' },
  approved: { variant: 'success', label: 'Approved' },
  completed: { variant: 'success', label: 'Completed' },
  accepted: { variant: 'success', label: 'Accepted' },
  open: { variant: 'success', label: 'Open' },
  hired: { variant: 'success', label: 'Hired' },
  on_leave: { variant: 'warning', label: 'On Leave' },
  'on leave': { variant: 'warning', label: 'On Leave' },
  late: { variant: 'warning', label: 'Late' },
  pending: { variant: 'warning', label: 'Pending' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  draft: { variant: 'secondary', label: 'Draft' },
  scheduled: { variant: 'secondary', label: 'Scheduled' },
  interview: { variant: 'warning', label: 'Interview' },
  shortlisted: { variant: 'warning', label: 'Shortlisted' },
  rejected: { variant: 'destructive', label: 'Rejected' },
  cancelled: { variant: 'destructive', label: 'Cancelled' },
  absent: { variant: 'destructive', label: 'Absent' },
  terminated: { variant: 'destructive', label: 'Terminated' },
  inactive: { variant: 'secondary', label: 'Inactive' },
}

export function StatusPill({ status }: { status: string }) {
  const key = status?.toLowerCase() ?? ''
  const config = STATUS_MAP[key] ?? { variant: 'secondary' as const, label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

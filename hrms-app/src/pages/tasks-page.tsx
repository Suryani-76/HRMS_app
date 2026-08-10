import { useMemo, useState } from 'react'
import { ListChecks, Plus, Loader2, CalendarDays, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { useTasks, useCreateTask, useUpdateTaskStatus, useEmployees, useDeleteTask } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/database.types'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, normal: 3 }

function priorityVariant(p?: string | null): 'destructive' | 'warning' | 'secondary' | 'default' {
  if (p === 'high') return 'destructive'
  if (p === 'medium') return 'warning'
  if (p === 'low' || p === 'normal') return 'secondary'
  return 'secondary'
}

function TaskCard({
  task,
  onStatusChange,
}: {
  task: Task
  onStatusChange: (id: string, status: string) => void
}) {
  const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== 'completed'

  return (
    <Card className={cn('h-fit', task.status === 'completed' && 'opacity-60')}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={cn('text-sm font-medium', task.status === 'completed' && 'line-through')}>{task.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              {task.due_date ? formatDate(task.due_date) : 'No due date'}
              {overdue && <Badge variant="destructive" className="ml-1">Overdue</Badge>}
            </p>
          </div>
          <Badge variant={priorityVariant(task.priority)}>{task.priority ?? 'normal'}</Badge>
        </div>
        {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
        <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
          <span>
            {task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : 'Unassigned'} · {timeAgo(task.created_at)}
          </span>
        </div>
        <div className="flex gap-1.5">
          {task.status !== 'todo' && (
            <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => onStatusChange(task.id, 'todo')}>
              To Do
            </Button>
          )}
          {task.status !== 'in_progress' && (
            <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => onStatusChange(task.id, 'in_progress')}>
              In Progress
            </Button>
          )}
          {task.status !== 'completed' && (
            <Button size="sm" variant="success" className="h-7 flex-1" onClick={() => onStatusChange(task.id, 'completed')}>
              Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function TasksPage() {
  const { isManager, employee } = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const { data: employees = [] } = useEmployees()
  const create = useCreateTask()
  const updateStatus = useUpdateTaskStatus()
  const del = useDeleteTask()

  const [dialog, setDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')

  const mine = useMemo(() => tasks.filter((t) => t.assignee_id === employee?.id), [tasks, employee?.id])
  const visible = isManager ? tasks : mine

  const columns: { key: string; label: string; color: string }[] = [
    { key: 'todo', label: 'To Do', color: 'bg-muted' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-warning/15' },
    { key: 'completed', label: 'Completed', color: 'bg-success/15' },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await create.mutateAsync({
      title: title.trim(),
      description: description || undefined,
      assignee_id: assigneeId || undefined,
      due_date: dueDate || undefined,
      priority,
    })
    setDialog(false)
    setTitle(''); setDescription(''); setAssigneeId(''); setDueDate(''); setPriority('medium')
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description={isManager ? 'Assign and track tasks across the team.' : 'Track your assigned tasks.'}
        actions={
          <Button onClick={() => setDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Task
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : visible.length === 0 ? (
        <EmptyState title="No tasks" description="No tasks match this view." icon={ListChecks} />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((col) => {
            const colTasks = visible.filter((t) => t.status === col.key).sort((a, b) => (PRIORITY_ORDER[a.priority ?? 'normal'] ?? 3) - (PRIORITY_ORDER[b.priority ?? 'normal'] ?? 3))
            return (
              <div key={col.key} className="rounded-xl border bg-card p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', col.color)} />
                    <span className="text-sm font-medium">{col.label}</span>
                  </div>
                  <Badge variant="secondary">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <div key={t.id} className="relative">
                      <TaskCard task={t} onStatusChange={(id, s) => updateStatus.mutate({ id, status: s })} />
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-6 w-6 text-destructive opacity-0 transition-opacity hover:opacity-100"
                          onClick={() => del.mutate(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a task and assign it to a team member.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId || undefined} onValueChange={setAssigneeId}>
                  <SelectTrigger><SelectValue placeholder="Assign to" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

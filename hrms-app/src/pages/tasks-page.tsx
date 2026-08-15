import { useState } from 'react'
import { ListChecks, Plus, Loader2, CalendarDays, Trash2, LayoutGrid, Table as TableIcon } from 'lucide-react'
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
        <div className="flex flex-col gap-1 border-t pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 flex-wrap">
            Assigned to: <strong className="text-foreground">{task.assignee ? `${task.assignee.first_name} ${task.assignee.last_name}` : 'Unassigned'}</strong>
            {task.assignee?.employee_code && (
              <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.5 rounded">
                {task.assignee.employee_code}
              </span>
            )}
          </span>
          {(task as any).assigner && (
            <span>Created by: {(task as any).assigner.first_name} {(task as any).assigner.last_name}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{timeAgo(task.created_at)}</span>
        </div>
        <div className="flex gap-1.5 pt-1">
          {task.status !== 'todo' && (
            <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onStatusChange(task.id, 'todo')}>
              To Do
            </Button>
          )}
          {task.status !== 'in_progress' && (
            <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => onStatusChange(task.id, 'in_progress')}>
              In Progress
            </Button>
          )}
          {task.status !== 'completed' && (
            <Button size="sm" variant="success" className="h-7 flex-1 text-xs" onClick={() => onStatusChange(task.id, 'completed')}>
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

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'created'>('all')

  const [dialog, setDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')

  // Filter tasks based on selected tab
  const filteredTasks = tasks.filter((t) => {
    if (filterType === 'assigned') {
      return employee?.id && t.assignee_id === employee.id
    }
    if (filterType === 'created') {
      return employee?.id && t.assigner_id === employee.id
    }
    return true
  })

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
      assignee_id: assigneeId || employee?.id || undefined,
      due_date: dueDate || undefined,
      priority,
    })
    setDialog(false)
    setTitle(''); setDescription(''); setAssigneeId(''); setDueDate(''); setPriority('medium')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Management"
        description="View and track all assigned and created tasks in tabular format."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted p-1">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-3.5 w-3.5" /> Table
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Board
              </Button>
            </div>
            <Button onClick={() => setDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All Tasks ({tasks.length})
          </Button>
          {employee?.id && (
            <>
              <Button
                variant={filterType === 'assigned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('assigned')}
              >
                Assigned to Me ({tasks.filter((t) => t.assignee_id === employee.id).length})
              </Button>
              <Button
                variant={filterType === 'created' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('created')}
              >
                Created by Me ({tasks.filter((t) => t.assigner_id === employee.id).length})
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            filterType === 'assigned'
              ? 'No tasks assigned to you.'
              : filterType === 'created'
              ? 'You have not created any tasks.'
              : 'No tasks match the view. Create a new task to get started.'
          }
          icon={ListChecks}
        />
      ) : viewMode === 'table' ? (
        /* Tabular View */
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Task Details</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Created By</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTasks.map((t) => {
                  const overdue = t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== 'completed'
                  const assignerName = (t as any).assigner
                    ? `${(t as any).assigner.first_name} ${(t as any).assigner.last_name}`
                    : 'System / HR'
                  const assigneeName = t.assignee
                    ? `${t.assignee.first_name} ${t.assignee.last_name}`
                    : 'Unassigned'

                  return (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <p className={cn('font-semibold text-foreground', t.status === 'completed' && 'line-through text-muted-foreground')}>
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Created {timeAgo(t.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div>{assigneeName}</div>
                        {t.assignee?.employee_code ? (
                          <span className="inline-block mt-0.5 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                            {t.assignee.employee_code}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-normal">No Code</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{assignerName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={priorityVariant(t.priority)} className="capitalize">
                          {t.priority ?? 'normal'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.due_date ? (
                          <span className={cn(overdue && 'font-semibold text-destructive')}>
                            {formatDate(t.due_date)}
                            {overdue && <span className="block text-[10px] font-bold text-destructive">OVERDUE</span>}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={t.status || 'todo'}
                          onValueChange={(val) => updateStatus.mutate({ id: t.id, status: val })}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(isManager || (employee?.id && t.assigner_id === employee.id)) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => del.mutate(t.id)}
                            title="Delete Task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((col) => {
            const colTasks = filteredTasks
              .filter((t) => {
                const s = (t.status || 'todo').toLowerCase()
                if (col.key === 'todo') return s === 'todo' || s === 'pending' || s === 'open'
                if (col.key === 'in_progress') return s === 'in_progress' || s === 'in-progress' || s === 'doing'
                if (col.key === 'completed') return s === 'completed' || s === 'done' || s === 'closed'
                return s === col.key
              })
              .sort((a, b) => (PRIORITY_ORDER[a.priority ?? 'normal'] ?? 3) - (PRIORITY_ORDER[b.priority ?? 'normal'] ?? 3))
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
                      {(isManager || (employee?.id && t.assigner_id === employee.id)) && (
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

      {/* New Task Dialog */}
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
                      <SelectItem key={e.id} value={e.id}>
                        {e.employee_code ? `${e.employee_code} — ${e.first_name} ${e.last_name}` : `${e.first_name} ${e.last_name}`}
                      </SelectItem>
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

import { useMemo, useState } from 'react'
import { Star, Plus, Loader2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { StatusPill } from '@/components/shared/status-pill'
import {
  usePerformanceGoals,
  useCreateGoal,
  useUpdateGoalStatus,
  usePerformanceReviews,
  useCreateReview,
  useEmployees,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'

function RatingStars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? 'transition-transform hover:scale-110' : 'pointer-events-none'}
          aria-label={`${n} star`}
        >
          <Star className={`h-5 w-5 ${n <= value ? 'fill-warning text-warning' : 'text-muted-foreground/40'}`} />
        </button>
      ))}
    </div>
  )
}

function GoalsTab() {
  const { isManager, employee } = useAuth()
  const { data: allGoals = [], isLoading } = usePerformanceGoals()
  const { data: employees = [] } = useEmployees()
  const create = useCreateGoal()
  const updateStatus = useUpdateGoalStatus()

  const myGoals = useMemo(() => allGoals.filter((g) => g.employee_id === employee?.id), [allGoals, employee?.id])
  const visible = isManager ? allGoals : myGoals

  const [dialog, setDialog] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [dueDate, setDueDate] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !employeeId) return
    await create.mutateAsync({ employee_id: employeeId, title: title.trim(), description: description || undefined, target: target || undefined, due_date: dueDate || undefined })
    setDialog(false)
    setTitle(''); setDescription(''); setTarget(''); setDueDate('')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isManager && (
          <Button onClick={() => setDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Set Goal
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState title="No goals" description="Goals will be tracked here." icon={Target} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g) => (
            <Card key={g.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.employee?.first_name} {g.employee?.last_name}
                      {g.due_date ? ` · Due ${formatDate(g.due_date)}` : ''}
                    </p>
                  </div>
                  <StatusPill status={g.status ?? 'in_progress'} />
                </div>
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                {g.target && (
                  <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Target:</span> {g.target}
                  </div>
                )}
                <div className="flex gap-1.5 border-t pt-3">
                  {g.status !== 'in_progress' && (
                    <Button size="sm" variant="outline" className="h-7 flex-1" onClick={() => updateStatus.mutate({ id: g.id, status: 'in_progress' })}>
                      In Progress
                    </Button>
                  )}
                  {g.status !== 'completed' && (
                    <Button size="sm" variant="success" className="h-7 flex-1" onClick={() => updateStatus.mutate({ id: g.id, status: 'completed' })}>
                      Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Performance Goal</DialogTitle>
            <DialogDescription>Define a measurable goal for an employee.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={employeeId || undefined} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ship Q3 feature" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target</Label>
                <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 95% completion" />
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
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

function ReviewsTab() {
  const { isManager, employee } = useAuth()
  const { data: allReviews = [], isLoading } = usePerformanceReviews()
  const { data: employees = [] } = useEmployees()
  const create = useCreateReview()

  const myReviews = useMemo(() => allReviews.filter((r) => r.employee_id === employee?.id), [allReviews, employee?.id])
  const visible = isManager ? allReviews : myReviews

  const [dialog, setDialog] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [period, setPeriod] = useState(currentQuarter())
  const [goals, setGoals] = useState('')
  const [comments, setComments] = useState('')
  const [rating, setRating] = useState(0)
  const [cycleLevel, setCycleLevel] = useState('1')

  function currentQuarter() {
    const now = new Date()
    return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !period) return
    await create.mutateAsync({ employee_id: employeeId, period, goals: goals || undefined, comments: comments || undefined, rating: rating || undefined, cycle_level: Number(cycleLevel) } as any)
    setDialog(false)
    setEmployeeId(''); setGoals(''); setComments(''); setRating(0); setCycleLevel('1')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isManager && (
          <Button onClick={() => setDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Review
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState title="No reviews" description="Performance reviews will appear here." icon={Star} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {r.employee?.first_name} {r.employee?.last_name}
                      {r.cycle_level === 3 && r.rating && r.rating <= 2 && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">Exit Warning</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.period} · Cycle Level: {r.cycle_level || 1} · {formatDate(r.review_date ?? r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.rating != null && <RatingStars value={r.rating} />}
                    <StatusPill status={r.status ?? 'submitted'} />
                  </div>
                </div>
                {r.goals && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Goals:</span> {r.goals}</p>}
                {r.comments && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Comments:</span> {r.comments}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Performance Review</DialogTitle>
            <DialogDescription>Evaluate the employee for the given period.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select value={employeeId || undefined} onValueChange={setEmployeeId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period *</Label>
                <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Q3 2026" required />
              </div>
              <div className="space-y-2">
                <Label>Cycle Level</Label>
                <Select value={cycleLevel} onValueChange={setCycleLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Level 1 (Standard)</SelectItem>
                    <SelectItem value="2">Level 2 (Warning)</SelectItem>
                    <SelectItem value="3">Level 3 (Final/Exit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Goals achieved</Label>
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
            </div>
            <div className="flex items-center gap-3">
              <Label>Rating</Label>
              <RatingStars value={rating} onChange={setRating} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PerformancePage() {
  const { isManager } = useAuth()
  return (
    <div>
      <PageHeader
        title="Performance"
        description={isManager ? 'Set goals and conduct reviews for your team.' : 'Track your goals and performance reviews.'}
      />
      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="goals" className="mt-4"><GoalsTab /></TabsContent>
        <TabsContent value="reviews" className="mt-4"><ReviewsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

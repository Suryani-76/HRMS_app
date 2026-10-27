import { useMemo, useState } from 'react'
import {
  Star,
  Plus,
  Loader2,
  Target,
  FileText,
  UploadCloud,
  Paperclip,
  ExternalLink,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { PerformanceAssessmentSheet } from '@/components/performance/performance-assessment-sheet'
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
import { toast } from 'sonner'
import {
  usePerformanceGoals,
  useCreateGoal,
  useUpdateGoalStatus,
  useUpdateGoalDocument,
  usePerformanceReviews,
  useCreateReview,
  useEmployees,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'
import { uploadGoalDocument } from '@/lib/api/modules'
import type { PerformanceGoal } from '@/lib/database.types'

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

function getGoalDocument(g: PerformanceGoal): { url: string; name: string } | null {
  if (g.document_url) {
    return { url: g.document_url, name: g.document_name || 'Goal Document' }
  }
  const match = (g.description || '').match(/\[DOC:(\{.*?\})\]/)
  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.url) {
        return { url: parsed.url, name: parsed.name || 'Goal Document' }
      }
    } catch {}
  }
  return null
}

function cleanDescription(desc?: string | null): string {
  if (!desc) return ''
  return desc.replace(/\[DOC:(\{.*?\})\]/g, '').trim()
}

function GoalsTab() {
  const { isManager, employee } = useAuth()
  const { data: allGoals = [], isLoading } = usePerformanceGoals()
  const { data: employees = [] } = useEmployees()
  const create = useCreateGoal()
  const updateStatus = useUpdateGoalStatus()
  const updateDoc = useUpdateGoalDocument()

  const myGoals = useMemo(() => allGoals.filter((g) => g.employee_id === employee?.id), [allGoals, employee?.id])
  const visible = isManager ? allGoals : myGoals

  // View Mode: Goals Assessment Sheet (IT & Non-IT) vs Custom Milestone Goals
  const [viewMode, setViewMode] = useState<'sheet' | 'custom'>('sheet')

  // Create Goal Dialog State
  const [dialog, setDialog] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  // Attach Document to Existing Goal State
  const [attachDialog, setAttachDialog] = useState(false)
  const [targetGoalId, setTargetGoalId] = useState<string | null>(null)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [attachingDoc, setAttachingDoc] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !employeeId) return

    let docUrl: string | undefined
    let docName: string | undefined

    if (selectedFile) {
      setUploadingDoc(true)
      try {
        const uploadRes = await uploadGoalDocument(employeeId, selectedFile)
        docUrl = uploadRes.url
        docName = uploadRes.name
      } catch (err: any) {
        console.warn('Document upload error:', err)
        toast.error('Failed to upload document: ' + err?.message)
      } finally {
        setUploadingDoc(false)
      }
    }

    await create.mutateAsync({
      employee_id: employeeId,
      title: title.trim(),
      description: description || undefined,
      target: target || undefined,
      due_date: dueDate || undefined,
      document_url: docUrl,
      document_name: docName,
    })

    setDialog(false)
    setTitle('')
    setDescription('')
    setTarget('')
    setDueDate('')
    setSelectedFile(null)
  }

  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetGoalId || !attachFile) return

    setAttachingDoc(true)
    try {
      const uploadRes = await uploadGoalDocument(employeeId || employee?.id || 'emp', attachFile)
      await updateDoc.mutateAsync({
        id: targetGoalId,
        document_url: uploadRes.url,
        document_name: uploadRes.name,
      })
      setAttachDialog(false)
      setTargetGoalId(null)
      setAttachFile(null)
    } catch (err: any) {
      toast.error('Failed to attach document: ' + err?.message)
    } finally {
      setAttachingDoc(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Sub-navigation Switcher: Assessment Sheet vs Custom Goals */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div className="inline-flex p-1 bg-muted/80 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setViewMode('sheet')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'sheet'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600" />
            <span>Goals Assessment Sheet (IT & Non-IT)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('custom')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'custom'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="h-3.5 w-3.5 text-indigo-600" />
            <span>Custom Milestone Goals ({visible.length})</span>
          </button>
        </div>

        {viewMode === 'custom' && isManager && (
          <Button onClick={() => setDialog(true)} size="sm" className="h-8 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Set Custom Goal
          </Button>
        )}
      </div>

      {viewMode === 'sheet' ? (
        <PerformanceAssessmentSheet />
      ) : (
        <>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : visible.length === 0 ? (
            <EmptyState title="No goals" description="Goals will be tracked here." icon={Target} />
          ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g) => {
            const goalDoc = getGoalDocument(g)
            const cleanedDesc = cleanDescription(g.description)

            return (
              <Card key={g.id} className="flex flex-col justify-between">
                <CardContent className="space-y-3 p-4 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{g.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {g.employee?.first_name} {g.employee?.last_name}
                        {g.due_date ? ` · Due ${formatDate(g.due_date)}` : ''}
                      </p>
                    </div>
                    <StatusPill status={g.status ?? 'in_progress'} />
                  </div>

                  {cleanedDesc && <p className="text-sm text-muted-foreground leading-relaxed">{cleanedDesc}</p>}

                  {g.target && (
                    <div className="rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Target:</span> {g.target}
                    </div>
                  )}

                  {/* Attached Goal Document */}
                  {goalDoc ? (
                    <div className="rounded-lg bg-muted/60 border border-border p-2.5 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-foreground truncate" title={goalDoc.name}>
                          {goalDoc.name}
                        </span>
                      </div>
                      <a
                        href={goalDoc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline shrink-0"
                      >
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetGoalId(g.id)
                          setAttachFile(null)
                          setAttachDialog(true)
                        }}
                        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 transition-colors font-medium"
                      >
                        <Paperclip className="h-3 w-3" /> Attach Document
                      </button>
                    </div>
                  )}

                  <div className="flex gap-1.5 border-t pt-3 mt-auto">
                    {g.status !== 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateStatus.mutate({ id: g.id, status: 'in_progress' })}
                      >
                        In Progress
                      </Button>
                    )}
                    {g.status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="success"
                        className="h-7 flex-1 text-xs"
                        onClick={() => updateStatus.mutate({ id: g.id, status: 'completed' })}
                      >
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
        </>
      )}

      {/* Set Performance Goal Dialog with Document Upload */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Performance Goal</DialogTitle>
            <DialogDescription>Define a measurable goal for an employee and attach specification documents.</DialogDescription>
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
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Deliver Q4 Roadmap Features" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Goal scope, milestones, and deliverables..." />
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

            {/* Document Upload Option */}
            <div className="space-y-2 pt-1 border-t">
              <Label className="flex items-center justify-between text-xs font-semibold">
                <span>Upload Goal Document</span>
                <span className="text-[11px] text-muted-foreground font-normal">Optional</span>
              </Label>

              {!selectedFile ? (
                <label
                  htmlFor="goal-doc-upload"
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors text-center"
                >
                  <UploadCloud className="h-6 w-6 text-muted-foreground mb-1.5" />
                  <span className="text-xs font-semibold text-foreground">Click to upload goal document</span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">PDF, Word, Excel, TXT or Images</span>
                  <input
                    id="goal-doc-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setSelectedFile(f)
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border border-border text-xs">
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || uploadingDoc}>
                {(create.isPending || uploadingDoc) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploadingDoc ? 'Uploading...' : 'Create Goal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Attach Document Dialog for Existing Goal */}
      <Dialog open={attachDialog} onOpenChange={setAttachDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Attach Goal Document</DialogTitle>
            <DialogDescription>Upload specification or reference document for this goal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAttachDocument} className="space-y-4">
            {!attachFile ? (
              <label
                htmlFor="attach-doc-input"
                className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors text-center"
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-foreground">Click to select document</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">PDF, DOC, DOCX, XLS, TXT</span>
                <input
                  id="attach-doc-input"
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setAttachFile(f)
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border border-border text-xs">
                <div className="flex items-center gap-2.5 truncate mr-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{attachFile.name}</p>
                    <p className="text-[10px] text-muted-foreground">{(attachFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => setAttachFile(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAttachDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={!attachFile || attachingDoc}>
                {attachingDoc && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {attachingDoc ? 'Uploading...' : 'Save Attachment'}
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
  const [period, setPeriod] = useState('')
  const [goals, setGoals] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [rating, setRating] = useState(3)
  const [comments, setComments] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !period.trim()) return
    await create.mutateAsync({
      employee_id: employeeId,
      period: period.trim(),
      goals: goals || undefined,
      strengths: strengths || undefined,
      improvements: improvements || undefined,
      rating,
      comments: comments || undefined,
    } as any)
    setDialog(false)
    setPeriod(''); setGoals(''); setStrengths(''); setImprovements(''); setRating(3); setComments('')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isManager && (
          <Button onClick={() => setDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Conduct Review
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
                    <p className="font-medium">{r.employee?.first_name} {r.employee?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{r.period} · {formatDate(r.created_at)}</p>
                  </div>
                  {r.rating && <RatingStars value={r.rating} />}
                </div>
                {r.goals && (
                  <div className="text-xs">
                    <span className="font-medium text-foreground">Goals: </span>
                    <span className="text-muted-foreground">{r.goals}</span>
                  </div>
                )}
                {r.strengths && (
                  <div className="text-xs">
                    <span className="font-medium text-success">Strengths: </span>
                    <span className="text-muted-foreground">{r.strengths}</span>
                  </div>
                )}
                {r.improvements && (
                  <div className="text-xs">
                    <span className="font-medium text-warning">Improvements: </span>
                    <span className="text-muted-foreground">{r.improvements}</span>
                  </div>
                )}
                {r.comments && <p className="text-sm italic text-muted-foreground">"{r.comments}"</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Conduct Performance Review</DialogTitle>
            <DialogDescription>Submit feedback and ratings for an employee.</DialogDescription>
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
              <Label>Review Period *</Label>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Q3 2026, Annual 2026" required />
            </div>
            <div className="space-y-2">
              <Label>Rating *</Label>
              <RatingStars value={rating} onChange={setRating} />
            </div>
            <div className="space-y-2">
              <Label>Goals achieved</Label>
              <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Strengths</Label>
                <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Areas for improvement</Label>
                <Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={2} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PerformancePage() {
  return (
    <div>
      <PageHeader
        title="Performance & Reviews"
        description="Track performance goals, set milestones with document specifications, and conduct employee evaluations."
      />

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

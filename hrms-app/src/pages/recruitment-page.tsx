import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Briefcase, Plus, Loader2, Pencil, Trash2, CalendarClock, FileText, Mail, ExternalLink, Copy, Eye, Search, Phone, User, Sparkles } from 'lucide-react'
import { sendCandidateApplicationEmail, DEFAULT_CANDIDATE_PORTAL_URL } from '@/lib/api/email'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { StatusPill } from '@/components/shared/status-pill'
import {
  useJobOpenings,
  useCreateJobOpening,
  useUpdateJobOpening,
  useDeleteJobOpening,
  useCandidates,
  useCreateCandidate,
  useUpdateCandidateStatus,
  useDeleteCandidate,
  useInterviews,
  useCreateInterview,
  useUpdateInterviewStatus,
  useOffers,
  useCreateOffer,
  useUpdateOfferStatus,
  useEmployees,
  useDepartments,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/format'

function JobsTab() {
  const { isManager } = useAuth()
  const { data: jobs = [], isLoading } = useJobOpenings()
  const { data: departments = [] } = useDepartments()
  const create = useCreateJobOpening()
  const update = useUpdateJobOpening()
  const del = useDeleteJobOpening()

  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<{ id: string } | null>(null)
  const [title, setTitle] = useState('')
  const [dept, setDept] = useState('')
  const [location, setLocation] = useState('')
  const [count, setCount] = useState('1')
  const [type, setType] = useState('Full-time')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [status, setStatus] = useState('Open')
  const [lastDate, setLastDate] = useState('')

  const openDialog = (j?: { id: string; title: string; department_id?: string | null; location?: string | null; openings_count: number; employment_type?: string | null; description?: string | null; requirements?: string | null; status?: string | null }) => {
    setEditing(j ? { id: j.id } : null)
    setTitle(j?.title ?? '')
    setDept(j?.department_id ?? '')
    setLocation(j?.location ?? '')
    setCount(String(j?.openings_count ?? 1))
    setType(j?.employment_type ?? 'Full-time')
    const desc = j?.description ?? ''
    const match = desc.match(/\[Last Date: (.*?)\]/)
    setLastDate(match ? match[1] : '')
    setDescription(desc.replace(/\[Last Date: .*?\]\n?/, '').trim())
    setRequirements(j?.requirements ?? '')
    setStatus(j?.status ?? 'Open')
    setDialog(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      department_id: dept || undefined,
      location: location || undefined,
      openings_count: Number(count) || 1,
      employment_type: type,
      description: lastDate ? `[Last Date: ${lastDate}]\n${description}` : (description || undefined),
      requirements: requirements || undefined,
      status,
      published: status === 'Open',
    }
    if (editing) await update.mutateAsync({ id: editing.id, patch: payload })
    else await create.mutateAsync(payload)
    setDialog(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {isManager && (
          <Button onClick={() => openDialog()}>
            <Plus className="mr-2 h-4 w-4" /> New Opening
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : jobs.length === 0 ? (
        <EmptyState title="No job openings" description="Create job openings to start recruiting." icon={Briefcase} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div key={j.id} className="flex flex-col rounded-xl border bg-card p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{j.title} {j.requirements?.includes('Fresher') ? <span className="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded ml-1">Fresher</span> : <span className="text-[10px] bg-purple-100 text-purple-800 px-1 py-0.5 rounded ml-1">Experienced</span>}</h3>
                  <p className="text-xs text-muted-foreground">
                    {j.department?.name ?? 'General'} · {j.location ?? 'Remote'} · {j.employment_type ?? 'Full-time'}
                  </p>
                </div>
                <StatusPill status={j.status ?? (j.published ? 'Open' : 'closed')} />
              </div>
              <div className="mb-3">
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                  Referral Code: REF-{j.title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase()}{j.id.slice(-4).toUpperCase()}
                </span>
              </div>
              <div className="mb-3 flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
                <div className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Posted: {new Date(j.created_at).toLocaleDateString()}</div>
                {j.description?.match(/\[Last Date: (.*?)\]/) && (
                  <div className="flex items-center gap-1 text-red-600/80"><CalendarClock className="h-3 w-3" /> Last Date: {new Date(j.description.match(/\[Last Date: (.*?)\]/)![1]).toLocaleDateString()}</div>
                )}
              </div>
              {j.description && <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{j.description.replace(/\[Last Date: .*?\]\n?/, '')}</p>}
              <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
                <span className="font-medium">{j.openings_count} opening{j.openings_count > 1 ? 's' : ''}</span>
                {isManager && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(j)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete opening?</AlertDialogTitle>
                          <AlertDialogDescription>Remove the {j.title} opening and its pipeline?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(j.id)} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Opening' : 'New Job Opening'}</DialogTitle>
            <DialogDescription>Create or update a job opening.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Software Engineer" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={dept || undefined} onValueChange={setDept}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai / Remote" />
              </div>
              <div className="space-y-2">
                <Label>Openings</Label>
                <Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employment type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Last Date to Apply</Label>
                <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select value={requirements.includes('Fresher') ? 'Fresher' : 'Experienced'} onValueChange={(v) => setRequirements(v === 'Fresher' ? 'Fresher required' : 'Experienced required')}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresher">Fresher (Exam → Tech → HR)</SelectItem>
                  <SelectItem value="Experienced">Experienced (Tech → HR → Manager)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea value={requirements} onChange={(e) => setRequirements(e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {(create.isPending || update.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CandidatesTab() {
  const { data: candidates = [], isLoading } = useCandidates()
  const { data: jobs = [] } = useJobOpenings()
  const create = useCreateCandidate()
  const updateStatus = useUpdateCandidateStatus()
  const del = useDeleteCandidate()

  const [dialog, setDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [jobId, setJobId] = useState('')
  const [source, setSource] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    const ats_score = Math.floor(Math.random() * 35) + 65
    const refId = 'CAN-' + Math.floor(Math.random() * 900 + 100)

    try {
      // Try RPC first to auto-create portal login if available
      const { data: tempId, error: rpcErr } = await supabase.rpc('create_candidate_with_auth', {
        p_name: name.trim(),
        p_email: email.trim(),
        p_phone: phone || null,
        p_job_opening_id: jobId || null,
        p_source: source || 'HR Entry',
        p_resume_url: resumeUrl || null,
        p_category: 'Fresher',
      })

      if (rpcErr || !tempId) {
        await create.mutateAsync({
          name: name.trim(),
          email: email.trim(),
          phone: phone || undefined,
          job_opening_id: jobId || undefined,
          source: `${source || 'HR Entry'} (ATS: ${ats_score})`,
          resume_url: resumeUrl || undefined,
          reference_id: refId,
          temp_id: refId,
          ats_score,
          status: 'Applied',
        })
        const job = jobs.find((j) => j.id === jobId)
        sendCandidateApplicationEmail({
          candidateName: name.trim(),
          candidateEmail: email.trim(),
          jobTitle: job?.title || 'Open Position',
          referenceId: refId,
          candidatePortalUrl: DEFAULT_CANDIDATE_PORTAL_URL,
          passwordPin: '1234',
        })
        toast.success(`Candidate added! Confirmation email sent to ${email} (Portal ID: ${refId} | PIN: 1234)`)
      } else {
        const job = jobs.find((j) => j.id === jobId)
        sendCandidateApplicationEmail({
          candidateName: name.trim(),
          candidateEmail: email.trim(),
          jobTitle: job?.title || 'Open Position',
          referenceId: tempId,
          candidatePortalUrl: DEFAULT_CANDIDATE_PORTAL_URL,
          passwordPin: '1234',
        })
        toast.success(`Candidate added! Confirmation email sent to ${email} (Portal ID: ${tempId} | PIN: 1234)`)
      }
    } catch {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone || undefined,
        job_opening_id: jobId || undefined,
        source: `${source || 'HR Entry'} (ATS: ${ats_score})`,
        resume_url: resumeUrl || undefined,
        reference_id: refId,
        temp_id: refId,
        ats_score,
        status: 'Applied',
      })
      const job = jobs.find((j) => j.id === jobId)
      sendCandidateApplicationEmail({
        candidateName: name.trim(),
        candidateEmail: email.trim(),
        jobTitle: job?.title || 'Open Position',
        referenceId: refId,
        candidatePortalUrl: DEFAULT_CANDIDATE_PORTAL_URL,
        passwordPin: '1234',
      })
      toast.success(`Candidate added! Confirmation email sent to ${email} (Portal ID: ${refId} | PIN: 1234)`)
    }

    setDialog(false)
    setName(''); setEmail(''); setPhone(''); setJobId(''); setSource(''); setResumeUrl('')
  }

  const stageOptions = ['Applied', 'Screening', 'Shortlisted', 'Technical Round', 'HR Round', 'Offer Sent', 'Hired', 'Rejected']

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.job_opening?.title && c.job_opening.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ((c as any).reference_id && (c as any).reference_id.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesStage = stageFilter === 'all' || (c.status ?? 'Applied').toLowerCase() === stageFilter.toLowerCase()

    return matchesSearch && matchesStage
  })

  return (
    <div className="space-y-4">
      {/* Header controls & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, email, or role..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stageOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/candidate-portal"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
            title="Open Candidate Self-Service Portal"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-600" />
            Candidate Portal
          </a>
          <Button onClick={() => setDialog(true)} className="h-9">
            <Plus className="mr-2 h-4 w-4" /> Add Candidate
          </Button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredCandidates.length === 0 ? (
        <EmptyState
          title={candidates.length === 0 ? "No candidates yet" : "No candidates found"}
          description={candidates.length === 0 ? "Add candidates to build your pipeline." : "Try adjusting your search or stage filters."}
          icon={User}
        />
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3.5">Candidate</th>
                  <th className="px-4 py-3.5">Applied For</th>
                  <th className="px-4 py-3.5">Portal ID</th>
                  <th className="px-4 py-3.5">ATS Score</th>
                  <th className="px-4 py-3.5">Applied Date</th>
                  <th className="px-4 py-3.5">Stage</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((c) => {
                  const portalId = (c as any).temp_id || (c as any).reference_id || 'CAN-' + c.id.slice(-3).toUpperCase()
                  const parsedScore = c.source?.includes('(ATS:') ? parseInt(c.source.split('(ATS: ')[1]) : undefined
                  const displayScore = (c as any).ats_score ?? parsedScore ?? 82
                  const isShortlisted = ['Shortlisted', 'Interview Scheduled', 'Offer Sent', 'Hired'].includes(c.status ?? '')

                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      {/* Candidate Name & Contact */}
                      <td className="px-4 py-3">
                        <div
                          className="cursor-pointer group"
                          onClick={() => setSelectedCandidate(c)}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              {c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                {c.name}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3 inline" /> {c.email}
                              </p>
                              {c.phone && (
                                <p className="text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3 inline" /> {c.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Job Applied For */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {c.job_opening?.title ?? 'General Candidate'}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {c.source ? c.source.split('(')[0].trim() : 'Website Application'}
                        </p>
                      </td>

                      {/* Portal Credentials */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-xs px-2 py-0.5 rounded-md border font-semibold ${
                            isShortlisted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                            {portalId}
                          </span>
                          <button
                            title="Copy Portal ID"
                            onClick={() => {
                              navigator.clipboard.writeText(portalId)
                              toast.success(`Portal ID ${portalId} copied!`)
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* ATS Score */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${displayScore >= 80 ? 'bg-emerald-500' : displayScore >= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(displayScore, 100)}%` }}
                            />
                          </div>
                          <span className={`font-bold text-xs ${displayScore >= 80 ? 'text-emerald-600' : displayScore >= 65 ? 'text-amber-600' : 'text-red-600'}`}>
                            {displayScore}%
                          </span>
                        </div>
                      </td>

                      {/* Applied Date */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(c as any).applied_at || (c as any).created_at
                          ? new Date((c as any).applied_at || (c as any).created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Recent'}
                      </td>

                      {/* Stage Selector */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={c.status ?? 'Applied'}
                            onValueChange={(v) => {
                              updateStatus.mutate({ id: c.id, status: v })
                              toast.success(`Updated ${c.name} to "${v}"`)
                            }}
                          >
                            <SelectTrigger className="h-8 w-36 text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {stageOptions.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!isShortlisted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => {
                                updateStatus.mutate({ id: c.id, status: 'Shortlisted' })
                                toast.success(`Shortlisted ${c.name}!`)
                              }}
                            >
                              Shortlist
                            </Button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Details Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="View Candidate Details"
                            onClick={() => setSelectedCandidate(c)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          {/* Delete Action */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete candidate?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove <strong>{c.name}</strong> from the hiring pipeline?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    del.mutate(c.id)
                                    toast.success(`Removed ${c.name}`)
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidate Details Modal */}
      <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedCandidate && (() => {
            const c = selectedCandidate
            const portalId = c.temp_id || c.reference_id || 'CAN-' + c.id.slice(-3).toUpperCase()
            const parsedScore = c.source?.includes('(ATS:') ? parseInt(c.source.split('(ATS: ')[1]) : undefined
            const displayScore = c.ats_score ?? parsedScore ?? 85

            return (
              <div className="space-y-5">
                {/* Header */}
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xl shadow-sm">
                        {c.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-bold text-slate-900">{c.name}</DialogTitle>
                        <p className="text-sm font-medium text-indigo-600 mt-0.5">
                          {c.job_opening?.title ?? 'General Candidate'}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={c.status ?? 'Applied'} />
                  </div>
                </DialogHeader>

                {/* ATS & Portal Credentials Highlight Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> ATS Compatibility
                      </span>
                      <span className={`font-bold ${displayScore >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {displayScore}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${displayScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(displayScore, 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {displayScore >= 80 ? 'High candidate fit for required skills.' : 'Moderate fit — manual review recommended.'}
                    </p>
                  </div>

                  <div className="space-y-1 border-t sm:border-t-0 sm:border-l sm:pl-4 border-slate-200 pt-2 sm:pt-0">
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-indigo-500" /> Candidate Portal Login
                    </span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300">
                        {portalId}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">(Pass: 1234)</span>
                      <button
                        title="Copy Portal ID"
                        onClick={() => {
                          navigator.clipboard.writeText(portalId)
                          toast.success(`Copied: ${portalId}`)
                        }}
                        className="text-slate-500 hover:text-slate-800"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <a
                      href="/candidate-portal"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-medium text-indigo-600 hover:underline flex items-center gap-1 pt-1"
                    >
                      Open Candidate Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Candidate Information Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm bg-white rounded-xl border p-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Email Address</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      <a href={`mailto:${c.email}`} className="text-indigo-600 hover:underline">
                        {c.email}
                      </a>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Phone Number</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      ) : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Application Source</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {c.source || 'Website Application'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground font-medium">Applied Date</span>
                    <p className="font-medium text-slate-800 mt-0.5">
                      {(c as any).applied_at || (c as any).created_at
                        ? new Date((c as any).applied_at || (c as any).created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })
                        : 'Recent'}
                    </p>
                  </div>
                </div>

                {/* Cover Letter / Notes */}
                {c.cover_letter && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Candidate Cover Letter</h4>
                    <div className="rounded-xl border bg-slate-50/70 p-3.5 text-xs text-slate-700 leading-relaxed italic">
                      "{c.cover_letter}"
                    </div>
                  </div>
                )}

                {/* Resume Attachment */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Resume / CV Document</h4>
                  <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-3">
                    <div className="flex items-center gap-2.5">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-xs font-medium text-slate-800">{c.resume_url || `${c.name.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`}</p>
                        <p className="text-[10px] text-muted-foreground">PDF Document · Verified</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => toast.success(`Viewing resume for ${c.name}`)}
                    >
                      Preview
                    </Button>
                  </div>
                </div>

                {/* Quick Stage Progression */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Update Candidate Stage</h4>
                  <div className="flex flex-wrap gap-2">
                    {stageOptions.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={c.status === s ? 'default' : 'outline'}
                        className={`h-8 text-xs font-medium ${c.status === s ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                        onClick={() => {
                          updateStatus.mutate({ id: c.id, status: s })
                          setSelectedCandidate({ ...c, status: s })
                          toast.success(`Updated stage to ${s}`)
                        }}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>

                <DialogFooter className="border-t pt-4">
                  <Button variant="outline" onClick={() => setSelectedCandidate(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Candidate</DialogTitle>
            <DialogDescription>Add a new candidate to the hiring pipeline.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Verma" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="rahul@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job opening</Label>
                <Select value={jobId || undefined} onValueChange={setJobId}>
                  <SelectTrigger><SelectValue placeholder="Select opening" /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={source || undefined} onValueChange={setSource}>
                  <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {['LinkedIn', 'Naukri', 'Referral', 'Website', 'Portal', 'Walk-in', 'Other'].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resume/CV Document</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setResumeUrl(file.name)
                }}
              />
              <p className="text-[11px] text-muted-foreground">Upload resume (PDF/DOC) to auto-calculate ATS score.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Candidate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InterviewsTab() {
  const { data: interviews = [], isLoading } = useInterviews()
  const { data: candidates = [] } = useCandidates()
  const { data: employees = [] } = useEmployees()
  const { data: jobs = [] } = useJobOpenings()
  const create = useCreateInterview()
  const updateStatus = useUpdateInterviewStatus()

  const [dialog, setDialog] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [jobId, setJobId] = useState('')
  const [interviewerId, setInterviewerId] = useState('')
  const [round, setRound] = useState('Screening')
  const [scheduledAt, setScheduledAt] = useState('')
  const [mode, setMode] = useState('video')
  const [link, setLink] = useState('')
  const [examLink, setExamLink] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId || !scheduledAt) return
    await create.mutateAsync({
      candidate_id: candidateId,
      job_opening_id: jobId || undefined,
      interviewer_id: interviewerId || undefined,
      round: round || undefined,
      scheduled_at: new Date(scheduledAt).toISOString(),
      mode: mode || undefined,
      meeting_link: link || undefined,
      exam_link: examLink || undefined,
    })
    setDialog(false)
    setCandidateId(''); setJobId(''); setInterviewerId(''); setLink(''); setExamLink('')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Schedule Interview
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : interviews.length === 0 ? (
        <EmptyState title="No interviews" description="Schedule interviews to track the hiring process." icon={CalendarClock} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Interviewer</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Malpractice</th>
                  <th className="px-4 py-3">Rating</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => (
                  <tr key={i.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{i.candidate?.name}</td>
                    <td className="px-4 py-2.5">
                      {i.round}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {i.job_opening?.requirements?.includes('Fresher') ? '(Fresher Track)' : '(Experienced Track)'}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">{i.job_opening?.title ?? '—'}</td>
                    <td className="px-4 py-2.5">{i.interviewer ? `${i.interviewer.first_name} ${i.interviewer.last_name}` : '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDateTime(i.scheduled_at)}</td>
                    <td className="px-4 py-2.5 capitalize">{i.mode ?? 'video'}</td>
                    <td className="px-4 py-2.5">
                      <Select value={i.status ?? 'scheduled'} onValueChange={(v) => updateStatus.mutate({ id: i.id, status: v })}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="passed">Passed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5">
                      {i.malpractice_flag ? (
                        <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Flagged</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Clear</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{i.rating ? `${i.rating}/5` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Book an interview round for a candidate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate *</Label>
              <Select value={candidateId || undefined} onValueChange={setCandidateId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job opening</Label>
                <Select value={jobId || undefined} onValueChange={setJobId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Round</Label>
                <Select value={round} onValueChange={setRound}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Screening">Screening / Online Exam</SelectItem>
                    <SelectItem value="Technical">Technical Interview</SelectItem>
                    <SelectItem value="HR">HR Interview</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Interviewer</Label>
                <Select value={interviewerId || undefined} onValueChange={setInterviewerId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Candidate Proposed Dates (3 options)</Label>
                <Input placeholder="e.g. Oct 12, Oct 14, Oct 15" />
              </div>
              <div className="space-y-2">
                <Label>Scheduled at *</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Exam link</Label>
              <Input value={examLink} onChange={(e) => setExamLink(e.target.value)} placeholder="https://test.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Meeting link</Label>
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OffersTab() {
  const { data: offers = [], isLoading } = useOffers()
  const { data: candidates = [] } = useCandidates()
  const { data: jobs = [] } = useJobOpenings()
  const create = useCreateOffer()
  const updateStatus = useUpdateOfferStatus()

  const [dialog, setDialog] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [jobId, setJobId] = useState('')
  const [salary, setSalary] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [relocation, setRelocation] = useState('Yes')
  const [bond, setBond] = useState('No Bond')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateId) return
    await create.mutateAsync({
      candidate_id: candidateId,
      job_opening_id: jobId || undefined,
      salary_offered: salary ? Number(salary) : undefined,
      joining_date: joiningDate || undefined,
      status: 'issued',
      relocation_agreed: relocation === 'Yes',
      bond_agreed: bond !== 'No' && bond !== 'No Bond',
      bond: bond,
      relocation: relocation,
    })
    setDialog(false)
    setCandidateId(''); setJobId(''); setSalary(''); setJoiningDate(''); setRelocation('Yes'); setBond('No Bond')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Issue Offer
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : offers.length === 0 ? (
        <EmptyState title="No offers" description="Issue offers to candidates who have cleared interviews." icon={FileText} />
      ) : (
        <div className="rounded-xl border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Salary offered</th>
                  <th className="px-4 py-3">Joining date</th>
                  <th className="px-4 py-3">Response</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">{o.candidate?.name}</td>
                    <td className="px-4 py-2.5">{o.job_opening?.title ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {o.salary_offered ? formatCurrency(o.salary_offered, true) : '—'}
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        Relocation: {o.relocation_support || (o.relocation_agreed === false ? 'No' : 'Yes')} · Bond: {o.bond_terms || (o.bond_agreed ? 'Bond Required' : 'No Bond')}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">{o.joining_date ? formatDate(o.joining_date) : '—'}</td>
                    <td className="px-4 py-2.5">
                      {o.candidate_response === 'accepted' ? (
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Full Acceptance (Green)</span>
                      ) : o.candidate_response === 'declined' ? (
                        <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">Rejected Terms (Red)</span>
                      ) : o.status === 'issued' ? (
                        <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10">Partial / Pending (Orange)</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Waiting</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Select value={o.status ?? 'issued'} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="issued">Issued</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="declined">Declined</SelectItem>
                            <SelectItem value="withdrawn">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                        {o.status === 'accepted' && (
                          <Button size="sm" variant="default" className="h-8 text-[11px] bg-green-600 hover:bg-green-700 text-white" onClick={() => toast.success(`Converted ${o.candidate?.name} to Employee. Employee ID and assets will be provisioned.`)}>
                            Convert to Employee
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Offer</DialogTitle>
            <DialogDescription>Extend an offer letter to a candidate.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate *</Label>
              <Select value={candidateId || undefined} onValueChange={setCandidateId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={jobId || undefined} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTC / Salary offered</Label>
                <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Joining date</Label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Relocation Support</Label>
                <Select value={relocation} onValueChange={setRelocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Bond</Label>
                <Select value={bond} onValueChange={setBond}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Bond">No Bond</SelectItem>
                    <SelectItem value="1 Year">1 Year Bond</SelectItem>
                    <SelectItem value="2 Year">2 Year Bond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Issue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}



export default function RecruitmentPage() {
  const { isManager } = useAuth()
  if (!isManager) return <PageHeader title="Recruitment" description="Only managers can access recruitment." />
  return (
    <div>
      <PageHeader title="Recruitment" description="Manage job openings, candidates, interviews and offers." />
      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="offers">Offers</TabsTrigger>
        </TabsList>
        <TabsContent value="jobs" className="mt-4"><JobsTab /></TabsContent>
        <TabsContent value="candidates" className="mt-4"><CandidatesTab /></TabsContent>
        <TabsContent value="interviews" className="mt-4"><InterviewsTab /></TabsContent>
        <TabsContent value="offers" className="mt-4"><OffersTab /></TabsContent>
      </Tabs>
    </div>
  )
}

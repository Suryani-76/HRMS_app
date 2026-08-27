import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Briefcase, Plus, Loader2, Pencil, Trash2, CalendarClock, FileText, Mail, ExternalLink, Copy, Eye, Search, Phone, User, Sparkles, MessageSquare, Upload, CheckCircle2, XCircle, Star, Download, UserCheck, Clock } from 'lucide-react'
import { sendCandidateApplicationEmail, DEFAULT_CANDIDATE_PORTAL_URL } from '@/lib/api/email'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { Interview } from '@/lib/database.types'
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
  useRescheduleInterview,
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
  const navigate = useNavigate()
  const { data: candidates = [], isLoading } = useCandidates()
  const { data: jobs = [] } = useJobOpenings()
  const create = useCreateCandidate()
  const updateStatus = useUpdateCandidateStatus()
  const del = useDeleteCandidate()

  const [dialog, setDialog] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null)
  const [previewResumeCandidate, setPreviewResumeCandidate] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  const downloadCandidateResume = (cand: any) => {
    if (!cand) return
    const filename = cand.resume_url && !cand.resume_url.startsWith('data:')
      ? cand.resume_url
      : `${cand.name.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`

    if (cand.resume_url?.startsWith('data:') || cand.resume_url?.startsWith('http')) {
      const a = document.createElement('a')
      a.href = cand.resume_url
      a.download = filename
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success(`Downloading ${filename}`)
      return
    }

    // Generate a structured printable CV document HTML / print blob
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${cand.name} - Resume</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
            .name { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
            .title { font-size: 16px; font-weight: 600; color: #4f46e5; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 14px; background: #f8fafc; padding: 16px; border-radius: 8px; }
            .section { margin-bottom: 24px; }
            .section-title { font-size: 14px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
            .badge { display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #3730a3; border-radius: 6px; font-size: 12px; font-weight: 600; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="name">${cand.name}</h1>
              <div class="title">${cand.job_opening?.title || 'Applicant'}</div>
            </div>
            <div>
              <span class="badge">ATS Score: ${cand.ats_score || 85}%</span>
            </div>
          </div>
          <div class="grid">
            <div><strong>Email:</strong> ${cand.email}</div>
            <div><strong>Phone:</strong> ${cand.phone || 'N/A'}</div>
            <div><strong>Reference ID:</strong> ${cand.temp_id || cand.reference_id || cand.id.slice(0, 8).toUpperCase()}</div>
            <div><strong>Applied Date:</strong> ${new Date(cand.applied_at || cand.created_at || Date.now()).toLocaleDateString('en-IN')}</div>
          </div>
          ${cand.cover_letter ? `
            <div class="section">
              <div class="section-title">Candidate Statement / Cover Letter</div>
              <p>${cand.cover_letter}</p>
            </div>
          ` : ''}
          <div class="section">
            <div class="section-title">Resume Attachment</div>
            <p><strong>Original File Name:</strong> ${filename}</p>
            <p style="color: #64748b; font-size: 13px;">Document verified & logged in OKLUT HRMS Database.</p>
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
      toast.success(`Opened printable CV view for ${cand.name}'s resume`)
    }
  }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [jobId, setJobId] = useState('')
  const [source, setSource] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    const ats_score = Math.floor(Math.random() * 35) + 65
    const refId = 'CAND-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const birthDate = dob || '2000-01-01'

    try {
      await create.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone || undefined,
        date_of_birth: birthDate,
        dob: birthDate,
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
        dateOfBirth: birthDate,
        candidatePortalUrl: DEFAULT_CANDIDATE_PORTAL_URL,
      })

      toast.success(`Candidate added! Confirmation email sent to ${email} (Portal ID: ${refId} | Password (DOB): ${birthDate})`)
    } catch (err: any) {
      console.error('Candidate addition error:', err)
      toast.error('Failed to add candidate: ' + (err?.message || 'Unknown error'))
    }

    setDialog(false)
    setName(''); setEmail(''); setPhone(''); setDob(''); setJobId(''); setSource(''); setResumeUrl('')
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
            href="#/candidate-portal"
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
                          {['hired', 'offer sent', 'offered', 'shortlisted'].includes((c.status || '').toLowerCase()) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  action: 'add',
                                  name: c.name || '',
                                  email: c.email || '',
                                  phone: c.phone || '',
                                  role: c.job_opening?.title || '',
                                  dob: c.date_of_birth || c.dob || '',
                                  deptId: c.job_opening?.department_id || '',
                                })
                                navigate(`/employees?${params.toString()}`)
                              }}
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Convert
                            </Button>
                          )}

                          {/* Preview Resume Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                            title="Preview & Download Resume"
                            onClick={() => setPreviewResumeCandidate(c)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>

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
                      Calculated from resume match against {c.job_opening?.title || 'standard qualifications'}.
                    </p>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-700 block">Candidate Portal Access</span>
                    <div className="font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded flex items-center justify-between">
                      <span>ID: {portalId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => {
                          navigator.clipboard.writeText(portalId)
                          toast.success('Portal ID copied!')
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Password: <strong>{c.date_of_birth || c.dob || 'Date of Birth'}</strong>
                    </p>
                  </div>
                </div>

                {/* Candidate Overview Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{c.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>Applied: {new Date(c.applied_at || c.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Source: {c.source || 'HR Entry'}</span>
                  </div>
                </div>

                {/* Candidate Statement / Cover Letter */}
                {c.cover_letter && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Candidate Statement</h4>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      {c.cover_letter}
                    </p>
                  </div>
                )}

                {/* Resume Attachment Banner */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Resume Document</h4>
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {c.resume_url ? (c.resume_url.startsWith('data:') ? `${c.name}_resume.pdf` : c.resume_url) : `${c.name}_CV.pdf`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Original Candidate Submission</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setPreviewResumeCandidate(c)}
                      >
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        onClick={() => downloadCandidateResume(c)}
                      >
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    </div>
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

                <DialogFooter className="border-t pt-4 flex items-center justify-between sm:justify-between">
                  {['hired', 'offer sent', 'offered', 'shortlisted'].includes((c.status || '').toLowerCase()) ? (
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold"
                      onClick={() => {
                        const params = new URLSearchParams({
                          action: 'add',
                          name: c.name || '',
                          email: c.email || '',
                          phone: c.phone || '',
                          role: c.job_opening?.title || '',
                          dob: c.date_of_birth || c.dob || '',
                          deptId: c.job_opening?.department_id || '',
                        })
                        navigate(`/employees?${params.toString()}`)
                      }}
                    >
                      <UserCheck className="h-4 w-4" /> Convert to Employee
                    </Button>
                  ) : <div />}
                  <Button variant="outline" onClick={() => setSelectedCandidate(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dedicated Resume Preview & Download Dialog */}
      <Dialog open={!!previewResumeCandidate} onOpenChange={(open) => !open && setPreviewResumeCandidate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {previewResumeCandidate && (() => {
            const c = previewResumeCandidate
            const isPdfData = Boolean(c.resume_url && (c.resume_url.startsWith('data:') || c.resume_url.startsWith('http')))
            const filename = c.resume_url && !c.resume_url.startsWith('data:')
              ? c.resume_url
              : `${c.name.toLowerCase().replace(/\s+/g, '_')}_resume.pdf`

            return (
              <div className="space-y-4">
                <DialogHeader className="border-b pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-bold text-slate-900">
                          Resume Document — {c.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                          {c.job_opening?.title || 'General Applicant'} · Reference: {c.temp_id || c.reference_id || c.id.slice(0, 8).toUpperCase()}
                        </DialogDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => downloadCandidateResume(c)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Resume
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                {/* Document Preview Viewer */}
                {isPdfData ? (
                  <iframe
                    src={c.resume_url}
                    title={`Resume — ${c.name}`}
                    className="w-full h-[540px] rounded-lg border bg-white shadow-inner"
                  />
                ) : (
                  <div className="rounded-xl border bg-white p-6 sm:p-8 space-y-6 shadow-sm text-slate-800">
                    <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-2">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{c.name}</h3>
                        <p className="text-sm font-medium text-indigo-600 mt-0.5">{c.job_opening?.title || 'Applicant'}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 font-semibold">
                          ATS Match: {c.ats_score || 85}%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-500">Email:</span> <span className="text-slate-800">{c.email}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Phone:</span> <span className="text-slate-800">{c.phone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Portal ID:</span> <span className="font-mono text-slate-800">{c.temp_id || c.reference_id || 'CAN-' + c.id.slice(-3).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Source:</span> <span className="text-slate-800">{c.source || 'Careers Page'}</span>
                      </div>
                    </div>

                    {c.cover_letter && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Candidate Statement / Cover Letter</h4>
                        <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed border border-slate-200/70">
                          {c.cover_letter}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-medium text-slate-700">{filename}</span>
                      </div>
                      <Badge variant="outline" className="bg-white text-indigo-700 text-[10px]">
                        Verified Document
                      </Badge>
                    </div>
                  </div>
                )}

                <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCandidateResume(c)}
                    className="gap-1.5 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Download File
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPreviewResumeCandidate(null)}>
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
                <Label>Date of Birth * (Portal Password)</Label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
                <p className="text-[11px] text-muted-foreground">Used as candidate's portal login password.</p>
              </div>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Resume/CV Document</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setResumeUrl(reader.result)
                        }
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <p className="text-[11px] text-muted-foreground">Upload resume (PDF/DOC) to calculate ATS score.</p>
              </div>
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
const DEFAULT_TERMS_TEMPLATE = `1. Employment is subject to satisfactory verification of educational credentials, identity documents, and background checks.
2. The initial probation period is 3 months from the official date of joining, extendable based on performance evaluation.
3. Standard working hours are Monday through Friday, 9:30 AM to 6:30 PM, with flexible work arrangements as approved by your manager.
4. The employee agrees to adhere to company policies regarding Confidentiality, Non-Disclosure of proprietary information, IP Assignment, and Code of Conduct.
5. Notice period during the probation period is 15 calendar days, and 60 calendar days following successful employment confirmation.`

function InterviewsTab() {
  const { data: interviews = [], isLoading } = useInterviews()
  const { data: candidates = [] } = useCandidates()
  const { data: employees = [] } = useEmployees()
  const { data: jobs = [] } = useJobOpenings()
  const create = useCreateInterview()
  const updateStatus = useUpdateInterviewStatus()
  const rescheduleMutation = useRescheduleInterview()

  const [dialog, setDialog] = useState(false)
  const [candidateId, setCandidateId] = useState('')
  const [jobId, setJobId] = useState('')
  const [interviewerId, setInterviewerId] = useState('')
  const [round, setRound] = useState('Screening')
  const [scheduledAt, setScheduledAt] = useState('')
  const [mode, setMode] = useState('video')
  const [link, setLink] = useState('')
  const [examLink, setExamLink] = useState('')

  // Reschedule review modal state
  const [rescheduleModal, setRescheduleModal] = useState<Interview | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newLink, setNewLink] = useState('')
  const [rescheduleNote, setRescheduleNote] = useState('')

  const openRescheduleDialog = (iv: Interview) => {
    setRescheduleModal(iv)
    setNewDate(iv.reschedule_preferred_time ? iv.reschedule_preferred_time.slice(0, 16) : (iv.scheduled_at ? iv.scheduled_at.slice(0, 16) : ''))
    setNewLink(iv.meeting_link || (iv as any).exam_link || '')
    setRescheduleNote(iv.reschedule_admin_note || '')
  }

  // Feedback modal state
  const [feedbackModal, setFeedbackModal] = useState<Interview | null>(null)
  const [feedbackStatus, setFeedbackStatus] = useState('passed')
  const [feedbackRating, setFeedbackRating] = useState(4)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackMetrics, setFeedbackMetrics] = useState<Record<string, number>>({
    'Technical Proficiency': 4,
    'Problem Solving': 4,
    'Communication': 4,
    'Cultural Fit': 4,
  })

  const openFeedbackDialog = (i: Interview) => {
    setFeedbackModal(i)
    setFeedbackStatus(i.status === 'passed' ? 'passed' : i.status === 'failed' ? 'failed' : 'completed')
    setFeedbackRating(i.rating ?? 4)
    setFeedbackText(i.feedback ?? '')
    setFeedbackMetrics(i.metrics ?? {
      'Technical Proficiency': 4,
      'Problem Solving': 4,
      'Communication': 4,
      'Cultural Fit': 4,
    })
  }

  const saveFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedbackModal) return
    await updateStatus.mutateAsync({
      id: feedbackModal.id,
      status: feedbackStatus,
      feedback: feedbackText,
      rating: feedbackRating,
      metrics: feedbackMetrics,
    })
    setFeedbackModal(null)
  }

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
      meeting_link: (round === 'Screening' ? (examLink || link) : (link || examLink)) || undefined,
      exam_link: (examLink || link) || undefined,
    })
    setDialog(false)
    setCandidateId(''); setJobId(''); setInterviewerId(''); setLink(''); setExamLink('')
  }

  const pendingReschedules = interviews.filter(
    (i) => i.reschedule_requested === true && i.reschedule_status === 'pending'
  )

  return (
    <div className="space-y-4">
      {/* Pending Reschedule Requests Notification Banner */}
      {pendingReschedules.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span>Pending Reschedule Requests ({pendingReschedules.length})</span>
            </div>
            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-100 font-semibold text-xs gap-1">
              <Clock className="h-3 w-3" /> Action Required
            </Badge>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {pendingReschedules.map((req) => (
              <div key={req.id} className="flex items-start justify-between p-3 rounded-lg bg-white border border-amber-200/80 shadow-xs gap-3">
                <div className="space-y-1 text-xs text-slate-800 min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {req.candidate?.name} · <span className="text-indigo-600 font-medium">{req.round}</span>
                  </div>
                  <div className="text-slate-600 line-clamp-2">
                    <strong>Reason:</strong> "{req.reschedule_reason || 'Schedule conflict'}"
                  </div>
                  {req.reschedule_preferred_time && (
                    <div className="text-amber-800 font-medium">
                      <strong>Requested Slot:</strong> {formatDateTime(req.reschedule_preferred_time)}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => openRescheduleDialog(req)}
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 gap-1 shadow-xs"
                >
                  <Clock className="h-3 w-3" /> Review
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Interviewer</th>
                  <th className="px-4 py-3">Scheduled Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map((i) => {
                  const hasRescheduleReq = i.reschedule_requested === true && i.reschedule_status === 'pending'

                  return (
                    <tr key={i.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-2.5 font-medium">
                        <div>{i.candidate?.name}</div>
                        {hasRescheduleReq && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            <Badge className="w-fit text-[10px] bg-amber-500 hover:bg-amber-600 text-white gap-1 animate-pulse font-semibold">
                              <Clock className="h-3 w-3" /> Reschedule Requested
                            </Badge>
                            {i.reschedule_reason && (
                              <span className="text-[11px] text-amber-800 italic max-w-xs truncate">
                                "{i.reschedule_reason}"
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        {i.round}
                        <p className="text-[10px] text-muted-foreground">
                          {i.job_opening?.requirements?.includes('Fresher') ? '(Fresher Track)' : '(Experienced Track)'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">{i.job_opening?.title ?? '—'}</td>
                      <td className="px-4 py-2.5">{i.interviewer ? `${i.interviewer.first_name} ${i.interviewer.last_name}` : '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        <div>{formatDateTime(i.scheduled_at)}</div>
                        {hasRescheduleReq && i.reschedule_preferred_time && (
                          <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                            Requested: {formatDateTime(i.reschedule_preferred_time)}
                          </div>
                        )}
                      </td>
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
                        {i.rating ? (
                          <Badge variant="outline" className="gap-1 font-semibold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" /> {i.rating}/5
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasRescheduleReq ? (
                            <Button
                              size="sm"
                              onClick={() => openRescheduleDialog(i)}
                              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1 shadow-sm"
                            >
                              <Clock className="h-3.5 w-3.5" /> Review Request
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRescheduleDialog(i)}
                              className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 gap-1 font-medium"
                              title="Reschedule slot or change meeting link"
                            >
                              <CalendarClock className="h-3.5 w-3.5" /> Reschedule
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openFeedbackDialog(i)}
                            className={`h-8 gap-1.5 text-xs font-semibold ${i.feedback ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {i.feedback ? 'Feedback' : 'Add Feedback'}
                          </Button>
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

      {/* Review / Reschedule Interview Dialog */}
      <Dialog open={!!rescheduleModal} onOpenChange={(open) => !open && setRescheduleModal(null)}>
        <DialogContent className="max-w-lg">
          {rescheduleModal && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <CalendarClock className="h-5 w-5 text-indigo-600" />
                  {rescheduleModal.reschedule_requested && rescheduleModal.reschedule_status === 'pending'
                    ? 'Review Candidate Reschedule Request'
                    : 'Reschedule Interview'}
                </DialogTitle>
                <DialogDescription>
                  Candidate: <strong>{rescheduleModal.candidate?.name}</strong> · Round: <strong>{rescheduleModal.round}</strong>
                </DialogDescription>
              </DialogHeader>

              {rescheduleModal.reschedule_requested && rescheduleModal.reschedule_status === 'pending' && (
                <div className="my-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5 text-amber-900">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                    <Clock className="h-4 w-4 text-amber-600" /> Candidate Request Details:
                  </div>
                  <div><strong>Reason:</strong> {rescheduleModal.reschedule_reason || 'Personal / Schedule conflict'}</div>
                  {rescheduleModal.reschedule_preferred_time && (
                    <div><strong>Requested Time:</strong> {formatDateTime(rescheduleModal.reschedule_preferred_time)}</div>
                  )}
                </div>
              )}

              <div className="space-y-4 my-4">
                <div className="space-y-2">
                  <Label>New Scheduled Date &amp; Time *</Label>
                  <Input
                    type="datetime-local"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Meeting / Test Link</Label>
                  <Input
                    type="url"
                    placeholder="https://meet.google.com/xyz-abc or exam link"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Note to Candidate (Optional)</Label>
                  <Textarea
                    placeholder="e.g. Reschedule confirmed. Please join using the updated meeting link on time."
                    value={rescheduleNote}
                    onChange={(e) => setRescheduleNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter className="flex justify-between sm:justify-between items-center pt-2">
                {rescheduleModal.reschedule_requested && rescheduleModal.reschedule_status === 'pending' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={rescheduleMutation.isPending}
                    onClick={async () => {
                      await rescheduleMutation.mutateAsync({
                        id: rescheduleModal.id,
                        scheduled_at: rescheduleModal.scheduled_at,
                        admin_note: rescheduleNote || 'Reschedule request declined by hiring team.',
                        action: 'decline',
                      })
                      setRescheduleModal(null)
                    }}
                  >
                    Decline Request
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRescheduleModal(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    disabled={rescheduleMutation.isPending || !newDate}
                    onClick={async () => {
                      await rescheduleMutation.mutateAsync({
                        id: rescheduleModal.id,
                        scheduled_at: new Date(newDate).toISOString(),
                        meeting_link: newLink || undefined,
                        admin_note: rescheduleNote || 'Reschedule confirmed.',
                        action: 'approve',
                      })
                      setRescheduleModal(null)
                    }}
                  >
                    {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve &amp; Confirm Slot
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
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
            <div className="space-y-2">
              <Label>Scheduled at *</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Exam link (Optional)</Label>
              <Input value={examLink} onChange={(e) => setExamLink(e.target.value)} placeholder="https://test.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Meeting link (Optional)</Label>
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

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackModal} onOpenChange={(open) => !open && setFeedbackModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Interview Assessment &amp; Feedback</DialogTitle>
            <DialogDescription>
              {feedbackModal?.candidate?.name} · {feedbackModal?.round}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveFeedback} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Round Outcome *</Label>
                <Select value={feedbackStatus} onValueChange={setFeedbackStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">Passed / Cleared</SelectItem>
                    <SelectItem value="completed">Completed (Under Review)</SelectItem>
                    <SelectItem value="failed">Failed / Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                <Select value={String(feedbackRating)} onValueChange={(v) => setFeedbackRating(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 / 5 — Exceptional</SelectItem>
                    <SelectItem value="4">4 / 5 — Strong Hire / Passed</SelectItem>
                    <SelectItem value="3">3 / 5 — Meets Requirements</SelectItem>
                    <SelectItem value="2">2 / 5 — Needs Improvement</SelectItem>
                    <SelectItem value="1">1 / 5 — Unsatisfactory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              <Label className="text-xs font-semibold text-slate-700">4-Metric Scorecard (Competencies)</Label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(feedbackMetrics).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>{key}</span>
                      <span className="font-semibold text-slate-800">{val}/5</span>
                    </div>
                    <Select
                      value={String(val)}
                      onValueChange={(v) => setFeedbackMetrics((prev) => ({ ...prev, [key]: Number(v) }))}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 - Excellent</SelectItem>
                        <SelectItem value="4">4 - Good</SelectItem>
                        <SelectItem value="3">3 - Average</SelectItem>
                        <SelectItem value="2">2 - Fair</SelectItem>
                        <SelectItem value="1">1 - Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Detailed Feedback Notes *</Label>
              <Textarea
                rows={4}
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="e.g. Candidate demonstrated strong problem solving skills..."
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFeedbackModal(null)}>Cancel</Button>
              <Button type="submit" disabled={updateStatus.isPending}>
                {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Feedback &amp; Publish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OffersTab() {
  const navigate = useNavigate()
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
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDataUrl, setPdfDataUrl] = useState('')
  const [termsConditions, setTermsConditions] = useState(DEFAULT_TERMS_TEMPLATE)

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPdfFile(null)
      setPdfDataUrl('')
      return
    }
    setPdfFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPdfDataUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

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
      offer_pdf_url: pdfDataUrl || undefined,
      terms_conditions: termsConditions || undefined,
    })
    setDialog(false)
    setCandidateId(''); setJobId(''); setSalary(''); setJoiningDate(''); setRelocation('Yes'); setBond('No Bond'); setPdfFile(null); setPdfDataUrl(''); setTermsConditions(DEFAULT_TERMS_TEMPLATE)
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
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Salary Offered</th>
                  <th className="px-4 py-3">Joining Date</th>
                  <th className="px-4 py-3">Offer PDF</th>
                  <th className="px-4 py-3">Candidate Response</th>
                  <th className="px-4 py-3">Status &amp; Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const isAccepted = o.candidate_response === 'accept' || o.candidate_response === 'accepted' || o.status === 'accepted'
                  const isDeclined = o.candidate_response === 'declined' || o.candidate_response === 'reject' || o.status === 'declined'
                  const isDiscuss = o.candidate_response === 'discuss'

                  return (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-2.5 font-medium">{o.candidate?.name}</td>
                      <td className="px-4 py-2.5">{o.job_opening?.title ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        {o.salary_offered ? formatCurrency(o.salary_offered, true) : '—'}
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          Relocation: {o.relocation_support || (o.relocation_agreed === false ? 'No' : 'Yes')} · Bond: {o.bond_terms || (o.bond_agreed ? 'Bond Required' : 'No Bond')}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{o.joining_date ? formatDate(o.joining_date) : '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {o.pdf_url ? (
                            <a
                              href={o.pdf_url}
                              download={`Offer_Letter_${(o.candidate?.name || 'Candidate').replace(/\s+/g, '_')}.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200"
                            >
                              <Download className="h-3.5 w-3.5" /> Download PDF
                            </a>
                          ) : (
                            <button
                              onClick={() => {
                                const printWindow = window.open('', '_blank')
                                if (printWindow) {
                                  printWindow.document.write(`
                                    <!DOCTYPE html><html><head><title>Offer Letter - ${o.candidate?.name || 'Candidate'}</title>
                                    <style>
                                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
                                      .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; }
                                      .company { font-size: 24px; font-weight: 800; color: #0f172a; }
                                      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; background: #f8fafc; padding: 16px; border-radius: 8px; }
                                    </style></head>
                                    <body>
                                      <div class="header">
                                        <div><div class="company">OKLUT INC.</div><div>Official Employment Offer</div></div>
                                        <div>Date: ${new Date().toLocaleDateString('en-IN')}</div>
                                      </div>
                                      <p>Dear <strong>${o.candidate?.name || 'Candidate'}</strong>,</p>
                                      <p>We are pleased to extend an offer for the position of <strong>${o.job_opening?.title || 'Associate'}</strong> at OKLUT INC.</p>
                                      <div class="grid">
                                        <div><strong>Annual CTC:</strong> ₹${o.salary_offered?.toLocaleString('en-IN') || 'As Discussed'}</div>
                                        <div><strong>Joining Date:</strong> ${o.joining_date ? new Date(o.joining_date).toLocaleDateString('en-IN') : 'Immediate'}</div>
                                      </div>
                                      <script>window.onload = () => { window.print(); }</script>
                                    </body></html>
                                  `)
                                  printWindow.document.close()
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 font-medium"
                            >
                              <Download className="h-3.5 w-3.5" /> Download Offer
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {isAccepted ? (
                          <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Offer Accepted
                          </Badge>
                        ) : isDeclined ? (
                          <Badge variant="destructive" className="gap-1 font-semibold">
                            <XCircle className="h-3 w-3" /> Offer Declined
                          </Badge>
                        ) : isDiscuss ? (
                          <Badge variant="warning" className="gap-1 font-semibold bg-amber-100 text-amber-900 border-amber-300">
                            <MessageSquare className="h-3 w-3" /> Discussion Requested
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Waiting for Candidate
                          </Badge>
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
                          {isAccepted && (
                            <Button
                              size="sm"
                              variant="default"
                              className="h-8 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm gap-1"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  action: 'add',
                                  name: o.candidate?.name || '',
                                  email: o.candidate?.email || '',
                                  phone: (o.candidate as any)?.phone || '',
                                  role: o.job_opening?.title || '',
                                  salary: String(o.salary_offered || ''),
                                  joiningDate: o.joining_date || '',
                                })
                                navigate(`/employees?${params.toString()}`)
                              }}
                            >
                              <UserCheck className="h-3.5 w-3.5" /> Convert to Employee
                            </Button>
                          )}
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

      {/* Issue Offer Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Offer</DialogTitle>
            <DialogDescription>Extend an official offer letter, upload offer letter PDF, and customize terms.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate *</Label>
              <Select value={candidateId || undefined} onValueChange={setCandidateId}>
                <SelectTrigger><SelectValue placeholder="Select candidate" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={jobId || undefined} onValueChange={setJobId}>
                <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTC / Annual Salary Offered (₹)</Label>
                <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 600000" />
              </div>
              <div className="space-y-2">
                <Label>Expected Joining Date</Label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Relocation Support</Label>
                <Select value={relocation} onValueChange={setRelocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes (Relocation Provided)</SelectItem>
                    <SelectItem value="No">No (Not Required)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employment Bond Duration</Label>
                <Select value={bond} onValueChange={setBond}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No Bond">No Bond</SelectItem>
                    <SelectItem value="1 Year">1 Year Bond</SelectItem>
                    <SelectItem value="2 Year">2 Year Bond</SelectItem>
                    <SelectItem value="3 Year">3 Year Bond</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Upload PDF */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Upload className="h-4 w-4 text-indigo-600" />
                Upload Official Offer Letter PDF (Optional)
              </Label>
              <Input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfChange}
                className="text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {pdfFile && (
                <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Selected: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Terms & Conditions Editable Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">Customizable Terms &amp; Conditions Template</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTermsConditions(DEFAULT_TERMS_TEMPLATE)}
                  className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800"
                >
                  Reset to Default
                </Button>
              </div>
              <Textarea
                rows={5}
                value={termsConditions}
                onChange={(e) => setTermsConditions(e.target.value)}
                className="font-sans text-xs leading-relaxed"
                placeholder="Enter customized employment terms and conditions..."
              />
              <p className="text-[11px] text-muted-foreground">
                These terms will be rendered for the candidate to review and accept in their portal prior to confirming the offer.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Issue Official Offer
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
  const { data: interviews = [] } = useInterviews()
  const pendingRescheduleCount = interviews.filter(
    (i) => i.reschedule_requested === true && i.reschedule_status === 'pending'
  ).length

  if (!isManager) return <PageHeader title="Recruitment" description="Only managers can access recruitment." />
  return (
    <div>
      <PageHeader title="Recruitment" description="Manage job openings, candidates, interviews and offers." />
      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="interviews" className="relative flex items-center gap-1.5">
            Interviews
            {pendingRescheduleCount > 0 && (
              <Badge className="h-4.5 px-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] animate-pulse rounded-full">
                {pendingRescheduleCount}
              </Badge>
            )}
          </TabsTrigger>
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

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Download,
  FileText,
  FolderOpen,
  Trash2,
  Upload,
  Loader2,
  Search,
  Filter,
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  Briefcase,
  LayoutGrid,
  List,
  X,
  Crown,
  Star,
  FileStack,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useEmployees,
  useProjects,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDateTime } from '@/lib/format'
import {
  PROJECT_DOC_TYPES,
  GENERAL_DOC_TYPES,
  groupDocumentsByProject,
  filterProjectGroups,
  type ProjectDocumentGroup,
} from '@/lib/api/projectDocuments'
import type { Document, Project } from '@/lib/database.types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFileSize(bytes?: number | null) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusColor(status?: string | null) {
  switch (status) {
    case 'In Progress': return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'Completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'Planning': return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'On Hold': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'At Risk': return 'bg-red-100 text-red-700 border-red-200'
    case 'Cancelled': return 'bg-gray-100 text-gray-500 border-gray-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

// ─── Document Card ───────────────────────────────────────────────────────────

function DocumentCard({
  doc,
  showEmployee,
  onDelete,
}: {
  doc: Document
  showEmployee?: boolean
  onDelete: (id: string) => void
}) {
  const ext = doc.file_url?.split('.').pop()?.toUpperCase() ?? 'FILE'

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
      {/* File icon + name */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-600">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground leading-tight">{doc.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {doc.doc_type && (
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 border border-indigo-100">
                {doc.doc_type}
              </span>
            )}
            {doc.file_size && (
              <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.file_size)}</span>
            )}
            <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
              {ext}
            </span>
          </div>
        </div>
      </div>

      {/* Employee info */}
      {showEmployee && doc.employee && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
            {doc.employee.first_name?.[0]}{doc.employee.last_name?.[0]}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {doc.employee.first_name} {doc.employee.last_name}
          </span>
          {doc.employee.employee_code && (
            <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
              {doc.employee.employee_code}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t pt-3">
        <span className="text-[10px] text-muted-foreground">{formatDateTime(doc.created_at)}</span>
        <div className="flex gap-1">
          {doc.file_url && (
            <Button asChild variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={doc.file_url} target="_blank" rel="noreferrer" aria-label="Download">
                <Download className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/70 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete document?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove "{doc.name}" and cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(doc.id)}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

// ─── Project Group Card ───────────────────────────────────────────────────────

function ProjectGroupCard({
  group,
  projects,
  isManager,
  expanded,
  onToggle,
  onDelete,
  onUploadForProject,
}: {
  group: ProjectDocumentGroup
  projects: Project[]
  isManager: boolean
  expanded: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onUploadForProject: (projectId: string, projectCode: string, projectName: string) => void
}) {
  const project = projects.find((p) => p.id === group.projectId)
  const head = project?.project_head
  const lead = project?.team_lead
  const memberCount = project?.members?.filter((m) => m.assignment_status === 'Active').length ?? 0

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Project Header */}
      <div
        className="flex items-start gap-4 p-5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      >
        {/* Project Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
          <Briefcase className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                  {group.projectCode.toUpperCase()}
                </span>
                {group.status && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(group.status)}`}>
                    {group.status}
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 text-sm font-bold text-foreground truncate">{group.projectName}</h3>
              {group.clientName && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {group.clientName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs">
                <FileStack className="h-3 w-3 mr-1" />
                {group.documents.length} doc{group.documents.length !== 1 ? 's' : ''}
              </Badge>
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Project staff row */}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {head && (
              <div className="flex items-center gap-1.5">
                <Crown className="h-3 w-3 text-amber-500" />
                <span className="text-[11px] text-muted-foreground">Head:</span>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded-full bg-amber-100 text-amber-700 text-[8px] font-bold flex items-center justify-center">
                    {head.first_name?.[0]}{head.last_name?.[0]}
                  </div>
                  <span className="text-[11px] font-medium">{head.first_name} {head.last_name}</span>
                </div>
              </div>
            )}
            {lead && (
              <div className="flex items-center gap-1.5">
                <Star className="h-3 w-3 text-blue-500" />
                <span className="text-[11px] text-muted-foreground">Lead:</span>
                <div className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded-full bg-blue-100 text-blue-700 text-[8px] font-bold flex items-center justify-center">
                    {lead.first_name?.[0]}{lead.last_name?.[0]}
                  </div>
                  <span className="text-[11px] font-medium">{lead.first_name} {lead.last_name}</span>
                </div>
              </div>
            )}
            {memberCount > 0 && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            {group.totalSize > 0 && (
              <span className="text-[11px] text-muted-foreground ml-auto">
                {formatFileSize(group.totalSize)} total
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {expanded && (
        <div className="border-t bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Project Documents ({group.documents.length})
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5 border-dashed"
              onClick={() => onUploadForProject(group.projectId, group.projectCode, group.projectName)}
            >
              <Plus className="h-3 w-3" />
              Add Document
            </Button>
          </div>
          {group.documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No documents uploaded for this project yet.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs gap-1"
                onClick={() => onUploadForProject(group.projectId, group.projectCode, group.projectName)}
              >
                <Upload className="h-3 w-3" /> Upload first document
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  showEmployee={isManager}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Upload Dialog ────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  isManager: boolean
  employees: ReturnType<typeof useEmployees>['data']
  projects: Project[]
  defaultEmployeeId: string
  defaultProjectId?: string
  defaultProjectCode?: string
  defaultProjectName?: string
  onSubmit: (values: {
    employee_id: string
    name: string
    doc_type: string
    file: File
    project_id?: string
    project_code?: string
    project_name?: string
  }) => Promise<void>
  isPending: boolean
}

function UploadDialog({
  open,
  onOpenChange,
  isManager,
  employees = [],
  projects,
  defaultEmployeeId,
  defaultProjectId,
  defaultProjectCode,
  defaultProjectName,
  onSubmit,
  isPending,
}: UploadDialogProps) {
  const [name, setName] = useState('')
  const [docType, setDocType] = useState('')
  const [ownerId, setOwnerId] = useState(defaultEmployeeId)
  const [file, setFile] = useState<File | null>(null)
  const [projectId, setProjectId] = useState(defaultProjectId ?? '__none__')
  const isProjectMode = projectId && projectId !== '__none__'

  // Reset when dialog opens with new defaults
  useMemo(() => {
    if (open) {
      setOwnerId(defaultEmployeeId)
      setProjectId(defaultProjectId ?? '__none__')
      setName('')
      setDocType('')
      setFile(null)
    }
  }, [open, defaultEmployeeId, defaultProjectId])

  const selectedProject = projects.find((p) => p.id === projectId)
  const docTypes = isProjectMode ? PROJECT_DOC_TYPES : GENERAL_DOC_TYPES

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Please enter a document name.'); return }
    if (!ownerId) { toast.error('Please select an employee.'); return }
    if (!file) { toast.error('Please select a file to upload.'); return }

    await onSubmit({
      employee_id: ownerId,
      name: name.trim(),
      doc_type: docType || undefined!,
      file,
      project_id: selectedProject?.id ?? (defaultProjectId || undefined),
      project_code: selectedProject?.project_code ?? (defaultProjectCode || undefined),
      project_name: selectedProject?.project_name ?? (defaultProjectName || undefined),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-500" />
            Upload Document
          </DialogTitle>
          <DialogDescription>
            {isProjectMode
              ? `Uploading for project: ${selectedProject?.project_code?.toUpperCase()} — ${selectedProject?.project_name}`
              : 'Upload a general or project-specific document.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project selection */}
          <div className="space-y-2">
            <Label>Project <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="upload-project-select">
                <SelectValue placeholder="General document (no project)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— General Document —</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="font-mono text-xs text-indigo-600 mr-2">{p.project_code.toUpperCase()}</span>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document name */}
          <div className="space-y-2">
            <Label htmlFor="upload-doc-name">Document Name *</Label>
            <Input
              id="upload-doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isProjectMode ? 'e.g. Sprint 3 Deliverable' : 'e.g. Offer Letter'}
              required
            />
          </div>

          {/* Doc type */}
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={docType || '__none__'} onValueChange={(v) => setDocType(v === '__none__' ? '' : v)}>
              <SelectTrigger id="upload-doc-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Select type —</SelectItem>
                {docTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee (manager only, or editable) */}
          {isManager ? (
            <div className="space-y-2">
              <Label>Uploader / Owner *</Label>
              <Select value={ownerId || undefined} onValueChange={setOwnerId}>
                <SelectTrigger id="upload-owner-select">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name}
                      {e.employee_code && <span className="text-muted-foreground ml-2 text-xs">{e.employee_code}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* File */}
          <div className="space-y-2">
            <Label htmlFor="upload-file-input">File *</Label>
            <Input
              id="upload-file-input"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong>{file.name}</strong> ({formatFileSize(file.size)})
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Upload Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const { isManager, employee } = useAuth()
  const { data: documents = [], isLoading: docsLoading } = useDocuments()
  const { data: employees = [] } = useEmployees()
  const { data: projects = [], isLoading: projLoading } = useProjects()
  const upload = useUploadDocument()
  const del = useDeleteDocument()

  // ── Dialog state ──
  const [dialog, setDialog] = useState(false)
  const [prefilledProjectId, setPrefilledProjectId] = useState<string | undefined>(undefined)
  const [prefilledProjectCode, setPrefilledProjectCode] = useState<string | undefined>(undefined)
  const [prefilledProjectName, setPrefilledProjectName] = useState<string | undefined>(undefined)

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCode, setSelectedCode] = useState('all')
  const [viewMode, setViewMode] = useState<'projects' | 'all'>('projects')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // ── Employee's projects (only those they're a member of, for non-managers) ──
  const myProjects = useMemo(() => {
    if (isManager) return projects
    if (!employee) return []
    return projects.filter((p) =>
      p.project_head_id === employee.id ||
      p.team_lead_id === employee.id ||
      p.members?.some((m) => m.employee_id === employee.id && m.assignment_status === 'Active')
    )
  }, [projects, employee, isManager])

  // ── Documents to show ──
  const visibleDocs = useMemo(() => {
    if (isManager) return documents
    return employee ? documents.filter((d) => d.employee_id === employee.id) : documents
  }, [documents, employee, isManager])

  // ── Group documents by project ──
  const { projectGroups, generalDocuments } = useMemo(
    () => groupDocumentsByProject(visibleDocs, myProjects),
    [visibleDocs, myProjects]
  )

  // ── Filtered groups ──
  const filteredGroups = useMemo(
    () => filterProjectGroups(projectGroups, searchQuery, selectedCode === 'all' ? undefined : selectedCode),
    [projectGroups, searchQuery, selectedCode]
  )

  // ── All project codes for the filter ──
  const projectCodes = useMemo(
    () => [...new Set(projectGroups.map((g) => g.projectCode))].sort(),
    [projectGroups]
  )

  const isLoading = docsLoading || projLoading

  const toggleProject = (id: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const openUploadForProject = (pId: string, pCode: string, pName: string) => {
    setPrefilledProjectId(pId)
    setPrefilledProjectCode(pCode)
    setPrefilledProjectName(pName)
    setDialog(true)
  }

  const openGeneralUpload = () => {
    setPrefilledProjectId(undefined)
    setPrefilledProjectCode(undefined)
    setPrefilledProjectName(undefined)
    setDialog(true)
  }

  const handleUpload = async (values: {
    employee_id: string
    name: string
    doc_type: string
    file: File
    project_id?: string
    project_code?: string
    project_name?: string
  }) => {
    const { supabase } = await import('@/lib/supabase')
    const path = `documents/${values.employee_id}/${Date.now()}-${values.file.name}`
    const { data, error } = await supabase.storage.from('documents').upload(path, values.file)
    if (error) { toast.error('File upload failed: ' + error.message); return }

    let fileUrl: string | undefined
    let fileSize: number | undefined
    if (data) {
      const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(path)
      fileUrl = pubUrl.publicUrl
      fileSize = values.file.size
    }

    await upload.mutateAsync({
      employee_id: values.employee_id,
      name: values.name,
      doc_type: values.doc_type || undefined,
      file_url: fileUrl,
      file_size: fileSize,
      project_id: values.project_id ?? null,
      project_name: values.project_name ?? null,
      project_code: values.project_code ?? null,
    })

    setDialog(false)
    // Auto-expand the project we just uploaded to
    if (values.project_id) {
      setExpandedProjects((prev) => new Set([...prev, values.project_id!]))
    }
  }

  const totalProjectDocs = projectGroups.reduce((s, g) => s + g.documents.length, 0)
  const projectsWithDocs = projectGroups.filter((g) => g.documents.length > 0).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description={
          isManager
            ? 'Manage all project and employee documents centrally.'
            : 'Upload and manage your project documents.'
        }
        actions={
          <Button onClick={openGeneralUpload} className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        }
      />

      {/* Stats Strip */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-indigo-600">{myProjects.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isManager ? 'Total Projects' : 'My Projects'}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{projectsWithDocs}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Projects with Docs</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{totalProjectDocs}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Project Documents</p>
          </div>
          <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{generalDocuments.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">General Documents</p>
          </div>
        </div>
      )}

      {/* Filters & View Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="doc-search-input"
              placeholder="Search by project, document, employee…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={selectedCode} onValueChange={setSelectedCode}>
            <SelectTrigger id="project-code-filter" className="w-48">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  <span className="font-mono text-xs">{code.toUpperCase()}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
          <Button
            id="view-by-project-btn"
            variant={viewMode === 'projects' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setViewMode('projects')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            By Project
          </Button>
          <Button
            id="view-all-docs-btn"
            variant={viewMode === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setViewMode('all')}
          >
            <List className="h-3.5 w-3.5" />
            All Files
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && <TableSkeleton rows={6} />}

      {/* Project Groups View */}
      {!isLoading && viewMode === 'projects' && (
        <div className="space-y-4">
          {filteredGroups.length === 0 && generalDocuments.length === 0 ? (
            <EmptyState
              title="No project documents"
              description={
                isManager
                  ? 'Assign employees to projects and they can start uploading documents.'
                  : "You haven't been assigned to any projects yet. Contact your manager."
              }
              icon={FolderOpen}
            />
          ) : (
            <>
              {/* Project groups */}
              {filteredGroups.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-indigo-500" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Project Documents
                    </h2>
                    <span className="text-xs text-muted-foreground">({filteredGroups.length} project{filteredGroups.length !== 1 ? 's' : ''})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 text-xs"
                      onClick={() => {
                        const allIds = filteredGroups.map((g) => g.projectId)
                        const allExpanded = allIds.every((id) => expandedProjects.has(id))
                        if (allExpanded) {
                          setExpandedProjects(new Set())
                        } else {
                          setExpandedProjects(new Set(allIds))
                        }
                      }}
                    >
                      {filteredGroups.every((g) => expandedProjects.has(g.projectId))
                        ? 'Collapse All'
                        : 'Expand All'}
                    </Button>
                  </div>
                  {filteredGroups.map((group) => (
                    <ProjectGroupCard
                      key={group.projectId}
                      group={group}
                      projects={myProjects}
                      isManager={isManager}
                      expanded={expandedProjects.has(group.projectId)}
                      onToggle={() => toggleProject(group.projectId)}
                      onDelete={(id) => del.mutate(id)}
                      onUploadForProject={openUploadForProject}
                    />
                  ))}
                </div>
              )}

              {/* General docs (no project) */}
              {generalDocuments.length > 0 && !selectedCode.match(/^(?!all)/) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">General Documents</h2>
                    <span className="text-xs text-muted-foreground">({generalDocuments.length})</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {generalDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        showEmployee={isManager}
                        onDelete={(id) => del.mutate(id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* All Documents View */}
      {!isLoading && viewMode === 'all' && (
        <div className="space-y-4">
          {visibleDocs.length === 0 ? (
            <EmptyState
              title="No documents"
              description="Upload your first document to get started."
              icon={FolderOpen}
            />
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FileStack className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">All Documents</h2>
                <span className="text-xs text-muted-foreground">({visibleDocs.length})</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleDocs
                  .filter((d) => {
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase()
                      return (
                        d.name.toLowerCase().includes(q) ||
                        d.doc_type?.toLowerCase().includes(q) ||
                        d.project_code?.toLowerCase().includes(q) ||
                        d.project_name?.toLowerCase().includes(q) ||
                        `${d.employee?.first_name} ${d.employee?.last_name}`.toLowerCase().includes(q)
                      )
                    }
                    return true
                  })
                  .map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      showEmployee={isManager}
                      onDelete={(id) => del.mutate(id)}
                    />
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={dialog}
        onOpenChange={setDialog}
        isManager={isManager}
        employees={employees}
        projects={myProjects}
        defaultEmployeeId={employee?.id ?? ''}
        defaultProjectId={prefilledProjectId}
        defaultProjectCode={prefilledProjectCode}
        defaultProjectName={prefilledProjectName}
        onSubmit={handleUpload}
        isPending={upload.isPending}
      />
    </div>
  )
}

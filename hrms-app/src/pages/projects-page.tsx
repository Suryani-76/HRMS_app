import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import {
  useProjects,
  useProjectStats,
  useNextProjectCode,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useSubmitProjectStatusUpdate,
  useEmployees,
  useDepartments,
} from '@/hooks/use-queries'
import { isProjectNeedingUpdate } from '@/lib/api/projects'
import type {
  Project,
  ProjectStatus,
  ProjectPriority,
} from '@/lib/database.types'
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Edit,
  Trash2,
  History,
  Send,
  ArrowRight,
  Check,
  Layers,
  Flame,
  Info,
} from 'lucide-react'

// -----------------------------------------------------------------------------
// Status Badge Styling Helper
// -----------------------------------------------------------------------------
function getStatusBadge(status: ProjectStatus) {
  switch (status) {
    case 'Not Started':
      return {
        label: 'Not Started',
        variant: 'secondary' as const,
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
        icon: Clock,
      }
    case 'Planning':
      return {
        label: 'Planning',
        variant: 'outline' as const,
        className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        icon: Layers,
      }
    case 'In Progress':
      return {
        label: 'In Progress',
        variant: 'default' as const,
        className: 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white',
        icon: TrendingUp,
      }
    case 'On Hold':
      return {
        label: 'On Hold',
        variant: 'secondary' as const,
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300',
        icon: AlertTriangle,
      }
    case 'At Risk':
      return {
        label: 'At Risk',
        variant: 'destructive' as const,
        className: 'bg-rose-600 text-white animate-pulse',
        icon: Flame,
      }
    case 'Completed':
      return {
        label: 'Completed',
        variant: 'default' as const,
        className: 'bg-emerald-600 text-white dark:bg-emerald-600 dark:text-white',
        icon: CheckCircle2,
      }
    case 'Cancelled':
      return {
        label: 'Cancelled',
        variant: 'outline' as const,
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-300',
        icon: XCircle,
      }
  }
}

function getPriorityBadge(priority: ProjectPriority) {
  switch (priority) {
    case 'Low':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    case 'Medium':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    case 'High':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    case 'Critical':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 font-bold'
  }
}

export default function ProjectsPage() {
  const { employee, user, isAdmin, isHR } = useAuth()
  const isHROrAdmin = Boolean(
    isAdmin ||
    isHR ||
    user?.role?.name === 'HR' ||
    user?.role?.name === 'Admin' ||
    (employee?.email &&
      (employee.email.toLowerCase().includes('hr@') ||
        employee.email.toLowerCase().startsWith('admin@') ||
        employee.email.toLowerCase() === 'ceo@oklut.com'))
  )

  // Query Hooks
  const { data: projects = [], isLoading: loadingProjects } = useProjects()
  const { data: stats } = useProjectStats()
  const { data: nextCode } = useNextProjectCode()
  const { data: employees = [] } = useEmployees()
  const { data: departments = [] } = useDepartments()

  // Mutations
  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()
  const deleteProjectMutation = useDeleteProject()
  const submitStatusMutation = useSubmitProjectStatusUpdate()

  // Filter States
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'attention' | 'my-projects'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Modals & Drawers
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [statusUpdateProject, setStatusUpdateProject] = useState<Project | null>(null)
  const [detailsProject, setDetailsProject] = useState<Project | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Add / Edit Form State
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formClient, setFormClient] = useState('')
  const [formDeptId, setFormDeptId] = useState('')
  const [formPriority, setFormPriority] = useState<ProjectPriority>('Medium')
  const [formHeadId, setFormHeadId] = useState('')
  const [formLeadId, setFormLeadId] = useState('')
  const [formMemberIds, setFormMemberIds] = useState<string[]>([])
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [formEndDate, setFormEndDate] = useState(
    new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
  )
  const [memberSearch, setMemberSearch] = useState('')

  // Status Update Form State
  const [updateStatus, setUpdateStatus] = useState<ProjectStatus>('In Progress')
  const [updateProgress, setUpdateProgress] = useState<number>(0)
  const [updateWorkCompleted, setUpdateWorkCompleted] = useState('')
  const [updateWorkInProgress, setUpdateWorkInProgress] = useState('')
  const [updatePendingTasks, setUpdatePendingTasks] = useState('')
  const [updateBlockers, setUpdateBlockers] = useState('')
  const [updateRisks, setUpdateRisks] = useState('')
  const [updateDelayReason, setUpdateDelayReason] = useState('')
  const [updateNextSteps, setUpdateNextSteps] = useState('')
  const [updateExpEndDate, setUpdateExpEndDate] = useState('')

  // Open Create Dialog
  const handleOpenCreate = () => {
    setFormName('')
    setFormDesc('')
    setFormClient('')
    setFormDeptId('')
    setFormPriority('Medium')
    setFormHeadId('')
    setFormLeadId('')
    setFormMemberIds([])
    setFormStartDate(new Date().toISOString().slice(0, 10))
    setFormEndDate(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10))
    setMemberSearch('')
    setCreateDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (p: Project) => {
    setEditProject(p)
    setFormName(p.project_name)
    setFormDesc(p.description || '')
    setFormClient(p.client_name || '')
    setFormDeptId(p.department_id || '')
    setFormPriority(p.priority)
    setFormHeadId(p.project_head_id || '')
    setFormLeadId(p.team_lead_id || '')
    const memberIds = p.members?.map((m) => m.employee_id) || []
    setFormMemberIds(memberIds)
    setFormStartDate(p.start_date)
    setFormEndDate(p.expected_end_date)
    setMemberSearch('')
  }

  // Open Status Update Dialog
  const handleOpenStatusUpdate = (p: Project) => {
    setStatusUpdateProject(p)
    setUpdateStatus(p.status)
    setUpdateProgress(p.progress_percentage)
    setUpdateWorkCompleted('')
    setUpdateWorkInProgress('')
    setUpdatePendingTasks('')
    setUpdateBlockers('')
    setUpdateRisks('')
    setUpdateDelayReason('')
    setUpdateNextSteps('')
    setUpdateExpEndDate(p.expected_end_date)
  }

  // Toggle member in multi-select
  const toggleMember = (empId: string) => {
    setFormMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  // Save Project (Create / Edit)
  const handleSaveProject = async () => {
    if (!formName.trim() || formName.trim().length < 3) {
      toast.error('Project Name must be at least 3 characters.')
      return
    }
    if (!formStartDate || !formEndDate) {
      toast.error('Start Date and Expected End Date are mandatory.')
      return
    }
    if (new Date(formEndDate) < new Date(formStartDate)) {
      toast.error('Expected End Date cannot be earlier than Start Date.')
      return
    }
    if (!formHeadId) {
      toast.error('Please assign a Project Head.')
      return
    }
    if (!formLeadId) {
      toast.error('Please assign a Team Lead.')
      return
    }

    if (editProject) {
      // Edit existing
      await updateProjectMutation.mutateAsync({
        id: editProject.id,
        input: {
          project_name: formName.trim(),
          description: formDesc.trim() || undefined,
          client_name: formClient.trim() || undefined,
          department_id: formDeptId || undefined,
          priority: formPriority,
          project_head_id: formHeadId,
          team_lead_id: formLeadId,
          member_ids: formMemberIds,
          start_date: formStartDate,
          expected_end_date: formEndDate,
        },
      })
      setEditProject(null)
    } else {
      // Create new
      await createProjectMutation.mutateAsync({
        project_name: formName.trim(),
        description: formDesc.trim() || undefined,
        client_name: formClient.trim() || undefined,
        department_id: formDeptId || undefined,
        priority: formPriority,
        project_head_id: formHeadId,
        team_lead_id: formLeadId,
        member_ids: formMemberIds,
        start_date: formStartDate,
        expected_end_date: formEndDate,
        created_by: employee?.id,
      })
      setCreateDialogOpen(false)
    }
  }

  // Submit Status Update
  const handleSubmitStatusUpdate = async () => {
    if (!statusUpdateProject) return

    // Validate Completed requires 100%
    if (updateStatus === 'Completed' && updateProgress !== 100) {
      toast.error('A project marked as Completed must have 100% progress.')
      return
    }

    // Validate Reason for delay if On Hold, At Risk, or Cancelled
    if (
      (updateStatus === 'On Hold' || updateStatus === 'At Risk' || updateStatus === 'Cancelled') &&
      (!updateDelayReason || updateDelayReason.trim().length < 5) &&
      (!updateBlockers || updateBlockers.trim().length < 5)
    ) {
      toast.error(
        `Please specify a detailed Reason for Delay or Blocker when status is ${updateStatus}.`
      )
      return
    }

    // Role check: Is current user Project Head or HR/Admin?
    const isHead = employee?.id === statusUpdateProject.project_head_id
    const isLead = employee?.id === statusUpdateProject.team_lead_id
    if (!isHROrAdmin && !isHead && !isLead) {
      toast.error('Only assigned Project Heads, Team Leads, or HR/Admin may submit updates.')
      return
    }
    const isOfficialAuth = isHROrAdmin || isHead

    const updateType = isOfficialAuth ? 'Official' : 'Team Lead Report'

    await submitStatusMutation.mutateAsync({
      project_id: statusUpdateProject.id,
      new_status: updateStatus,
      new_progress: updateProgress,
      work_completed: updateWorkCompleted.trim() || undefined,
      work_in_progress: updateWorkInProgress.trim() || undefined,
      pending_tasks: updatePendingTasks.trim() || undefined,
      blockers: updateBlockers.trim() || undefined,
      risks: updateRisks.trim() || undefined,
      delay_reason: updateDelayReason.trim() || undefined,
      next_steps: updateNextSteps.trim() || undefined,
      expected_completion_date: updateExpEndDate || undefined,
      update_type: updateType,
      updated_by: employee?.id,
    })

    setStatusUpdateProject(null)
  }

  // Delete Project Confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    await deleteProjectMutation.mutateAsync(deleteConfirmId)
    setDeleteConfirmId(null)
  }

  // Filtered Projects Logic
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Tab Filter
      if (activeTab === 'active') {
        if (p.status === 'Completed' || p.status === 'Cancelled') return false
      } else if (activeTab === 'attention') {
        const needsUpdate = isProjectNeedingUpdate(p)
        if (p.status !== 'At Risk' && p.status !== 'On Hold' && !needsUpdate) return false
      } else if (activeTab === 'my-projects') {
        const empId = employee?.id
        if (!empId) return false
        const isHead = p.project_head_id === empId
        const isLead = p.team_lead_id === empId
        const isMem = p.members?.some((m) => m.employee_id === empId)
        if (!isHead && !isLead && !isMem) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesCode = p.project_code.toLowerCase().includes(q)
        const matchesName = p.project_name.toLowerCase().includes(q)
        const matchesClient = p.client_name?.toLowerCase().includes(q) || false
        const matchesHead =
          p.project_head &&
          `${p.project_head.first_name} ${p.project_head.last_name}`.toLowerCase().includes(q)
        const matchesLead =
          p.team_lead &&
          `${p.team_lead.first_name} ${p.team_lead.last_name}`.toLowerCase().includes(q)
        if (!matchesCode && !matchesName && !matchesClient && !matchesHead && !matchesLead) {
          return false
        }
      }

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'Not Started') {
          // 'Not Started' metric card and filter represent Queue / Planning (matching stats.notStarted)
          if (p.status !== 'Not Started' && p.status !== 'Planning') {
            return false
          }
        } else if (p.status !== statusFilter) {
          return false
        }
      }

      // Priority Filter
      if (priorityFilter !== 'all' && p.priority !== priorityFilter) {
        return false
      }

      // Department Filter
      if (departmentFilter !== 'all' && p.department_id !== departmentFilter) {
        return false
      }

      return true
    })
  }, [
    projects,
    activeTab,
    searchQuery,
    statusFilter,
    priorityFilter,
    departmentFilter,
    employee?.id,
  ])

  // Filtered employees for Member Multi-Select
  const filteredEmployeesForSelection = useMemo(() => {
    if (!memberSearch.trim()) return employees
    const q = memberSearch.toLowerCase()
    return employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
        (e.designation?.name && e.designation.name.toLowerCase().includes(q)) ||
        (e.department?.name && e.department.name.toLowerCase().includes(q))
    )
  }, [employees, memberSearch])

  return (
    <div className="container mx-auto space-y-6 pb-12 pt-2">
      {/* 1. Header with Actions */}
      <PageHeader
        title="Project Management"
        description="Oversee company initiatives, assign project leadership, track milestones, and maintain audit trails."
        actions={
          <div className="flex items-center gap-3">
            {isHROrAdmin && (
              <Button onClick={handleOpenCreate} className="gap-2 shadow-sm">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            )}
          </div>
        }
      />

      {/* 2. Responsive Metric Cards (Section 5) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {/* Total */}
        <Card
          onClick={() => {
            setActiveTab('all')
            setStatusFilter('all')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold">{stats?.total ?? projects.length}</div>
            <div className="text-[11px] text-muted-foreground">All initiatives</div>
          </CardContent>
        </Card>

        {/* Not Started */}
        <Card
          onClick={() => {
            setActiveTab('all')
            setStatusFilter('Not Started')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer transition-all hover:border-slate-400 hover:shadow-sm"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Not Started</span>
              <Clock className="h-4 w-4 text-slate-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
              {stats?.notStarted ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground">Queue / Planning</div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card
          onClick={() => {
            setActiveTab('all')
            setStatusFilter('In Progress')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer transition-all hover:border-blue-400 hover:shadow-sm"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">In Progress</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.inProgress ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground">Active delivery</div>
          </CardContent>
        </Card>

        {/* On Hold */}
        <Card
          onClick={() => {
            setActiveTab('all')
            setStatusFilter('On Hold')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer transition-all hover:border-amber-400 hover:shadow-sm"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">On Hold</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats?.onHold ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground">Paused</div>
          </CardContent>
        </Card>

        {/* At Risk */}
        <Card
          onClick={() => {
            setActiveTab('attention')
            setStatusFilter('At Risk')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer border-rose-200 bg-rose-50/40 transition-all hover:border-rose-400 hover:shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">At Risk</span>
              <Flame className="h-4 w-4 text-rose-600 animate-pulse" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700 dark:text-rose-400">
              {stats?.atRisk ?? 0}
            </div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80">Requires action</div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card
          onClick={() => {
            setActiveTab('all')
            setStatusFilter('Completed')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer transition-all hover:border-emerald-400 hover:shadow-sm"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.completed ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground">100% Finished</div>
          </CardContent>
        </Card>

        {/* Cancelled */}
        <Card
          onClick={() => {
            setActiveTab('all')
            setStatusFilter('Cancelled')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer transition-all hover:border-gray-400 hover:shadow-sm"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Cancelled</span>
              <XCircle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-600 dark:text-gray-400">
              {stats?.cancelled ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground">Terminated</div>
          </CardContent>
        </Card>

        {/* Requiring Updates */}
        <Card
          onClick={() => {
            setActiveTab('attention')
            setStatusFilter('all')
            setPriorityFilter('all')
            setDepartmentFilter('all')
            setSearchQuery('')
          }}
          className="cursor-pointer border-amber-200 bg-amber-50/30 transition-all hover:border-amber-400 hover:shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Needs Update</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-400">
              {stats?.requiringUpdates ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground">Overdue / 7d+ stale</div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Dashboard Content Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* View Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as any)
                if (v === 'attention' && statusFilter !== 'all' && statusFilter !== 'At Risk' && statusFilter !== 'On Hold') {
                  setStatusFilter('all')
                }
              }}
              className="w-full lg:w-auto"
            >
              <TabsList className="grid grid-cols-4 w-full lg:w-auto">
                <TabsTrigger value="all">All Projects</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="attention">Needs Attention</TabsTrigger>
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quick Status / Priority / Dept Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search code, name, lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="At Risk">At Risk</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 w-[120px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(statusFilter !== 'all' ||
                priorityFilter !== 'all' ||
                departmentFilter !== 'all' ||
                searchQuery ||
                activeTab !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all')
                    setPriorityFilter('all')
                    setDepartmentFilter('all')
                    setSearchQuery('')
                    setActiveTab('all')
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Projects Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-muted/50 border-y text-xs uppercase font-medium text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Project Code</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Project Head</th>
                  <th className="py-3 px-4">Team Lead</th>
                  <th className="py-3 px-4 text-center">Team</th>
                  <th className="py-3 px-4">Timeline</th>
                  <th className="py-3 px-4 w-[160px]">Progress</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Updated</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingProjects ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="h-4 w-4 animate-spin text-primary" />
                        Loading projects...
                      </div>
                    </td>
                  </tr>
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FolderKanban className="h-8 w-8 text-muted-foreground/60" />
                        <p className="font-medium text-muted-foreground">No projects match the criteria</p>
                        <p className="text-xs text-muted-foreground">
                          Try adjusting search terms or clearing active filters.
                        </p>
                        {isHROrAdmin && (
                          <Button size="sm" onClick={handleOpenCreate} className="mt-2">
                            <Plus className="h-4 w-4 mr-1" /> Create Project
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => {
                    const statusInfo = getStatusBadge(p.status)
                    const StatusIcon = statusInfo.icon
                    const isHead = employee?.id === p.project_head_id
                    const isLead = employee?.id === p.team_lead_id
                    const canUpdateStatus = isHROrAdmin || isHead || isLead
                    const isOfficialAuth = isHROrAdmin || isHead
                    const isOverdue =
                      p.status !== 'Completed' &&
                      p.status !== 'Cancelled' &&
                      new Date(p.expected_end_date).getTime() < Date.now()
                    const needsUpdate = isProjectNeedingUpdate(p)

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer group"
                        onClick={() => setDetailsProject(p)}
                      >
                        {/* Project Code */}
                        <td className="py-3.5 px-4 font-mono font-semibold">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-xs">
                            {p.project_code}
                          </span>
                        </td>

                        {/* Project Name */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="font-medium text-foreground line-clamp-1">{p.project_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            {p.client_name ? (
                              <span>Client: {p.client_name}</span>
                            ) : p.department?.name ? (
                              <span>Dept: {p.department.name}</span>
                            ) : (
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityBadge(p.priority)}`}>
                                {p.priority}
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Project Head */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {p.project_head ? (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-200">
                                {p.project_head.first_name[0]}
                                {p.project_head.last_name[0]}
                              </div>
                              <div>
                                <div className="text-xs font-medium">
                                  {p.project_head.first_name} {p.project_head.last_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  Accountable Head
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>

                        {/* Team Lead */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {p.team_lead ? (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-200">
                                {p.team_lead.first_name[0]}
                                {p.team_lead.last_name[0]}
                              </div>
                              <div>
                                <div className="text-xs font-medium">
                                  {p.team_lead.first_name} {p.team_lead.last_name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">Team Lead</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>

                        {/* Team Members Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {p.members?.length || 0}
                          </span>
                        </td>

                        {/* Timeline */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                          <div>
                            {new Date(p.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            -{' '}
                            <span className={isOverdue ? 'text-rose-600 font-semibold' : ''}>
                              {new Date(p.expected_end_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] text-rose-600 font-medium">Overdue</span>
                          )}
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span>Progress</span>
                              <span>{p.progress_percentage}%</span>
                            </div>
                            <Progress
                              value={p.progress_percentage}
                              className={`h-2 ${
                                p.status === 'Completed'
                                  ? '[&>div]:bg-emerald-600'
                                  : p.status === 'At Risk'
                                  ? '[&>div]:bg-rose-600'
                                  : p.status === 'On Hold'
                                  ? '[&>div]:bg-amber-500'
                                  : '[&>div]:bg-blue-600'
                              }`}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant={statusInfo.variant}
                            className={`gap-1.5 font-medium ${statusInfo.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </td>

                        {/* Last Updated */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-muted-foreground">
                          <div>
                            {new Date(p.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          {needsUpdate && p.status !== 'Completed' && p.status !== 'Cancelled' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                              <AlertCircle className="h-3 w-3" /> Needs Update
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Update Status Button */}
                            {canUpdateStatus && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenStatusUpdate(p)}
                                className="h-8 gap-1 text-xs"
                              >
                                <History className="h-3.5 w-3.5" />
                                {isOfficialAuth ? 'Update Status' : 'Report'}
                              </Button>
                            )}

                            {/* Edit Button (HR / Admin) */}
                            {isHROrAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenEdit(p)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Edit Project Details"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}

                            {/* Delete Button (HR / Admin) */}
                            {isHROrAdmin && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(p.id)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Project"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. Add / Edit Project Dialog (Sections 1 & 2) */}
      <Dialog
        open={createDialogOpen || Boolean(editProject)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditProject(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar pr-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FolderKanban className="h-5 w-5 text-primary" />
              {editProject ? `Edit Project: ${editProject.project_code}` : 'Create New Project'}
            </DialogTitle>
            <DialogDescription>
              {editProject
                ? 'Modify project specifications, adjust leadership assignments, and manage team members.'
                : 'Project Code will be automatically sequenced and safely assigned by the system.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Project Code Banner (Auto-generated & read-only) */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/60 border">
              <div>
                <Label className="text-xs text-muted-foreground">Project Code (Auto-generated)</Label>
                <div className="font-mono text-base font-bold text-primary">
                  {editProject ? editProject.project_code : nextCode || 'ok-ind-001 (Auto)'}
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-background">
                Read-only Unique Key
              </Badge>
            </div>

            {/* Project Name */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-name" className="text-xs font-semibold">
                Project Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="proj-name"
                placeholder="e.g. Next-Gen Enterprise Portal"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="proj-desc" className="text-xs font-semibold">
                Project Description
              </Label>
              <Textarea
                id="proj-desc"
                placeholder="High-level objectives, deliverable goals, and scope..."
                rows={2}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>

            {/* Client & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proj-client" className="text-xs font-semibold">
                  Client Name / Stakeholder
                </Label>
                <Input
                  id="proj-client"
                  placeholder="e.g. Acme Corp / HR Operations"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="proj-dept" className="text-xs font-semibold">
                  Department
                </Label>
                <Select value={formDeptId} onValueChange={setFormDeptId}>
                  <SelectTrigger id="proj-dept">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.code || 'DEPT'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select
                  value={formPriority}
                  onValueChange={(v) => setFormPriority(v as ProjectPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Start Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Expected End Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Leadership Assignment: Project Head & Team Lead (Section 2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
              {/* Project Head */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>
                    Project Head <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Accountable for status
                  </span>
                </Label>
                <Select value={formHeadId} onValueChange={setFormHeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Designate Project Head..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.designation?.name || 'Staff'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Team Lead */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center justify-between">
                  <span>
                    Team Lead <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Operational coordinator
                  </span>
                </Label>
                <Select value={formLeadId} onValueChange={setFormLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Designate Team Lead..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.designation?.name || 'Staff'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Team Members Multi-Select (Section 2) */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Assign Team Members</Label>
                <span className="text-xs text-muted-foreground">
                  {formMemberIds.length} member(s) selected
                </span>
              </div>

              {/* Selected Badges */}
              {formMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-md bg-muted/40 max-h-24 overflow-y-auto">
                  {formMemberIds.map((mId) => {
                    const emp = employees.find((e) => e.id === mId)
                    return (
                      <Badge
                        key={mId}
                        variant="secondary"
                        className="gap-1 pl-2 pr-1 py-0.5 text-xs flex items-center"
                      >
                        {emp ? `${emp.first_name} ${emp.last_name}` : mId}
                        <button
                          type="button"
                          onClick={() => toggleMember(mId)}
                          className="hover:bg-muted rounded-full p-0.5"
                        >
                          <XCircle className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Searchable Multi-Select Filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employees to add..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {/* Scrollable Selection Area */}
              <ScrollArea className="h-36 rounded-md border p-2">
                <div className="space-y-1">
                  {filteredEmployeesForSelection.map((emp) => {
                    const isSelected = formMemberIds.includes(emp.id)
                    const isHead = formHeadId === emp.id
                    const isLead = formLeadId === emp.id

                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleMember(emp.id)}
                        className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? 'bg-primary border-primary text-white'
                                : 'border-muted-foreground/30'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                          <div>
                            <span>
                              {emp.first_name} {emp.last_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-1.5">
                              {emp.designation?.name || 'Staff'} • {emp.department?.name || 'General'}
                            </span>
                          </div>
                        </div>

                        {/* Special Role Tag */}
                        {isHead && (
                          <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-700">
                            Head
                          </Badge>
                        )}
                        {isLead && (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700">
                            Lead
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setEditProject(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProject}
              disabled={createProjectMutation.isPending || updateProjectMutation.isPending}
            >
              {editProject ? 'Save Changes' : 'Create Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Project Head / Lead Status Update Modal (Section 3) */}
      <Dialog
        open={Boolean(statusUpdateProject)}
        onOpenChange={(open) => {
          if (!open) setStatusUpdateProject(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar pr-3">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Submit Project Status Update: {statusUpdateProject?.project_code}
            </DialogTitle>
            <DialogDescription>
              {statusUpdateProject?.project_name}
            </DialogDescription>
          </DialogHeader>

          {statusUpdateProject && (
            <div className="space-y-4 py-2">
              {/* Responsibility & Role Notice */}
              {(() => {
                const isHead = employee?.id === statusUpdateProject.project_head_id
                const isOfficial = isHROrAdmin || isHead

                return (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      isOfficial
                        ? 'bg-blue-50/70 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200'
                        : 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
                    }`}
                  >
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        {isOfficial
                          ? 'Official Status Authority (Project Head / HR Admin)'
                          : 'Team Lead Progress Report (Advisory)'}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        {isOfficial
                          ? 'Your submission will update the official status, progress percentage, and milestone history of this project.'
                          : 'As Team Lead, your progress report will be recorded in the audit history for accountability, but will not overwrite the official status.'}
                      </p>
                    </div>
                  </div>
                )
              })()}

              {/* Status and Progress Percentage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Current Project Status <span className="text-rose-500">*</span>
                  </Label>
                  <Select
                    value={updateStatus}
                    onValueChange={(v) => {
                      const next = v as ProjectStatus
                      setUpdateStatus(next)
                      if (next === 'Completed') {
                        setUpdateProgress(100)
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                      <SelectItem value="Planning">Planning</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="On Hold">On Hold (Requires Reason)</SelectItem>
                      <SelectItem value="At Risk">At Risk (Requires Reason)</SelectItem>
                      <SelectItem value="Completed">Completed (100% Progress)</SelectItem>
                      <SelectItem value="Cancelled">Cancelled (Requires Reason)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Progress Percentage</Label>
                    <span className="text-xs font-bold text-primary">{updateProgress}%</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={updateProgress}
                      onChange={(e) => setUpdateProgress(Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={updateProgress}
                      onChange={(e) => setUpdateProgress(Number(e.target.value))}
                      className="w-16 h-8 text-xs font-bold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Reason for Delay (MANDATORY if On Hold, At Risk, or Cancelled) */}
              {(updateStatus === 'On Hold' ||
                updateStatus === 'At Risk' ||
                updateStatus === 'Cancelled') && (
                <div className="space-y-1.5 p-3 rounded-lg border border-rose-300 bg-rose-50/50 dark:bg-rose-950/30">
                  <Label className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Reason for Delay / Hold / Cancellation <span className="text-rose-600">*</span>
                  </Label>
                  <Textarea
                    placeholder="Provide root-cause justification, external blocker details, or timeline slippage factors..."
                    rows={2}
                    value={updateDelayReason}
                    onChange={(e) => setUpdateDelayReason(e.target.value)}
                    className="border-rose-300 focus-visible:ring-rose-500"
                  />
                </div>
              )}

              {/* Work Completed */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Work Completed</Label>
                <Textarea
                  placeholder="Key accomplishments and milestones delivered during this cycle..."
                  rows={2}
                  value={updateWorkCompleted}
                  onChange={(e) => setUpdateWorkCompleted(e.target.value)}
                />
              </div>

              {/* Work in Progress & Pending Tasks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Work in Progress</Label>
                  <Textarea
                    placeholder="Tasks currently actively being executed..."
                    rows={2}
                    value={updateWorkInProgress}
                    onChange={(e) => setUpdateWorkInProgress(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Pending Tasks</Label>
                  <Textarea
                    placeholder="Backlog items queued next..."
                    rows={2}
                    value={updatePendingTasks}
                    onChange={(e) => setUpdatePendingTasks(e.target.value)}
                  />
                </div>
              </div>

              {/* Blockers & Risks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Issues or Blockers</Label>
                  <Textarea
                    placeholder="Internal or technical obstacles preventing progress..."
                    rows={2}
                    value={updateBlockers}
                    onChange={(e) => setUpdateBlockers(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Risks & Dependencies</Label>
                  <Textarea
                    placeholder="Potential failure points or upstream dependencies..."
                    rows={2}
                    value={updateRisks}
                    onChange={(e) => setUpdateRisks(e.target.value)}
                  />
                </div>
              </div>

              {/* Next Steps & Expected Completion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Next Steps</Label>
                  <Input
                    placeholder="Target deliverables for the upcoming week..."
                    value={updateNextSteps}
                    onChange={(e) => setUpdateNextSteps(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expected Completion Date</Label>
                  <Input
                    type="date"
                    value={updateExpEndDate}
                    onChange={(e) => setUpdateExpEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusUpdateProject(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitStatusUpdate}
              disabled={submitStatusMutation.isPending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Status Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Project Details & Audit Trail Drawer (Sections 4 & 9) */}
      <Dialog
        open={Boolean(detailsProject)}
        onOpenChange={(open) => {
          if (!open) setDetailsProject(null)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] sm:max-h-[88vh] overflow-y-auto custom-scrollbar pr-3">
          {detailsProject && (
            <div className="space-y-6 py-2">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      {detailsProject.project_code}
                    </span>
                    <Badge variant={getStatusBadge(detailsProject.status).variant}>
                      {detailsProject.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityBadge(detailsProject.priority)}>
                      {detailsProject.priority} Priority
                    </Badge>
                  </div>
                  <h2 className="text-xl font-bold mt-1.5">{detailsProject.project_name}</h2>
                  {detailsProject.description && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                      {detailsProject.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const p = detailsProject
                      setDetailsProject(null)
                      handleOpenStatusUpdate(p)
                    }}
                    className="gap-1.5"
                  >
                    <History className="h-4 w-4" /> Update Status
                  </Button>
                </div>
              </div>

              {/* Progress Bar & Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-muted/40 border">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase font-medium">Progress</div>
                  <div className="text-lg font-bold text-primary mt-0.5">
                    {detailsProject.progress_percentage}%
                  </div>
                  <Progress value={detailsProject.progress_percentage} className="h-1.5 mt-1" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase font-medium">Timeline</div>
                  <div className="text-xs font-semibold mt-1">
                    {new Date(detailsProject.start_date).toLocaleDateString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Due: {new Date(detailsProject.expected_end_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase font-medium">Project Head</div>
                  <div className="text-xs font-semibold mt-1 truncate">
                    {detailsProject.project_head
                      ? `${detailsProject.project_head.first_name} ${detailsProject.project_head.last_name}`
                      : 'None'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Accountable Owner</div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase font-medium">Team Lead</div>
                  <div className="text-xs font-semibold mt-1 truncate">
                    {detailsProject.team_lead
                      ? `${detailsProject.team_lead.first_name} ${detailsProject.team_lead.last_name}`
                      : 'None'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Operations Lead</div>
                </div>
              </div>

              {/* Tabs: Status History Audit Trail vs Team Members */}
              <Tabs defaultValue="audit-trail">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="audit-trail" className="gap-2">
                    <History className="h-4 w-4" />
                    Status History & Audit Trail ({detailsProject.status_updates?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="team" className="gap-2">
                    <Users className="h-4 w-4" />
                    Team Roster ({detailsProject.members?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Status Updates Audit Timeline (Section 4) */}
                <TabsContent value="audit-trail" className="pt-3">
                  <div className="max-h-[280px] sm:max-h-[320px] overflow-y-scroll custom-scrollbar pr-3 pb-2">
                    {detailsProject.status_updates && detailsProject.status_updates.length > 0 ? (
                      <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-muted-foreground/20">
                      {detailsProject.status_updates.map((upd, idx) => {
                        const author = upd.updater
                        return (
                          <div key={upd.id || idx} className="relative flex items-start gap-3 pl-1">
                            {/* Circle Node */}
                            <div className="h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center shrink-0 z-10 text-[10px] font-bold text-primary">
                              {idx + 1}
                            </div>

                            {/* Audit Card */}
                            <div className="flex-1 rounded-lg border p-3.5 bg-card shadow-xs space-y-2">
                              {/* Top Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={upd.update_type === 'Official' ? 'default' : 'outline'}
                                    className="text-[10px]"
                                  >
                                    {upd.update_type}
                                  </Badge>
                                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                                    <span className="text-muted-foreground">{upd.previous_status}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-primary">{upd.new_status}</span>
                                  </div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    ({upd.previous_progress}% → {upd.new_progress}%)
                                  </span>
                                </div>

                                <div className="text-[11px] text-muted-foreground">
                                  {new Date(upd.created_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </div>
                              </div>

                              {/* Author */}
                              <div className="text-xs text-muted-foreground">
                                Updated by:{' '}
                                <span className="font-semibold text-foreground">
                                  {author
                                    ? `${author.first_name} ${author.last_name} (${author.designation?.name || 'Staff'})`
                                    : 'System Administrator'}
                                </span>
                              </div>

                              {/* Work Completed */}
                              {upd.work_completed && (
                                <div className="text-xs">
                                  <span className="font-semibold text-muted-foreground">Completed:</span>{' '}
                                  <span>{upd.work_completed}</span>
                                </div>
                              )}

                              {/* Pending / WIP */}
                              {upd.work_in_progress && (
                                <div className="text-xs">
                                  <span className="font-semibold text-muted-foreground">In Progress:</span>{' '}
                                  <span>{upd.work_in_progress}</span>
                                </div>
                              )}

                              {/* Delay Reason (Alert styling) */}
                              {upd.delay_reason && (
                                <div className="p-2 rounded bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 text-xs border border-rose-200">
                                  <span className="font-bold">Reason for Delay:</span> {upd.delay_reason}
                                </div>
                              )}

                              {/* Blockers or Risks */}
                              {(upd.blockers || upd.risks) && (
                                <div className="text-xs space-y-1">
                                  {upd.blockers && (
                                    <div className="text-rose-600 dark:text-rose-400">
                                      <span className="font-semibold">Blockers:</span> {upd.blockers}
                                    </div>
                                  )}
                                  {upd.risks && (
                                    <div className="text-amber-600 dark:text-amber-400">
                                      <span className="font-semibold">Risks:</span> {upd.risks}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Next Steps */}
                              {upd.next_steps && (
                                <div className="text-xs text-muted-foreground pt-1 border-t">
                                  <span className="font-semibold">Next Steps:</span> {upd.next_steps}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        No status updates recorded yet for this project.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Team Roster Tab */}
                <TabsContent value="team" className="pt-3">
                  <div className="max-h-[280px] sm:max-h-[320px] overflow-y-scroll custom-scrollbar pr-3 pb-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {detailsProject.members?.map((mem) => {
                      const emp = mem.employee || employees.find((e) => e.id === mem.employee_id)
                      return (
                        <div
                          key={mem.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {emp ? `${emp.first_name[0]}${emp.last_name[0]}` : 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold">
                                {emp ? `${emp.first_name} ${emp.last_name}` : 'Employee'}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {emp?.designation?.name || 'Staff'} • {emp?.department?.name || 'Dept'}
                              </div>
                            </div>
                          </div>

                          <Badge
                            variant={
                              mem.project_role === 'Head'
                                ? 'default'
                                : mem.project_role === 'Lead'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-[10px]"
                          >
                            {mem.project_role}
                          </Badge>
                        </div>
                      )
                    })}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 7. Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmId)}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmId(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this project? All associated team assignments
              and status audit history records will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteProjectMutation.isPending}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

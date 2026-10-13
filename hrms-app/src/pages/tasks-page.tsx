import { useState, useMemo } from 'react'
import {
  ListChecks,
  Plus,
  Loader2,
  CalendarDays,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  Building2,
  FolderKanban,
  Star,
  Check,
  Users,
  UserPlus,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import {
  useTasks,
  useCreateTask,
  useUpdateTaskStatus,
  useEmployees,
  useDepartments,
  useDeleteTask,
  useProjects,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Task, Employee, Project } from '@/lib/database.types'

const FALLBACK_EMPLOYEES: Employee[] = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    employee_code: 'EMP-0001',
    first_name: 'Aarav',
    last_name: 'Patel',
    email: 'hr@oklut.com',
    department_id: '00000000-0000-4000-8000-0000000000d2',
    designation: { name: 'HR Manager' } as any,
    department: { name: 'HR' } as any,
  } as Employee,
  {
    id: '00000000-0000-0000-0000-000000000020',
    employee_code: 'EMP-0002',
    first_name: 'Meera',
    last_name: 'Sharma',
    email: 'employee@oklut.com',
    department_id: '00000000-0000-4000-8000-0000000000d1',
    designation: { name: 'Software Engineer' } as any,
    department: { name: 'IT' } as any,
  } as Employee,
  {
    id: '00000000-0000-0000-0000-000000000030',
    employee_code: 'EMP-0003',
    first_name: 'Rohan',
    last_name: 'Iyer',
    email: 'designer@oklut.com',
    department_id: '00000000-0000-4000-8000-0000000000d3',
    designation: { name: 'UI Designer' } as any,
    department: { name: 'Design' } as any,
  } as Employee,
]

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, normal: 3 }

function priorityVariant(p?: string | null): 'destructive' | 'warning' | 'secondary' | 'default' {
  if (p === 'high') return 'destructive'
  if (p === 'medium') return 'warning'
  if (p === 'low' || p === 'normal') return 'secondary'
  return 'secondary'
}

function getTaskDepartment(task: Task, employees: Employee[]): string {
  if (task.assignee?.department?.name) return task.assignee.department.name
  if ((task.assignee as any)?.department_name) return (task.assignee as any).department_name
  if (task.assignee_id) {
    const emp = employees.find((e) => e.id === task.assignee_id)
    if (emp?.department?.name) return emp.department.name
  }
  return 'General'
}

// Intelligent Project Code Resolver & Generator
function resolveTaskProject(
  task: Task,
  projects: Project[] = []
): { code: string; project: Project | null } {
  // 1. Direct project_code property
  if (task.project_code) {
    const p = projects.find(
      (proj) => proj.project_code === task.project_code || proj.id === task.project_id
    )
    return { code: task.project_code, project: p || null }
  }

  // 2. Attached project
  if (task.project?.project_code) {
    return { code: task.project.project_code, project: task.project }
  }

  // 3. Project ID match
  if (task.project_id) {
    const p = projects.find((proj) => proj.id === task.project_id)
    if (p?.project_code) return { code: p.project_code, project: p }
  }

  // 4. department_sector metadata check
  if (task.department_sector) {
    if (task.department_sector.startsWith('{')) {
      try {
        const meta = JSON.parse(task.department_sector)
        if (meta.code) {
          const p = projects.find(
            (proj) => proj.project_code === meta.code || proj.id === meta.prj
          )
          return { code: meta.code, project: p || null }
        }
        if (meta.prj) {
          const p = projects.find(
            (proj) => proj.id === meta.prj || proj.project_code === meta.prj
          )
          if (p?.project_code) return { code: p.project_code, project: p }
        }
      } catch {
        // ignore
      }
    }
    if (task.department_sector.startsWith('Project:')) {
      const pid = task.department_sector.replace('Project:', '').trim()
      const p = projects.find((proj) => proj.id === pid || proj.project_code === pid)
      if (p?.project_code) return { code: p.project_code, project: p }
    }
    if (task.department_sector.startsWith('ok-ind-') || task.department_sector.startsWith('PRJ-')) {
      return { code: task.department_sector.split(' ')[0], project: null }
    }
  }

  // 5. Intelligent Title Matching:
  // e.g. Task title "HRMs" or "HRM" matches "HRMS Employee Mobile Application v2" -> PRJ-2026-003!
  const titleClean = (task.title || '').toLowerCase().trim()
  if (titleClean) {
    const matched = projects.find((p) => {
      const pName = p.project_name.toLowerCase()
      const pCode = p.project_code.toLowerCase()
      if (pCode === titleClean || pCode.includes(titleClean)) return true
      if (pName.includes(titleClean) || titleClean.includes(pName)) return true
      if (titleClean.includes('hrm') && pName.includes('hrm')) return true
      if (titleClean.includes('recruitment') && pName.includes('recruitment')) return true
      if (titleClean.includes('cloud') && pName.includes('cloud')) return true
      if (titleClean.includes('audit') && pName.includes('audit')) return true
      return false
    })
    if (matched?.project_code) {
      return { code: matched.project_code, project: matched }
    }
  }

  // 6. Deterministic Auto-Generated Project Code fallback (Format: ok-ind-NNN)
  let hash = 0
  for (let i = 0; i < task.id.length; i++) {
    hash = (hash * 31 + task.id.charCodeAt(i)) & 0xffff
  }
  const seqNum = (Math.abs(hash) % 50) + 1
  return { code: `ok-ind-${String(seqNum).padStart(3, '0')}`, project: null }
}

function TaskCard({
  task,
  deptName,
  projects,
  employees,
  onStatusChange,
}: {
  task: Task
  deptName: string
  projects?: Project[]
  employees?: Employee[]
  onStatusChange: (id: string, status: string) => void
}) {
  const overdue = task.due_date && task.due_date < new Date().toISOString().slice(0, 10) && task.status !== 'completed'

  const { code: projectCode } = useMemo(
    () => resolveTaskProject(task, projects || []),
    [task, projects]
  )

  const leadEmp = useMemo(() => {
    if (task.team_lead) return task.team_lead
    if (task.team_lead_id && employees) {
      return employees.find((e) => e.id === task.team_lead_id) || null
    }
    return task.assignee || null
  }, [task, employees])

  const memberEmps = useMemo(() => {
    if (task.members) return task.members
    if (task.member_ids && task.member_ids.length > 0 && employees) {
      return task.member_ids
        .map((id) => employees.find((e) => e.id === id))
        .filter(Boolean) as Employee[]
    }
    return []
  }, [task, employees])

  return (
    <Card className={cn('h-fit shadow-xs hover:shadow-md transition-shadow', task.status === 'completed' && 'opacity-60')}>
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
          <Badge variant={priorityVariant(task.priority)} className="capitalize">{task.priority ?? 'normal'}</Badge>
        </div>
        {task.description && <p className="line-clamp-2 text-xs text-muted-foreground">{task.description}</p>}
        
        <div className="flex flex-col gap-1 border-t pt-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 flex-wrap">
              {leadEmp ? (
                <>
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                  <strong className="text-foreground">{leadEmp.first_name} {leadEmp.last_name}</strong>
                  {leadEmp.employee_code && (
                    <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                      {leadEmp.employee_code}
                    </span>
                  )}
                </>
              ) : (
                <strong className="text-foreground">Unassigned</strong>
              )}
            </span>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] h-5 bg-indigo-50 border-indigo-200 text-indigo-700 font-medium">
                <FolderKanban className="h-2.5 w-2.5 mr-1" />
                {projectCode}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 border-slate-200 text-slate-700 font-normal">
                <Building2 className="h-2.5 w-2.5 mr-1 text-slate-400" />
                {deptName}
              </Badge>
            </div>
          </div>
          {memberEmps.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
              <Users className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="font-medium text-indigo-700 dark:text-indigo-300">
                {memberEmps.length} Team Members:
              </span>
              <span className="text-foreground truncate max-w-[190px]">
                {memberEmps.map((m) => `${m.first_name} ${m.last_name[0]}.`).join(', ')}
              </span>
            </div>
          )}
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
  const { data: departments = [] } = useDepartments()
  const { data: projects = [] } = useProjects()
  const create = useCreateTask()
  const updateStatus = useUpdateTaskStatus()
  const del = useDeleteTask()

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table')
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'created'>('all')
  const [selectedDept, setSelectedDept] = useState<string>('all')

  const [dialog, setDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [taskProjectId, setTaskProjectId] = useState<string>('none')
  const [taskDeptId, setTaskDeptId] = useState('all')
  const [assigneeId, setAssigneeId] = useState('')
  const [leadId, setLeadId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')

  // Guaranteed non-empty employee array
  const allEmployeesSafe = useMemo(() => {
    if (employees && employees.length > 0) return employees
    return FALLBACK_EMPLOYEES
  }, [employees])

  // Filter tasks based on assignment tab & department sector
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Assignment tab filter
      if (filterType === 'assigned') {
        if (!employee?.id) return false
        const isLead = t.team_lead_id === employee.id || t.assignee_id === employee.id
        const isMember = t.member_ids && t.member_ids.includes(employee.id)
        if (!isLead && !isMember) return false
      } else if (filterType === 'created') {
        if (!employee?.id || t.assigner_id !== employee.id) return false
      }

      // 2. Department sector filter
      if (selectedDept !== 'all') {
        const deptName = getTaskDepartment(t, allEmployeesSafe).toLowerCase()
        const selectedDeptObj = departments.find((d) => d.id === selectedDept)
        if (selectedDeptObj && deptName !== selectedDeptObj.name.toLowerCase()) {
          return false
        }
      }

      return true
    })
  }, [tasks, filterType, selectedDept, employee?.id, allEmployeesSafe, departments])

  // Multi-member assignment handlers
  const handleToggleMember = (empId: string) => {
    setMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    )
  }

  const handleRemoveMember = (empId: string) => {
    setMemberIds((prev) => prev.filter((id) => id !== empId))
  }

  const handleAddAllProjectMembers = () => {
    if (!selectedProject?.members) return
    const pMemberIds = selectedProject.members
      .map((m) => m.employee_id)
      .filter(Boolean) as string[]
    setMemberIds((prev) => Array.from(new Set([...prev, ...pMemberIds])))
  }

  // When project is selected: automatically take the Team Lead!
  const handleProjectChange = (projId: string) => {
    setTaskProjectId(projId)
    if (projId && projId !== 'none') {
      const proj = projects.find((p) => p.id === projId)
      if (proj) {
        // Automatically take the Team Lead for the project as lead
        const pLeadId = proj.team_lead_id || (proj.team_lead as any)?.id || proj.project_head_id || (proj.project_head as any)?.id
        const matchedEmp =
          allEmployeesSafe.find((e) => e.id === pLeadId) ||
          (proj.team_lead?.first_name
            ? allEmployeesSafe.find(
                (e) =>
                  e.first_name.toLowerCase() === proj.team_lead?.first_name.toLowerCase() ||
                  e.last_name.toLowerCase() === proj.team_lead?.last_name.toLowerCase()
              )
            : null) ||
          allEmployeesSafe[0]

        if (matchedEmp?.id) {
          setLeadId(matchedEmp.id)
          setAssigneeId(matchedEmp.id)
        } else if (pLeadId) {
          setLeadId(pLeadId)
          setAssigneeId(pLeadId)
        }

        // Auto-add project members to team members list if project has members
        if (proj.members && proj.members.length > 0) {
          const autoMembers = proj.members
            .map((m) => m.employee_id)
            .filter((id) => id && id !== matchedEmp?.id) as string[]
          if (autoMembers.length > 0) {
            setMemberIds((prev) => Array.from(new Set([...prev, ...autoMembers])))
          }
        }

        // Only set department if it matches a valid DB department
        if (proj.department_id && departments.some((d) => d.id === proj.department_id)) {
          setTaskDeptId(proj.department_id)
        } else {
          setTaskDeptId('all')
        }
      }
    }
  }

  // Suggest matching project based on task title (e.g. typing "HRMS")
  const matchedProjectSuggestion = useMemo(() => {
    if (taskProjectId !== 'none' || !title.trim() || title.trim().length < 2) return null
    const q = title.toLowerCase().trim()
    return (
      projects.find(
        (p) =>
          p.project_name.toLowerCase().includes(q) ||
          q.includes(p.project_name.toLowerCase()) ||
          p.project_code.toLowerCase().includes(q)
      ) || null
    )
  }, [title, taskProjectId, projects])

  // Selected project details
  const selectedProject = useMemo(() => {
    if (taskProjectId === 'none') return null
    return projects.find((p) => p.id === taskProjectId) || null
  }, [projects, taskProjectId])

  const selectedProjectLead = useMemo(() => {
    if (!selectedProject) return null
    const pLeadId = selectedProject.team_lead_id || (selectedProject.team_lead as any)?.id
    if (!pLeadId) return null
    const found = allEmployeesSafe.find((e) => e.id === pLeadId)
    if (found) return found
    if (selectedProject.team_lead?.first_name) {
      const byName = allEmployeesSafe.find(
        (e) =>
          e.first_name.toLowerCase() === selectedProject.team_lead?.first_name.toLowerCase() ||
          e.last_name.toLowerCase() === selectedProject.team_lead?.last_name.toLowerCase()
      )
      if (byName) return byName
    }
    return (selectedProject.team_lead as Employee) || allEmployeesSafe[0] || null
  }, [selectedProject, allEmployeesSafe])

  const selectedProjectHead = useMemo(() => {
    if (!selectedProject) return null
    const headId = selectedProject.project_head_id || (selectedProject.project_head as any)?.id
    if (!headId) return null
    return allEmployeesSafe.find((e) => e.id === headId) || (selectedProject.project_head as Employee) || null
  }, [selectedProject, allEmployeesSafe])

  const selectedProjectMembers = useMemo(() => {
    if (!selectedProject || !selectedProject.members) return []
    const pLeadId = selectedProjectLead?.id
    const headId = selectedProjectHead?.id
    return selectedProject.members
      .filter((m) => m.employee_id !== pLeadId && m.employee_id !== headId)
      .map((m) => allEmployeesSafe.find((e) => e.id === m.employee_id) || (m.employee as Employee))
      .filter(Boolean) as Employee[]
  }, [selectedProject, selectedProjectLead, selectedProjectHead, allEmployeesSafe])

  const selectedLeadEmployee = useMemo(() => {
    if (leadId) return allEmployeesSafe.find((e) => e.id === leadId) || null
    if (selectedProjectLead) return selectedProjectLead
    return null
  }, [leadId, selectedProjectLead, allEmployeesSafe])

  const deptMatchedEmployees = useMemo(() => {
    if (taskDeptId === 'all') return []
    return allEmployeesSafe.filter(
      (e) => e.department_id === taskDeptId || e.department?.id === taskDeptId
    )
  }, [allEmployeesSafe, taskDeptId])


  const nextProjectCodePreview = useMemo(() => {
    // 1. If project selected from dropdown
    if (taskProjectId !== 'none') {
      const proj = projects.find((p) => p.id === taskProjectId)
      if (proj?.project_code) return proj.project_code
    }
    // 2. If title matches a project
    if (matchedProjectSuggestion?.project_code) {
      return matchedProjectSuggestion.project_code
    }
    // 3. Auto-generated next sequence code (e.g. ok-ind-005)
    let maxNum = 0
    projects.forEach((p) => {
      const parts = (p.project_code || '').split('-')
      const n = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(n) && n > maxNum) maxNum = n
    })
    return `ok-ind-${String(maxNum + 1).padStart(3, '0')}`
  }, [taskProjectId, projects, matchedProjectSuggestion])

  const columns: { key: string; label: string; color: string }[] = [
    { key: 'todo', label: 'To Do', color: 'bg-muted' },
    { key: 'in_progress', label: 'In Progress', color: 'bg-warning/15' },
    { key: 'completed', label: 'Completed', color: 'bg-success/15' },
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Please enter a task title')
      return
    }
    const primaryAssignee = leadId || memberIds[0] || assigneeId
    if (!primaryAssignee) {
      toast.error('Please select a Team Lead or at least one team member')
      return
    }

    try {
      await create.mutateAsync({
        title: title.trim(),
        description: description?.trim() || undefined,
        assignee_id: primaryAssignee,
        team_lead_id: leadId || undefined,
        member_ids: memberIds,
        project_id: taskProjectId !== 'none' ? taskProjectId : (matchedProjectSuggestion?.id || undefined),
        project_code: nextProjectCodePreview,
        department_id: taskDeptId !== 'all' ? taskDeptId : undefined,
        due_date: dueDate || undefined,
        priority,
      } as any)
      setDialog(false)
      setTitle('')
      setDescription('')
      setLeadId('')
      setMemberIds([])
      setAssigneeId('')
      setDueDate('')
      setPriority('medium')
      setTaskDeptId('all')
      setTaskProjectId('none')
    } catch (err: any) {
      console.error('Failed to create task:', err)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks Management"
        description="View, assign, and track department-wise tasks in tabular or board views."
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

      {/* Filter Tabs & Department Sector Selector */}
      <div className="space-y-3 border-b pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
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

          {/* Department Sector Dropdown */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Sector:</span>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="h-8 w-48 text-xs bg-background">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments ({tasks.length})</SelectItem>
                {departments.map((d) => {
                  const deptCount = tasks.filter((t) => getTaskDepartment(t, employees).toLowerCase() === d.name.toLowerCase()).length
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({deptCount})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Department Sector Chips */}
        {departments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedDept('all')}
              className={cn(
                'px-3 py-1 rounded-full font-medium transition-all border text-xs shrink-0 cursor-pointer',
                selectedDept === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-background hover:bg-muted text-muted-foreground border-border'
              )}
            >
              All Sectors ({tasks.length})
            </button>
            {departments.map((d) => {
              const isSelected = selectedDept === d.id
              const count = tasks.filter((t) => getTaskDepartment(t, employees).toLowerCase() === d.name.toLowerCase()).length
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDept(isSelected ? 'all' : d.id)}
                  className={cn(
                    'px-3 py-1 rounded-full font-medium transition-all border text-xs shrink-0 flex items-center gap-1.5 cursor-pointer',
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border'
                  )}
                >
                  <span>{d.name}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.2 rounded-full font-bold', isSelected ? 'bg-indigo-800 text-white' : 'bg-muted text-foreground')}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            selectedDept !== 'all'
              ? `No tasks found for the selected department sector.`
              : filterType === 'assigned'
              ? 'No tasks assigned to you.'
              : filterType === 'created'
              ? 'You have not created any tasks.'
              : 'No tasks match the view. Create a new task to get started.'
          }
          icon={ListChecks}
        />
      ) : viewMode === 'table' ? (
        /* Tabular View */
        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Task Details</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Department (Sector)</th>
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
                  const deptName = getTaskDepartment(t, employees)
                  const projectInfo = resolveTaskProject(t, projects)

                  return (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        {/* Auto-Generated / Linked Project Code Badge */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md shadow-2xs">
                            <FolderKanban className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            {projectInfo.code}
                          </span>
                          {projectInfo.project && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={projectInfo.project.project_name}>
                              {projectInfo.project.project_name}
                            </span>
                          )}
                        </div>
                        <p className={cn('font-semibold text-foreground', t.status === 'completed' && 'line-through text-muted-foreground')}>
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">Created {timeAgo(t.created_at)}</p>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {(() => {
                          const tLead = t.team_lead_id
                            ? allEmployeesSafe.find((e) => e.id === t.team_lead_id) || t.assignee
                            : t.assignee
                          const tMembers =
                            t.member_ids && t.member_ids.length > 0
                              ? (t.member_ids
                                  .map((id) => allEmployeesSafe.find((e) => e.id === id))
                                  .filter(Boolean) as Employee[])
                              : []

                          return (
                            <div className="space-y-1">
                              {tLead ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-300 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded">
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />
                                    Lead: {tLead.first_name} {tLead.last_name}
                                  </span>
                                  {tLead.employee_code && (
                                    <span className="font-mono text-[10px] text-amber-800 dark:text-amber-400 font-semibold">
                                      ({tLead.employee_code})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-muted-foreground text-xs">{assigneeName}</div>
                              )}

                              {/* Assigned Team Members list */}
                              {tMembers.length > 0 && (
                                <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                  <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
                                    <Users className="h-2.5 w-2.5 text-indigo-500" />
                                    Members ({tMembers.length}):
                                  </span>
                                  {tMembers.map((m) => (
                                    <span
                                      key={m.id}
                                      className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded"
                                      title={`${m.first_name} ${m.last_name} (${m.employee_code || 'Staff'})`}
                                    >
                                      {m.first_name} {m.last_name[0]}.
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-medium bg-slate-50 border-slate-200 text-slate-700 text-xs py-1">
                          <Building2 className="h-3 w-3 mr-1 text-indigo-600" />
                          {deptName}
                        </Badge>
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
              <div key={col.key} className="rounded-xl border bg-card p-3 shadow-xs">
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
                      <TaskCard
                        task={t}
                        deptName={getTaskDepartment(t, employees)}
                        projects={projects}
                        employees={allEmployeesSafe}
                        onStatusChange={(id, s) => updateStatus.mutate({ id, status: s })}
                      />
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
        <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden sm:max-w-xl">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>Create a task and assign it to a department sector team member.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1 overscroll-contain">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title (e.g. HRMS API Integration)"
                required
              />
              {matchedProjectSuggestion && taskProjectId === 'none' && (
                <div className="flex items-center justify-between p-2 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 text-xs">
                  <span className="text-indigo-800 dark:text-indigo-300">
                    Matches Project: <strong>{matchedProjectSuggestion.project_code} — {matchedProjectSuggestion.project_name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleProjectChange(matchedProjectSuggestion.id)}
                    className="px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold text-[11px] hover:bg-indigo-700 cursor-pointer"
                  >
                    ⚡ Link & Take Team Lead
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Task goals and deliverables..."
              />
            </div>
            
            {/* Auto-Generated Project Code Banner */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/70">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Project Code (Auto-Generated Unique Key)
                </Label>
                <div className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {nextProjectCodePreview}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-background border-indigo-200 text-indigo-700 font-semibold shadow-2xs">
                {taskProjectId !== 'none' || matchedProjectSuggestion ? 'Linked Project' : 'Auto Sequenced'}
              </Badge>
            </div>

            {/* Project & Department Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <FolderKanban className="h-3.5 w-3.5 text-primary" />
                    Project
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Auto-takes Lead</span>
                </div>
                <Select value={taskProjectId} onValueChange={handleProjectChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Project (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="none">No Project (General Task)</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code} — {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Department / Sector</Label>
                <Select value={taskDeptId} onValueChange={(val) => setTaskDeptId(val)}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All Departments / Sectors</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SECTION 1: Team Lead / Project Lead */}
            <div className="rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/25 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500 shrink-0" />
                  <Label className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    Team Lead / Project Lead *
                  </Label>
                  <Badge variant="outline" className="text-[10px] h-4.5 bg-amber-100/80 text-amber-800 dark:text-amber-300 border-amber-300">
                    Lead
                  </Badge>
                </div>
                {selectedProject && selectedProjectLead && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedProjectLead?.id) {
                        setLeadId(selectedProjectLead.id)
                        setAssigneeId(selectedProjectLead.id)
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer bg-amber-100/90 dark:bg-amber-900/40 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 transition-colors"
                  >
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    Auto-take Project Lead: {selectedProjectLead.first_name} {selectedProjectLead.last_name}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Designate the Team Lead or Project Lead responsible for delivering this task.
              </p>

              <Select
                value={leadId || undefined}
                onValueChange={(val) => {
                  setLeadId(val)
                  setAssigneeId(val)
                }}
              >
                <SelectTrigger className="w-full text-xs bg-background">
                  <SelectValue placeholder="Select Team Lead or Project Lead..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {/* Group 1: Project Leadership (if project selected) */}
                  {selectedProject && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-primary flex items-center gap-1.5 py-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        Project Leadership ({selectedProject.project_name})
                      </SelectLabel>
                      {selectedProjectLead && (
                        <SelectItem
                          value={selectedProjectLead.id}
                          className="font-semibold text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/40 my-0.5"
                        >
                          ⭐ [Team Lead] {selectedProjectLead.first_name} {selectedProjectLead.last_name} ({selectedProjectLead.employee_code || 'Lead'})
                        </SelectItem>
                      )}
                      {selectedProjectHead && selectedProjectHead.id !== selectedProjectLead?.id && (
                        <SelectItem value={selectedProjectHead.id} className="font-semibold text-indigo-700 dark:text-indigo-400">
                          👑 [Project Head] {selectedProjectHead.first_name} {selectedProjectHead.last_name} ({selectedProjectHead.employee_code || 'Head'})
                        </SelectItem>
                      )}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* Group 2: Department Employees */}
                  {deptMatchedEmployees.length > 0 && taskDeptId !== 'all' && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground py-1">
                        Sector Staff ({departments.find((d) => d.id === taskDeptId)?.name || 'Department'})
                      </SelectLabel>
                      {deptMatchedEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.employee_code ? `${e.employee_code} — ` : ''}{e.first_name} {e.last_name} ({e.designation?.name || 'Staff'})
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* Group 3: All Company Staff */}
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground py-1">
                      All Company Employees
                    </SelectLabel>
                    {allEmployeesSafe.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.employee_code ? `${e.employee_code} — ` : ''}{e.first_name} {e.last_name} ({e.designation?.name || 'Staff'})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Status indicator when Lead is selected */}
              {selectedLeadEmployee && (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-medium pt-0.5">
                  <Check className="h-3.5 w-3.5 text-amber-600" />
                  <span>Designated Lead: <strong>{selectedLeadEmployee.first_name} {selectedLeadEmployee.last_name}</strong></span>
                  {selectedLeadEmployee.employee_code && (
                    <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 px-1 py-0.2 rounded border border-amber-300">
                      {selectedLeadEmployee.employee_code}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 2: Assign Team Members (N Members) */}
            <div className="rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/25 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <Label className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Assign Team Members
                  </Label>
                  <Badge variant="secondary" className="text-[10px] h-4.5 bg-indigo-100/90 text-indigo-800 dark:text-indigo-300 border-indigo-300">
                    {memberIds.length} {memberIds.length === 1 ? 'member' : 'members'} selected
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedProject && selectedProjectMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAllProjectMembers}
                      className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 hover:underline cursor-pointer bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded border border-indigo-200"
                    >
                      + Add All Project Members ({selectedProjectMembers.length})
                    </button>
                  )}
                  {memberIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMemberIds([])}
                      className="text-[10px] font-semibold text-destructive hover:underline cursor-pointer px-1.5 py-0.5"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Assign N number of team members to collaborate and work on this task.
              </p>

              {/* Member Selector Dropdown */}
              <Select value="" onValueChange={(val) => { if (val) handleToggleMember(val) }}>
                <SelectTrigger className="w-full text-xs bg-background">
                  <SelectValue placeholder="➕ Click to add / assign a team member..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {/* Project Members Group */}
                  {selectedProject && selectedProjectMembers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-bold text-indigo-700 dark:text-indigo-400 py-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Project Members ({selectedProject.project_name})
                      </SelectLabel>
                      {selectedProjectMembers.map((m) => {
                        const isAdded = memberIds.includes(m.id)
                        return (
                          <SelectItem
                            key={m.id}
                            value={m.id}
                            className={isAdded ? 'bg-indigo-50/80 dark:bg-indigo-950 font-semibold text-indigo-900 dark:text-indigo-200' : ''}
                          >
                            <span className="flex items-center gap-1.5">
                              {isAdded ? (
                                <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              ) : (
                                <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              {m.employee_code ? `${m.employee_code} — ` : ''}{m.first_name} {m.last_name} ({m.designation?.name || 'Staff'})
                              {isAdded && <span className="text-[10px] text-indigo-600 font-bold ml-1">(Added)</span>}
                            </span>
                          </SelectItem>
                        )
                      })}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* Sector Staff Group */}
                  {deptMatchedEmployees.length > 0 && taskDeptId !== 'all' && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground py-1">
                        Sector Staff ({departments.find((d) => d.id === taskDeptId)?.name || 'Department'})
                      </SelectLabel>
                      {deptMatchedEmployees.map((e) => {
                        const isAdded = memberIds.includes(e.id)
                        return (
                          <SelectItem
                            key={e.id}
                            value={e.id}
                            className={isAdded ? 'bg-indigo-50/80 dark:bg-indigo-950 font-semibold text-indigo-900 dark:text-indigo-200' : ''}
                          >
                            <span className="flex items-center gap-1.5">
                              {isAdded ? (
                                <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              ) : (
                                <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                              {e.employee_code ? `${e.employee_code} — ` : ''}{e.first_name} {e.last_name} ({e.designation?.name || 'Staff'})
                              {isAdded && <span className="text-[10px] text-indigo-600 font-bold ml-1">(Added)</span>}
                            </span>
                          </SelectItem>
                        )
                      })}
                      <SelectSeparator />
                    </SelectGroup>
                  )}

                  {/* All Company Staff Group */}
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground py-1">
                      All Company Employees
                    </SelectLabel>
                    {allEmployeesSafe.map((e) => {
                      const isAdded = memberIds.includes(e.id)
                      return (
                        <SelectItem
                          key={e.id}
                          value={e.id}
                          className={isAdded ? 'bg-indigo-50/80 dark:bg-indigo-950 font-semibold text-indigo-900 dark:text-indigo-200' : ''}
                        >
                          <span className="flex items-center gap-1.5">
                            {isAdded ? (
                              <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            {e.employee_code ? `${e.employee_code} — ` : ''}{e.first_name} {e.last_name} ({e.designation?.name || 'Staff'})
                            {isAdded && <span className="text-[10px] text-indigo-600 font-bold ml-1">(Added)</span>}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Chips for Selected Members */}
              {memberIds.length === 0 ? (
                <div className="text-[11px] text-muted-foreground italic px-1">
                  No team members added yet. Click the dropdown above to add team members to this task.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-background/90 rounded-lg border border-border/70">
                  {memberIds.map((mId) => {
                    const emp = allEmployeesSafe.find((e) => e.id === mId)
                    if (!emp) return null
                    return (
                      <span
                        key={emp.id}
                        className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 px-2 py-1 rounded-md text-xs font-medium shadow-2xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </span>
                        <span>{emp.first_name} {emp.last_name}</span>
                        {emp.employee_code && (
                          <span className="font-mono text-[9px] bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1 py-0.2 rounded font-semibold">
                            {emp.employee_code}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(emp.id)}
                          className="text-indigo-400 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
                          title="Remove member"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <DialogFooter className="px-6 py-3 border-t bg-muted/20 shrink-0 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import {
  REGULAR_COMPLAINTS,
  countWords,
  trimToMaxWords,
  fetchAuthorizedComplaints,
  submitComplaint,
  updateComplaintStatus,
  deleteComplaint,
  type ComplaintRecord,
} from '@/lib/api/complaints'
import {
  MessageSquareWarning,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Eye,
  Trash2,
  UserCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  RotateCw,
} from 'lucide-react'

const DEPARTMENTS = [
  'Human Resources (HR)',
  'Information Technology (IT)',
  'Finance & Payroll',
  'Operations & Admin',
  'Facilities & Maintenance',
  'Executive Leadership',
  'General / Workplace Environment',
]

const MAX_WORD_LIMIT = 100

export default function ComplaintsPage() {
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

  // Tabs
  const [activeTab, setActiveTab] = useState<'submit' | 'my-complaints' | 'admin-desk'>(() =>
    isHROrAdmin ? 'admin-desk' : 'submit'
  )

  // Complaints Data
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([])
  const [myComplaints, setMyComplaints] = useState<ComplaintRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [customSubject, setCustomSubject] = useState('')
  const [department, setDepartment] = useState('Human Resources (HR)')
  const [priority, setPriority] = useState<ComplaintRecord['priority']>('medium')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filters (for Admin / My Complaints)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Selected Complaint for View / Status Modal
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [resolutionStatus, setResolutionStatus] = useState<ComplaintRecord['status']>('under_review')
  const [resolutionNote, setResolutionNote] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Load complaints based on role
  const loadData = async () => {
    try {
      setLoading(true)
      const { accessible, my } = await fetchAuthorizedComplaints({
        employeeId: employee?.id,
        employeeEmail: employee?.email,
        canManage: isHROrAdmin,
      })
      setComplaints(accessible)
      setMyComplaints(my)
    } catch (err) {
      console.error('Failed to load complaints:', err)
      toast.error('Could not load complaints list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isHROrAdmin, employee?.id, employee?.email])

  // Security guard: HR/Admins remain on admin desk, non-HR/Admins cannot access admin desk
  useEffect(() => {
    if (isHROrAdmin && activeTab !== 'admin-desk') {
      setActiveTab('admin-desk')
    } else if (!isHROrAdmin && activeTab === 'admin-desk') {
      setActiveTab('submit')
    }
  }, [isHROrAdmin, activeTab])

  // Word count computation
  const currentWordCount = countWords(description)
  const isOverLimit = currentWordCount > MAX_WORD_LIMIT
  const wordsRemaining = Math.max(0, MAX_WORD_LIMIT - currentWordCount)
  const wordsOverLimit = Math.max(0, currentWordCount - MAX_WORD_LIMIT)

  // Update description on change without silent truncating
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
  }

  // Quick auto-trim action for user convenience
  const handleTrimToMax = () => {
    const clamped = trimToMaxWords(description, MAX_WORD_LIMIT)
    setDescription(clamped)
    toast.info('Trimmed description to exactly 100 words.')
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isHROrAdmin) {
      toast.error('HR and Administrators cannot file complaints. Your role is to review and resolve employee grievances.')
      return
    }

    if (!selectedCategory) {
      toast.error('Please select a complaint category from the dropdown.')
      return
    }

    if (selectedCategory === 'Other' && !customSubject.trim()) {
      toast.error('Please provide a specific subject / title when "Other" is selected.')
      return
    }

    if (!description.trim()) {
      toast.error('Please enter the complaint description.')
      return
    }

    if (isOverLimit || currentWordCount > MAX_WORD_LIMIT) {
      toast.error(`Your complaint description exceeds the 100-word limit (${currentWordCount} words entered, ${wordsOverLimit} words over limit). Please shorten it.`)
      return
    }

    try {
      setIsSubmitting(true)
      const newRecord = await submitComplaint({
        employee_id: employee?.id,
        employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Staff Member',
        employee_code: employee?.employee_code,
        employee_email: employee?.email,
        department,
        category: selectedCategory,
        custom_subject: selectedCategory === 'Other' ? customSubject : null,
        description,
        priority,
      })

      toast.success(`Complaint submitted successfully! Ticket: ${newRecord.ticket_number}`)
      
      // Reset form
      setSelectedCategory('')
      setCustomSubject('')
      setDescription('')
      setPriority('medium')

      await loadData()
      setActiveTab('my-complaints')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit complaint.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Status Update (HR/Admin)
  const handleSaveResolution = async () => {
    if (!selectedComplaint) return

    try {
      setIsUpdatingStatus(true)
      const adminName = employee ? `${employee.first_name} ${employee.last_name}` : 'HR Administrator'
      await updateComplaintStatus(
        selectedComplaint.id,
        resolutionStatus,
        resolutionNote,
        adminName
      )

      toast.success(`Complaint #${selectedComplaint.ticket_number} updated to ${resolutionStatus.replace('_', ' ').toUpperCase()}`)
      setIsDetailOpen(false)
      setSelectedComplaint(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update complaint status.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Handle Delete
  const handleDelete = async (id: string, ticketNum: string) => {
    if (!confirm(`Are you sure you want to delete complaint #${ticketNum}?`)) return
    try {
      await deleteComplaint(id)
      toast.success(`Complaint #${ticketNum} deleted.`)
      if (selectedComplaint?.id === id) {
        setIsDetailOpen(false)
      }
      await loadData()
    } catch (err: any) {
      toast.error('Failed to delete complaint.')
    }
  }

  const filteredAdminComplaints = isHROrAdmin
    ? complaints.filter((c) => {
        const matchesSearch =
          c.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.custom_subject && c.custom_subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.employee_name.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || c.status === statusFilter
        const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter

        return matchesSearch && matchesStatus && matchesCategory
      })
    : []

  // Metric counts (company-wide for HR/Admin, personal for regular employees)
  const totalCount = isHROrAdmin ? complaints.length : myComplaints.length
  const pendingCount = isHROrAdmin
    ? complaints.filter((c) => c.status === 'pending').length
    : myComplaints.filter((c) => c.status === 'pending').length
  const reviewCount = isHROrAdmin
    ? complaints.filter((c) => c.status === 'under_review').length
    : myComplaints.filter((c) => c.status === 'under_review').length
  const resolvedCount = isHROrAdmin
    ? complaints.filter((c) => c.status === 'resolved').length
    : myComplaints.filter((c) => c.status === 'resolved').length

  const getStatusBadge = (status: ComplaintRecord['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 font-medium">
            <Clock className="w-3 h-3" /> Pending Review
          </Badge>
        )
      case 'under_review':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1 font-medium">
            <AlertCircle className="w-3 h-3" /> Under Investigation
          </Badge>
        )
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </Badge>
        )
      case 'dismissed':
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-300 gap-1 font-medium">
            Dismissed
          </Badge>
        )
    }
  }

  const getPriorityBadge = (priority: ComplaintRecord['priority']) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-semibold">Urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-semibold">High</Badge>
      case 'medium':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold">Medium</Badge>
      case 'low':
        return <Badge variant="secondary" className="font-semibold">Low</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={isHROrAdmin ? "Grievance Management Desk" : "Complaint Box & Grievances"}
        description={
          isHROrAdmin
            ? "Official HR and Management review desk to investigate and resolve employee workplace grievances."
            : "Confidential workplace grievance reporting with regular categories, anonymous option, and 100-word limit."
        }
        actions={
          <div className="flex items-center gap-2">
            {!isHROrAdmin ? (
              <Button
                variant={activeTab === 'submit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('submit')}
                className="gap-2"
              >
                <PlusCircle className="h-4 w-4" /> File Complaint
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="gap-2"
              >
                <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Desk
              </Button>
            )}
          </div>
        }
      />

      {/* Role Notice */}
      {isHROrAdmin ? (
        <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white border border-blue-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>HR & Admin Review Authority:</strong> You are in official review and resolution mode. Grievance filing is reserved for employees. Your role is to examine incoming complaints, update investigation status, and record formal resolution findings.
            </span>
          </div>
          <Badge variant="outline" className="bg-white border-blue-300 text-primary font-semibold shrink-0 self-start sm:self-auto">
            Reviewer Mode
          </Badge>
        </div>
      ) : (
        <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-white border border-indigo-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Confidentiality Policy:</strong> All complaints raised are strictly private and encrypted. Only authorized <strong>HR and Admins</strong> can access, view, or investigate reports. Other employees cannot see your complaints.
            </span>
          </div>
          <Badge variant="outline" className="bg-white border-indigo-300 text-indigo-700 font-semibold shrink-0 self-start sm:self-auto">
            HR & Admin Access Only
          </Badge>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200/60 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {isHROrAdmin ? 'Total Grievances' : 'My Complaints'}
              </p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <MessageSquareWarning className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200/60 shadow-sm bg-gradient-to-br from-amber-50/40 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                {isHROrAdmin ? 'Pending Action' : 'Pending Review'}
              </p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/60 shadow-sm bg-gradient-to-br from-blue-50/40 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Under Investigation</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{reviewCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <AlertCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/60 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Resolved</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {isHROrAdmin ? (
        /* HR / ADMIN REVIEW DESK VIEW (NO COMPLAINT FILING) */
        <div className="mt-6 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" /> Grievance Management Desk
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Review incoming complaints, update investigation status, and provide resolution remarks.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5 text-xs">
                    <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh List
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    placeholder="Search ticket, category, details..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Investigation</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Filter by Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {REGULAR_COMPLAINTS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent>
              {filteredAdminComplaints.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-slate-700">No complaints matching filter</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    There are no complaints under the selected search or status criteria.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Ticket</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Category / Subject</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAdminComplaints.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-800">
                            {item.ticket_number}
                          </td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div>
                              <span className="font-semibold text-slate-800 block">{item.employee_name}</span>
                              <span className="text-[11px] text-slate-400 block">
                                {item.employee_code ? `${item.employee_code} • ` : ''}{item.employee_email || item.department || ''}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <span className="font-semibold text-slate-800 block">
                              {item.category === 'Other' && item.custom_subject
                                ? `[Other] ${item.custom_subject}`
                                : item.category}
                            </span>
                            <span className="text-slate-500 truncate block text-[11px] max-w-xs break-all">
                              {item.description}
                            </span>
                          </td>
                          <td className="p-3">{getPriorityBadge(item.priority)}</td>
                          <td className="p-3">{getStatusBadge(item.status)}</td>
                          <td className="p-3 text-right space-x-1 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => {
                                setSelectedComplaint(item)
                                setResolutionStatus(item.status)
                                setResolutionNote(item.resolution_note || '')
                                setIsDetailOpen(true)
                              }}
                            >
                              <Eye className="w-3 h-3" /> Review
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(item.id, item.ticket_number)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* REGULAR EMPLOYEE VIEW (FILE COMPLAINT & MY COMPLAINTS) */
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid grid-cols-2 max-w-xs w-full bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="submit" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
              <PlusCircle className="h-4 w-4" /> File Complaint
            </TabsTrigger>
            <TabsTrigger value="my-complaints" className="rounded-lg gap-2 text-xs md:text-sm font-medium">
              <FileText className="h-4 w-4" /> My Complaints ({myComplaints.length})
            </TabsTrigger>
          </TabsList>

        {/* TAB 1: SUBMIT COMPLAINT FORM */}
        <TabsContent value="submit" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 shadow-md">
              <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <MessageSquareWarning className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Submit a Grievance or Complaint</CardTitle>
                    <CardDescription className="text-xs">
                      Select a regular complaint topic or choose &quot;Other&quot; to specify your concern.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Dropdown & Other input */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Regular Complaints Dropdown */}
                      <div className="space-y-2">
                        <Label htmlFor="category-select" className="text-sm font-semibold flex items-center gap-1.5">
                          Regular Complaints Category <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger id="category-select" className="bg-white border-slate-300">
                            <SelectValue placeholder="-- Select Regular Complaint --" />
                          </SelectTrigger>
                          <SelectContent>
                            {REGULAR_COMPLAINTS.map((cat) => (
                              <SelectItem key={cat} value={cat} className="font-medium">
                                {cat === 'Other' ? '⭐ Other (Custom Complaint)' : cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          Choose standard issues or select &quot;Other&quot; for custom concerns.
                        </p>
                      </div>

                      {/* Department Select */}
                      <div className="space-y-2">
                        <Label htmlFor="department-select" className="text-sm font-semibold">
                          Concerned Department / Area
                        </Label>
                        <Select value={department} onValueChange={setDepartment}>
                          <SelectTrigger id="department-select" className="bg-white border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">Routing destination for the review committee.</p>
                      </div>
                    </div>

                    {/* Conditional Other Field */}
                    {selectedCategory === 'Other' && (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 animate-in fade-in duration-300">
                        <Label htmlFor="custom-subject" className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                          Specify Complaint Subject / Topic <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="custom-subject"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                          placeholder="e.g. Broken office chair causing posture injury, cafeteria hygiene..."
                          className="bg-white border-amber-300 focus-visible:ring-amber-500"
                          maxLength={120}
                        />
                        <p className="text-xs text-amber-700">
                          Please provide a concise headline for your custom complaint.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Priority Select */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Severity / Priority Level</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(['low', 'medium', 'high', 'urgent'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setPriority(lvl)}
                          className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                            priority === lvl
                              ? lvl === 'urgent'
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                : lvl === 'high'
                                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                : lvl === 'medium'
                                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                                : 'bg-slate-700 text-white border-slate-700 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 100 Word Limit Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="complaint-desc" className="text-sm font-semibold flex items-center gap-1.5">
                        Complaint Description / Facts <span className="text-rose-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border transition-colors ${
                            isOverLimit
                              ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
                              : currentWordCount === MAX_WORD_LIMIT
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : currentWordCount > 85
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          }`}
                        >
                          {currentWordCount} / {MAX_WORD_LIMIT} words
                        </span>
                        {!isOverLimit ? (
                          <span className="text-xs text-slate-500">
                            ({wordsRemaining} remaining)
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-rose-600">
                            ({wordsOverLimit} {wordsOverLimit === 1 ? 'word' : 'words'} over limit)
                          </span>
                        )}
                      </div>
                    </div>

                    <Textarea
                      id="complaint-desc"
                      value={description}
                      onChange={handleDescriptionChange}
                      rows={5}
                      placeholder="Clearly describe the incident, situation, or issue. Include dates, locations, or affected staff where applicable. (Limit: 100 words)..."
                      className={`bg-white transition-all ${
                        isOverLimit
                          ? 'border-rose-500 ring-2 ring-rose-500/20 focus-visible:ring-rose-500 bg-rose-50/10'
                          : currentWordCount === MAX_WORD_LIMIT
                          ? 'border-amber-400 focus-visible:ring-amber-500'
                          : 'border-slate-300'
                      }`}
                    />

                    {/* Progress Bar for Word Limit */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 transition-all duration-300 ${
                          isOverLimit
                            ? 'bg-rose-500'
                            : currentWordCount > 85
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (currentWordCount / MAX_WORD_LIMIT) * 100)}%` }}
                      />
                    </div>

                    {/* Prominent Validation Message */}
                    {isOverLimit ? (
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-700 animate-in fade-in duration-200 shadow-sm">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block text-rose-900">Word Limit Exceeded ({currentWordCount} / {MAX_WORD_LIMIT} words)</span>
                            <span>
                              Your complaint description exceeds the 100-word limit by <strong className="text-rose-900 font-bold">{wordsOverLimit} {wordsOverLimit === 1 ? 'word' : 'words'}</strong>. You cannot submit this complaint until it is shortened to 100 words or fewer.
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleTrimToMax}
                          className="h-7 text-xs px-3 font-semibold shrink-0 shadow-sm"
                        >
                          Auto-trim to 100 words
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 flex items-center justify-between">
                        <span>Strict limit of 100 words applies to ensure concise and prompt action.</span>
                        {currentWordCount === MAX_WORD_LIMIT && (
                          <span className="text-amber-600 font-semibold">Maximum 100-word limit reached</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Complainant Identity Confirmation */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Filing as: {employee ? `${employee.first_name} ${employee.last_name}` : 'Logged-in Staff'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {employee?.employee_code ? `${employee.employee_code} • ` : ''}
                          {employee?.email || 'Confidential submission to HR & Admin'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-slate-600 bg-white border-slate-300 text-[11px] w-fit">
                      Confidential to HR & Admin
                    </Badge>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory('')
                        setCustomSubject('')
                        setDescription('')
                        setPriority('medium')
                      }}
                      disabled={isSubmitting}
                    >
                      Clear Form
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !description.trim() || isOverLimit}
                      className="gap-2 px-6"
                    >
                      {isSubmitting ? (
                        <>Submitting...</>
                      ) : (
                        <>
                          <MessageSquareWarning className="w-4 h-4" /> Submit Complaint
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Right Guide Card */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-50/30 via-white to-slate-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <ShieldCheck className="w-5 h-5" />
                    <CardTitle className="text-base">Grievance Policy & Protection</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
                  <p>
                    <strong>Anti-Retaliation Policy:</strong> Oklut strictly prohibits any form of retaliation against employees who file complaints in good faith.
                  </p>
                  <p>
                    <strong>Word Limit Rule:</strong> To facilitate quick investigation and immediate resolution, all complaint summaries are capped at <strong>100 words</strong>.
                  </p>
                  <p>
                    <strong>Confidential Routing:</strong> Complaints are securely routed only to authorized HR and Management Admins with employee details for investigation. No external notifications are broadcast.
                  </p>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Emergency or Urgent Matters:
                    </p>
                    <p>
                      For immediate safety threats or severe harassment, please also directly reach out to the POSH / Internal Committee head.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Regular Complaints Quick List */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-slate-700">
                    <HelpCircle className="w-4 h-4 text-primary" /> Supported Regular Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {REGULAR_COMPLAINTS.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                        <span className={item === 'Other' ? 'font-semibold text-primary' : ''}>
                          {item === 'Other' ? 'Other (With Custom Title)' : item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MY COMPLAINTS */}
        <TabsContent value="my-complaints" className="mt-6 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">My Submitted Complaints</CardTitle>
                <CardDescription className="text-xs">
                  Track the progress, status, and resolution notes for your filed complaints.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setActiveTab('submit')} className="gap-1.5">
                <PlusCircle className="w-4 h-4" /> New Complaint
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Loading complaints...
                </div>
              ) : myComplaints.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
                  <MessageSquareWarning className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-semibold text-slate-700">No complaints filed yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    You have not submitted any grievances. If you experience any workplace issue, use the complaint box anytime.
                  </p>
                  <Button size="sm" className="mt-4" onClick={() => setActiveTab('submit')}>
                    File a Complaint
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myComplaints.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 p-3 rounded-xl transition-colors"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {item.ticket_number}
                          </span>
                          {getStatusBadge(item.status)}
                          {getPriorityBadge(item.priority)}
                          <span className="text-xs text-slate-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          {item.category === 'Other' && item.custom_subject
                            ? `[Other] ${item.custom_subject}`
                            : item.category}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Length: {item.word_count} / {MAX_WORD_LIMIT} words</span>
                          {item.department && <span>• Dept: {item.department}</span>}
                        </div>
                        {item.resolution_note && (
                          <div className="mt-2 p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                            <strong>HR Resolution Note:</strong> {item.resolution_note}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(item)
                            setResolutionStatus(item.status)
                            setResolutionNote(item.resolution_note || '')
                            setIsDetailOpen(true)
                          }}
                          className="gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        </Tabs>
      )}

      {/* COMPLAINT DETAILS & RESOLUTION MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border-slate-200 bg-white">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 shrink-0 bg-white pr-12 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                {selectedComplaint?.ticket_number}
              </span>
              {selectedComplaint && getPriorityBadge(selectedComplaint.priority)}
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 mt-2 break-words text-left">
              {selectedComplaint?.category === 'Other' && selectedComplaint?.custom_subject
                ? `[Other] ${selectedComplaint.custom_subject}`
                : selectedComplaint?.category}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1 text-left">
              Submitted on {selectedComplaint ? new Date(selectedComplaint.created_at).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedComplaint && (
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs min-w-0 custom-scrollbar">
              {/* Meta information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50/90 rounded-xl border border-slate-200/80">
                <div className="min-w-0">
                  <span className="text-slate-400 block font-medium">Complainant:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{selectedComplaint.employee_name}</span>
                  </span>
                  {selectedComplaint.employee_code && (
                    <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                      {selectedComplaint.employee_code} {selectedComplaint.employee_email ? `• ${selectedComplaint.employee_email}` : ''}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 block font-medium">Department:</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                    {selectedComplaint.department || 'Not Specified'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 block font-medium">Word Count:</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {selectedComplaint.word_count} / {MAX_WORD_LIMIT} words
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 block font-medium">Current Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedComplaint.status)}</div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 min-w-0">
                <Label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Complaint Details / Facts:
                </Label>
                <div className="p-4 bg-white border border-slate-200 rounded-xl leading-relaxed text-slate-800 whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] max-h-56 overflow-y-auto custom-scrollbar select-text shadow-sm">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* Resolution / Admin update section */}
              {isHROrAdmin ? (
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl space-y-3 min-w-0">
                  <Label className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> Admin / HR Investigation Action
                  </Label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="status-select" className="text-[11px] text-slate-500">
                        Update Status
                      </Label>
                      <Select
                        value={resolutionStatus}
                        onValueChange={(val: any) => setResolutionStatus(val)}
                      >
                        <SelectTrigger id="status-select" className="bg-white h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="under_review">Under Investigation</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="dismissed">Dismissed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="resolution-notes" className="text-[11px] text-slate-500">
                      Official Resolution Note / Remarks to Employee
                    </Label>
                    <Textarea
                      id="resolution-notes"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      rows={3}
                      placeholder="Enter steps taken, findings, or resolution remarks..."
                      className="bg-white text-xs leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                selectedComplaint.resolution_note && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 min-w-0">
                    <Label className="font-semibold text-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Resolution Note from HR:
                    </Label>
                    <p className="text-emerald-800 leading-relaxed whitespace-pre-wrap break-words break-all">
                      {selectedComplaint.resolution_note}
                    </p>
                    {selectedComplaint.resolved_by && (
                      <p className="text-[10px] text-emerald-600 mt-1">
                        Resolved by {selectedComplaint.resolved_by} on{' '}
                        {selectedComplaint.resolved_at
                          ? new Date(selectedComplaint.resolved_at).toLocaleDateString()
                          : ''}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/90 gap-2 shrink-0 flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            {isHROrAdmin && (
              <Button
                size="sm"
                onClick={handleSaveResolution}
                disabled={isUpdatingStatus}
                className="gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isUpdatingStatus ? 'Saving...' : 'Save Updates'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

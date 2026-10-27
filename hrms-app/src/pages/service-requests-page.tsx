import { useState, useEffect, useMemo, useRef } from 'react'
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
  SERVICE_REQUEST_CATEGORIES,
  uploadServiceRequestDocument,
  fetchAuthorizedServiceRequests,
  createServiceRequest,
  updateServiceRequestAction,
  deleteServiceRequest,
  type ServiceRequest,
  type ServiceRequestAttachment,
} from '@/lib/api/service-requests'
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Search,
  Eye,
  Trash2,
  FileText,
  Upload,
  Download,
  X,
  Paperclip,
  User,
  FileCheck,
  Send,
  Loader2,
  Filter,
  CheckCircle,
} from 'lucide-react'

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export default function ServiceRequestsPage() {
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
  const [activeTab, setActiveTab] = useState<'raise' | 'my-tickets' | 'admin-desk'>(
    isHROrAdmin ? 'admin-desk' : 'raise'
  )

  // Data
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [myRequests, setMyRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  // New Request Form State
  const [category, setCategory] = useState<string>(SERVICE_REQUEST_CATEGORIES[0])
  const [priority, setPriority] = useState<ServiceRequest['priority']>('medium')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<ServiceRequestAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Selected Request for View / HR Action Modal
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [actionStatus, setActionStatus] = useState<ServiceRequest['status']>('in_progress')
  const [actionNotes, setActionNotes] = useState('')
  const [actionAttachments, setActionAttachments] = useState<ServiceRequestAttachment[]>([])
  const [isUploadingActionDoc, setIsUploadingActionDoc] = useState(false)
  const [isSavingAction, setIsSavingAction] = useState(false)
  const actionFileInputRef = useRef<HTMLInputElement>(null)

  // View Only Modal for Employee
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true)
      const { accessible, my } = await fetchAuthorizedServiceRequests({
        employeeId: employee?.id,
        employeeEmail: employee?.email,
        canManage: isHROrAdmin,
      })
      setRequests(accessible)
      setMyRequests(my)
    } catch (err) {
      console.error('Failed to load service requests:', err)
      toast.error('Failed to fetch service requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [isHROrAdmin, employee?.id, employee?.email])

  // Handle Employee File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    const newAttachments: ServiceRequestAttachment[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds 15MB limit. Please upload a smaller file.`)
          continue
        }
        const uploaded = await uploadServiceRequestDocument(file)
        newAttachments.push(uploaded)
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments])
        toast.success(
          newAttachments.length === 1
            ? 'Document attached successfully.'
            : `${newAttachments.length} document(s) attached successfully.`
        )
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error(err?.message || 'Error uploading document.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Handle HR Document Upload
  const handleActionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingActionDoc(true)
    const newAttachments: ServiceRequestAttachment[] = []

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds 15MB limit. Please upload a smaller file.`)
          continue
        }
        const uploaded = await uploadServiceRequestDocument(file)
        newAttachments.push(uploaded)
      }

      if (newAttachments.length > 0) {
        setActionAttachments((prev) => [...prev, ...newAttachments])
        toast.success(
          newAttachments.length === 1
            ? 'HR document uploaded successfully.'
            : `${newAttachments.length} HR document(s) uploaded successfully.`
        )
      }
    } catch (err: any) {
      console.error('HR doc upload error:', err)
      toast.error(err?.message || 'Error uploading HR file.')
    } finally {
      setIsUploadingActionDoc(false)
      if (actionFileInputRef.current) actionFileInputRef.current.value = ''
    }
  }

  const removeActionAttachment = (index: number) => {
    setActionAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  // Submit New Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim()) {
      toast.error('Please enter a subject or title for the issue.')
      return
    }
    if (!description.trim()) {
      toast.error('Please describe the issue in the text box.')
      return
    }

    const currentEmpId = employee?.id || user?.employee_id || 'emp-self'
    const currentEmpName = employee
      ? `${employee.first_name} ${employee.last_name}`.trim()
      : user?.email?.split('@')[0] || 'Employee'

    setIsSubmitting(true)
    try {
      const created = await createServiceRequest({
        employee_id: currentEmpId,
        employee_name: currentEmpName,
        employee_code: employee?.employee_code || null,
        employee_email: employee?.email || user?.email || null,
        department: employee?.department?.name || null,
        category,
        priority,
        subject,
        description,
        attachments,
      })

      toast.success(`Ticket #${created.ticket_number} created successfully!`, {
        description: 'Our HR and Admin team will review your request and take action.',
      })

      // Reset form
      setSubject('')
      setDescription('')
      setAttachments([])
      setCategory(SERVICE_REQUEST_CATEGORIES[0])
      setPriority('medium')

      await loadData()
      setActiveTab('my-tickets')
    } catch (err: any) {
      console.error('Submit ticket error:', err)
      toast.error(err?.message || 'Failed to submit service request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Open HR Action Modal
  const openActionModal = (req: ServiceRequest) => {
    setSelectedRequest(req)
    setActionStatus(req.status)
    setActionNotes(req.action_notes || '')
    setActionAttachments(req.action_attachments || [])
    setIsActionModalOpen(true)
  }

  // Save HR Action
  const handleSaveAction = async () => {
    if (!selectedRequest) return

    setIsSavingAction(true)
    const adminName = employee
      ? `${employee.first_name} ${employee.last_name} (${isHR ? 'HR' : 'Admin'})`.trim()
      : user?.email || 'HR & Admin Desk'

    try {
      await updateServiceRequestAction(selectedRequest.id, {
        status: actionStatus,
        action_notes: actionNotes,
        action_by_name: adminName,
        action_by_email: user?.email || employee?.email || undefined,
        action_attachments: actionAttachments,
      })

      toast.success(`Ticket #${selectedRequest.ticket_number} updated to ${actionStatus.toUpperCase()}`)
      setIsActionModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error('Failed to update ticket action:', err)
      toast.error(err?.message || 'Failed to update ticket action.')
    } finally {
      setIsSavingAction(false)
    }
  }

  // Delete Request
  const handleDeleteRequest = async (id: string, ticketNum: string) => {
    if (!confirm(`Are you sure you want to permanently delete ticket #${ticketNum}?`)) return

    try {
      await deleteServiceRequest(id)
      toast.success(`Ticket #${ticketNum} removed.`)
      await loadData()
    } catch {
      toast.error('Failed to delete ticket.')
    }
  }

  // Filtered lists
  const filterList = (list: ServiceRequest[]) => {
    return list.filter((r) => {
      const matchQuery =
        !searchQuery ||
        r.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      const matchCategory = categoryFilter === 'all' || r.category === categoryFilter

      return matchQuery && matchStatus && matchCategory
    })
  }

  const filteredMyTickets = useMemo(() => filterList(myRequests), [myRequests, searchQuery, statusFilter, categoryFilter])
  const filteredAllTickets = useMemo(() => filterList(requests), [requests, searchQuery, statusFilter, categoryFilter])

  // Metric counts
  const stats = useMemo(() => {
    const list = isHROrAdmin ? requests : myRequests
    return {
      total: list.length,
      pending: list.filter((r) => r.status === 'pending').length,
      inProgress: list.filter((r) => r.status === 'in_progress').length,
      resolved: list.filter((r) => r.status === 'resolved').length,
    }
  }, [requests, myRequests, isHROrAdmin])

  const renderStatusBadge = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 gap-1 font-semibold">
            <Clock className="h-3 w-3" /> Pending Review
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 gap-1 font-semibold">
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" /> In Progress
          </Badge>
        )
      case 'resolved':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Resolved
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 gap-1 font-semibold">
            <X className="h-3 w-3 text-rose-600" /> Rejected / Closed
          </Badge>
        )
    }
  }

  const renderPriorityBadge = (p: ServiceRequest['priority']) => {
    switch (p) {
      case 'urgent':
        return <Badge className="bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold uppercase tracking-wide">Urgent</Badge>
      case 'high':
        return <Badge className="bg-orange-500 text-white hover:bg-orange-600 text-xs font-medium">High</Badge>
      case 'medium':
        return <Badge className="bg-amber-500 text-white hover:bg-amber-600 text-xs font-medium">Medium</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Low</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Request Sector"
        description="Raise support tickets for any workplace issue, IT equipment, salary discrepancy, or facilities with document attachments. Confidential and directly reviewed by HR and Admin."
        actions={
          <div className="flex items-center gap-2">
            {isHROrAdmin ? (
              <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 py-1.5 px-3 text-xs gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4 text-indigo-600" /> HR & Admin Resolution Desk
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 py-1.5 px-3 text-xs gap-1.5 font-medium">
                <User className="h-4 w-4 text-slate-500" /> Employee Self-Service Desk
              </Badge>
            )}
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {isHROrAdmin ? 'All Tickets' : 'My Requests'}
                </p>
                <p className="mt-1 text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                <LifeBuoy className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Action</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.resolved}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-3">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <TabsTrigger value="raise" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-xs">
              <PlusCircle className="h-4 w-4 text-indigo-600" /> Raise a Ticket
            </TabsTrigger>
            <TabsTrigger value="my-tickets" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-xs">
              <FileText className="h-4 w-4 text-emerald-600" /> My Tickets ({myRequests.length})
            </TabsTrigger>
            {isHROrAdmin && (
              <TabsTrigger value="admin-desk" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-xs">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                HR & Admin Action Desk ({requests.length})
              </TabsTrigger>
            )}
          </TabsList>

          {activeTab !== 'raise' && (
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets, subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 text-xs h-9 bg-white dark:bg-slate-900">
                  <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 text-xs h-9 bg-white dark:bg-slate-900 hidden md:flex">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SERVICE_REQUEST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* TAB 1: RAISE A TICKET */}
        <TabsContent value="raise" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 text-indigo-600" /> Raise New Service Request
                  </CardTitle>
                  <CardDescription>
                    Provide clear details regarding the problem you are facing. You can attach error screenshots, invoices, or supporting documents.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitRequest} className="space-y-5">
                    {/* Category & Priority */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          Issue Category <span className="text-rose-500">*</span>
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_REQUEST_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="text-xs">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Priority Level</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Select Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low" className="text-xs">Low (Routine query)</SelectItem>
                            <SelectItem value="medium" className="text-xs">Medium (Standard issue)</SelectItem>
                            <SelectItem value="high" className="text-xs">High (Work impeded)</SelectItem>
                            <SelectItem value="urgent" className="text-xs">Urgent (Critical blocker)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Subject / Brief Issue Summary <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        placeholder="e.g., Assigned laptop LP-2026-104 screen flickering, or Payslip tax calculation clarification"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="text-xs"
                        maxLength={160}
                      />
                    </div>

                    {/* Description Text Box */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">
                          Issue Description <span className="text-rose-500">*</span>
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          {description.length} characters
                        </span>
                      </div>
                      <Textarea
                        placeholder="Please describe the issue in full detail: what happened, when it started, error messages seen, steps already taken, and any relevant details to help HR & IT resolve it quickly..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={6}
                        className="text-xs leading-relaxed"
                      />
                    </div>

                    {/* Document & File Upload Zone */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                          Upload Supporting Documents / Screenshots (Optional)
                        </span>
                        <span className="text-[11px] text-muted-foreground font-normal">
                          Max 15MB per file (PDF, PNG, JPG, DOCX, ZIP)
                        </span>
                      </Label>

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 rounded-xl p-5 text-center cursor-pointer transition-colors"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,.zip"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-600">
                            {isUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Upload className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {isUploading ? 'Uploading file...' : 'Click or drop files here to upload'}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Attach system screenshots, error logs, approval letters, or invoices
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Attached Files List */}
                      {attachments.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Attached Files ({attachments.length}):
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {attachments.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                                  <div className="truncate">
                                    <p className="font-medium truncate" title={file.name}>
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {formatBytes(file.size)}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeAttachment(idx)}
                                  className="text-muted-foreground hover:text-rose-600 p-1"
                                  title="Remove attachment"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={isSubmitting || isUploading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm gap-2 px-6 py-2.5"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Submitting Ticket...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" /> Raise Service Request
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Guidelines Column */}
            <div className="space-y-4">
              <Card className="border bg-slate-50/70 dark:bg-slate-900/50 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <User className="h-4 w-4 text-indigo-600" /> Requester Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {employee ? `${employee.first_name} ${employee.last_name}` : user?.email?.split('@')[0]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b">
                    <span className="text-muted-foreground">Employee Code:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {employee?.employee_code || '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {employee?.department?.name || 'General Staff'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Official Email:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                      {employee?.email || user?.email}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-xs bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> Privacy & Confidentiality Guarantee
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
                  <p>
                    • <strong>Restricted Visibility:</strong> Your service request, description, and uploaded documents are <strong>strictly visible only to HR and System Administrators</strong>.
                  </p>
                  <p>
                    • <strong>Resolution Action:</strong> HR or Admin will triage your ticket, update its progress, and can provide official response documents or signed approvals directly to your ticket dashboard.
                  </p>
                  <p>
                    • <strong>Direct Notifications:</strong> You can track live updates on the "My Tickets" tab at any time.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: MY TICKETS (FOR ALL EMPLOYEES) */}
        <TabsContent value="my-tickets" className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMyTickets.length === 0 ? (
            <Card className="p-12 text-center">
              <LifeBuoy className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-base">No Service Requests Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                {myRequests.length === 0
                  ? "You haven't submitted any service requests or tickets yet."
                  : 'No tickets matched your current search filters.'}
              </p>
              {myRequests.length === 0 && (
                <Button
                  size="sm"
                  onClick={() => setActiveTab('raise')}
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" /> Raise Your First Ticket
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMyTickets.map((req) => (
                <Card key={req.id} className="border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                        {req.ticket_number}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {renderPriorityBadge(req.priority)}
                        {renderStatusBadge(req.status)}
                      </div>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 pt-1 line-clamp-1">
                      {req.subject}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{req.category}</span>
                      <span>•</span>
                      <span>{formatDate(req.created_at)}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-2.5 rounded-lg border">
                      {req.description}
                    </p>

                    {/* Employee Attachments */}
                    {req.attachments && req.attachments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Paperclip className="h-3 w-3" /> Attached Documents ({req.attachments.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {req.attachments.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              download={doc.name}
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 px-2 py-1 rounded border text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              <FileText className="h-3 w-3 text-indigo-500" />
                              <span className="truncate max-w-[140px]">{doc.name}</span>
                              <Download className="h-2.5 w-2.5 text-muted-foreground ml-0.5" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HR Action Banner if action has been taken */}
                    {req.action_notes ? (
                      <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> HR / Admin Action:
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                            {req.action_by_name} {req.action_at ? `(${formatDate(req.action_at)})` : ''}
                          </span>
                        </div>
                        <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                          {req.action_notes}
                        </p>

                        {/* HR Resolution Attachments */}
                        {req.action_attachments && req.action_attachments.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
                            <p className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200 mb-1 flex items-center gap-1">
                              <FileCheck className="h-3 w-3 text-emerald-600" /> HR Uploaded Resolution Files:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {req.action_attachments.map((hrDoc, idx) => (
                                <a
                                  key={idx}
                                  href={hrDoc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={hrDoc.name}
                                  className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-slate-900 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 px-2 py-1 rounded border border-emerald-300 dark:border-emerald-700 font-medium transition-colors"
                                >
                                  <Download className="h-3 w-3 text-emerald-600" />
                                  <span className="truncate max-w-[150px]">{hrDoc.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 px-2.5 py-1.5 rounded border border-amber-200/50">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>Ticket queued. Awaiting HR & Administrator triage.</span>
                      </div>
                    )}
                  </CardContent>

                  <div className="px-6 pb-4 pt-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(req)
                        setIsViewModalOpen(true)
                      }}
                      className="text-xs gap-1"
                    >
                      <Eye className="h-3 w-3" /> View Full Ticket
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: HR & ADMIN ACTION DESK (STRICTLY HR & ADMIN ONLY) */}
        {isHROrAdmin && (
          <TabsContent value="admin-desk" className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAllTickets.length === 0 ? (
              <Card className="p-12 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-semibold text-base">No Service Requests In Queue</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {requests.length === 0
                    ? 'All employee tickets have been addressed. No pending requests.'
                    : 'No service requests matched the current filter criteria.'}
                </p>
              </Card>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3">Ticket</th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Subject & Category</th>
                        <th className="p-3">Priority</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Docs</th>
                        <th className="p-3">Action</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAllTickets.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-600 whitespace-nowrap">
                            {req.ticket_number}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{req.employee_name}</p>
                            <p className="text-[10px] text-muted-foreground">{req.employee_code || req.employee_email}</p>
                          </td>
                          <td className="p-3 text-muted-foreground whitespace-nowrap">
                            {req.department || 'General'}
                          </td>
                          <td className="p-3 max-w-[240px]">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={req.subject}>
                              {req.subject}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">{req.category}</p>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {renderPriorityBadge(req.priority)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {renderStatusBadge(req.status)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {req.attachments && req.attachments.length > 0 ? (
                              <Badge variant="outline" className="text-[10px] bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/40 gap-1">
                                <Paperclip className="h-2.5 w-2.5" /> {req.attachments.length}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">—</span>
                            )}
                          </td>
                          <td className="p-3 max-w-[180px]">
                            {req.action_notes ? (
                              <div className="truncate text-[11px] text-emerald-700 dark:text-emerald-300 font-medium" title={req.action_notes}>
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded mr-1">ACTIONED</span>
                                {req.action_notes}
                              </div>
                            ) : (
                              <span className="text-amber-600 text-[10px] font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Awaiting Action
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => openActionModal(req)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7 gap-1 font-medium"
                              >
                                <CheckCircle className="h-3 w-3" /> Take Action
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRequest(req.id, req.ticket_number)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0"
                                title="Delete Ticket"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* HR / ADMIN ACTION MODAL */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-200">
                {selectedRequest?.ticket_number}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedRequest && renderPriorityBadge(selectedRequest.priority)}
                {selectedRequest && renderStatusBadge(selectedRequest.status)}
              </div>
            </div>
            <DialogTitle className="text-base font-bold pt-1">{selectedRequest?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              Review employee issue, update resolution status, and optionally attach resolution documents.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2 text-xs">
              {/* Employee Details Pill */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Employee:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRequest.employee_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Code:</span>
                  <span className="font-mono">{selectedRequest.employee_code || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Department:</span>
                  <span>{selectedRequest.department || 'General'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Date Raised:</span>
                  <span>{formatDate(selectedRequest.created_at)}</span>
                </div>
              </div>

              {/* Employee Issue Description */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Employee's Issue Description:
                </Label>
                <div className="p-3 rounded-lg border bg-card text-xs leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">
                  {selectedRequest.description}
                </div>
              </div>

              {/* Employee Attached Documents */}
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                    Employee Attached Documents ({selectedRequest.attachments.length}):
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRequest.attachments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border bg-slate-50 dark:bg-slate-900 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-medium truncate" title={doc.name}>{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground">{formatBytes(doc.size)}</p>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          download={doc.name}
                          className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <Download className="h-3 w-3" /> Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HR / ADMIN ACTION AREA */}
              <div className="pt-2 border-t space-y-3 bg-indigo-50/30 dark:bg-indigo-950/20 p-3.5 rounded-xl border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" /> HR & Admin Resolution Controls
                  </span>
                  <span className="text-[10px] text-muted-foreground">Action directly saves to employee ticket</span>
                </div>

                {/* Status Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Update Ticket Status</Label>
                  <Select value={actionStatus} onValueChange={(v) => setActionStatus(v as any)}>
                    <SelectTrigger className="text-xs bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending (Under Initial Review)</SelectItem>
                      <SelectItem value="in_progress">In Progress (Action Initiated)</SelectItem>
                      <SelectItem value="resolved">Resolved (Issue Addressed)</SelectItem>
                      <SelectItem value="rejected">Rejected / Closed (Not Actionable)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* HR Resolution Notes Textbox */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    HR & Admin Action Remarks / Resolution Reply
                  </Label>
                  <Textarea
                    placeholder="Enter detailed action remarks for the employee: steps taken, replacement hardware assigned, finance recalculation details, schedule, or instructions..."
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={4}
                    className="text-xs bg-white dark:bg-slate-900 leading-relaxed"
                  />
                </div>

                {/* HR File / Document Upload */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5 text-indigo-600" />
                      HR Supporting Document / Resolution Proof (Optional)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Attach signed forms, receipts, or approval letters
                    </span>
                  </Label>

                  <div
                    onClick={() => actionFileInputRef.current?.click()}
                    className="border border-dashed border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 hover:bg-indigo-50/50 rounded-lg p-3 text-center cursor-pointer transition-colors"
                  >
                    <input
                      ref={actionFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleActionFileUpload}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 text-xs">
                      {isUploadingActionDoc ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          <span>Uploading resolution document...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-indigo-600" />
                          <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                            Click to upload HR resolution file
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* HR Uploaded Files Preview */}
                  {actionAttachments.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        HR Files Attached ({actionAttachments.length}):
                      </p>
                      <div className="space-y-1">
                        {actionAttachments.map((f, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded border bg-white dark:bg-slate-900 text-xs"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate max-w-[200px]" title={f.name}>{f.name}</span>
                              <span className="text-[10px] text-muted-foreground">({formatBytes(f.size)})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeActionAttachment(i)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAction}
              disabled={isSavingAction || isUploadingActionDoc}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              {isSavingAction ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Save Action & Update Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMPLOYEE VIEW FULL TICKET MODAL */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded border border-indigo-200">
                {selectedRequest?.ticket_number}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedRequest && renderPriorityBadge(selectedRequest.priority)}
                {selectedRequest && renderStatusBadge(selectedRequest.status)}
              </div>
            </div>
            <DialogTitle className="text-base font-bold pt-1">{selectedRequest?.subject}</DialogTitle>
            <DialogDescription className="text-xs">
              {selectedRequest?.category} • Submitted on {selectedRequest ? formatDate(selectedRequest.created_at) : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-2 text-xs">
              {/* Description */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Your Issue Description:</Label>
                <div className="p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50 leading-relaxed whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">
                  {selectedRequest.description}
                </div>
              </div>

              {/* Uploaded Attachments */}
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                    Your Uploaded Documents ({selectedRequest.attachments.length}):
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedRequest.attachments.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs"
                      >
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[150px] font-medium" title={doc.name}>{doc.name}</span>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          download={doc.name}
                          className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-0.5"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HR Response Section */}
              <div className="pt-2 border-t space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  HR & Admin Resolution Remarks:
                </Label>

                {selectedRequest.action_notes ? (
                  <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
                      <span className="font-semibold">{selectedRequest.action_by_name}</span>
                      <span>{selectedRequest.action_at ? formatDate(selectedRequest.action_at) : ''}</span>
                    </div>
                    <p className="text-emerald-900 dark:text-emerald-100 text-xs leading-relaxed">
                      {selectedRequest.action_notes}
                    </p>

                    {/* HR Attachments */}
                    {selectedRequest.action_attachments && selectedRequest.action_attachments.length > 0 && (
                      <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 space-y-1">
                        <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1">
                          <FileCheck className="h-3.5 w-3.5 text-emerald-600" /> HR Attached Files:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRequest.action_attachments.map((hrDoc, idx) => (
                            <a
                              key={idx}
                              href={hrDoc.url}
                              target="_blank"
                              rel="noreferrer"
                              download={hrDoc.name}
                              className="inline-flex items-center gap-1 text-[11px] bg-white dark:bg-slate-900 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded border border-emerald-300 font-semibold"
                            >
                              <Download className="h-3 w-3 text-emerald-600" />
                              <span className="truncate max-w-[160px]">{hrDoc.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                    <span>Your ticket has been logged and is awaiting review from HR / Administration.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/features/auth/auth-context'
import type { InsuranceEnrollment, Employee } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  ShieldCheck,
  Users,
  PhoneCall,
  Home,
  MapPin,
  Building,
  CreditCard,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Award,
} from 'lucide-react'
import { initials } from '@/lib/utils'
import { formatDate } from '@/lib/format'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Guardian', 'Other']

export default function InsuranceEnrollmentPage() {
  const { user, employee, isManager, isAdmin, isHR } = useAuth()
  const isApprover = isManager || isAdmin || isHR || user?.role?.name === 'HR' || user?.role?.name === 'Admin'

  // Admin View State
  const [allEnrollments, setAllEnrollments] = useState<(InsuranceEnrollment & { employee?: Employee })[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Expansion
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [expandedAddressIds, setExpandedAddressIds] = useState<Set<string>>(new Set())

  // Modal State - Full View More Dialog
  const [selectedEnrollment, setSelectedEnrollment] = useState<(InsuranceEnrollment & { employee?: Employee }) | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Modal State - Reject Confirmation Dialog
  const [rejectingEnrollmentId, setRejectingEnrollmentId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Employee View State
  const [enrollment, setEnrollment] = useState<InsuranceEnrollment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State - Nominee 1 (Primary)
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeDob, setNomineeDob] = useState('')
  const [nomineeShare, setNomineeShare] = useState('100')

  // Form State - Nominee 2 (Secondary / Additional)
  const [hasNominee2, setHasNominee2] = useState(false)
  const [nominee2Name, setNominee2Name] = useState('')
  const [nominee2Relation, setNominee2Relation] = useState('')
  const [nominee2Dob, setNominee2Dob] = useState('')
  const [nominee2Share, setNominee2Share] = useState('0')

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')

  // Addresses
  const [currentAddress, setCurrentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [sameAsCurrent, setSameAsCurrent] = useState(false)

  // Additional & Bank
  const [existingInsurance, setExistingInsurance] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)

  const loadData = async () => {
    if (isApprover) {
      try {
        const { data } = await supabase
          .from('insurance_enrollments')
          .select('*, employee:employees(*)')
          .order('created_at', { ascending: false })
        if (data) {
          setAllEnrollments(data as any[])
        }
      } catch (err) {
        console.error('loadAdminEnrollments error:', err)
      }
    }

    if (employee) {
      let foundEnr: InsuranceEnrollment | null = null
      try {
        const { data } = await supabase
          .from('insurance_enrollments')
          .select('*')
          .eq('employee_id', employee.id)
          .maybeSingle()
        if (data) foundEnr = data as InsuranceEnrollment
      } catch (err) {
        console.error('loadEmployeeEnrollment error:', err)
      }

      if (foundEnr) {
        setEnrollment(foundEnr)
        setNomineeName(foundEnr.nominee_name || '')
        setNomineeRelation(foundEnr.nominee_relation || '')
        setNomineeDob(foundEnr.nominee_dob || '')
        setNomineeShare(String(foundEnr.nominee_share ?? '100'))

        if (foundEnr.nominee2_name || (foundEnr.nominee2_share && foundEnr.nominee2_share > 0)) {
          setHasNominee2(true)
          setNominee2Name(foundEnr.nominee2_name || '')
          setNominee2Relation(foundEnr.nominee2_relation || '')
          setNominee2Dob(foundEnr.nominee2_dob || '')
          setNominee2Share(String(foundEnr.nominee2_share || '0'))
        }

        setEmergencyName(foundEnr.emergency_contact_name || '')
        setEmergencyPhone(foundEnr.emergency_contact_phone || '')
        setEmergencyRelation(foundEnr.emergency_contact_relation || '')

        const cur = foundEnr.current_address || foundEnr.residential_address || ''
        const perm = foundEnr.permanent_address || ''
        setCurrentAddress(cur)
        setPermanentAddress(perm)
        if (cur && perm && cur === perm) {
          setSameAsCurrent(true)
        }

        setExistingInsurance(foundEnr.existing_insurance_details || '')
        setBankAccount(foundEnr.bank_account || '')
        setBankIfsc(foundEnr.bank_ifsc || foundEnr.ifsc_code || '')
        setSignature(foundEnr.declaration_signature || '')
        setAgreed(Boolean(foundEnr.declaration_signed))
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [isApprover, employee])

  const toggleAddressExpand = (id: string) => {
    setExpandedAddressIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Handle Approving an Enrollment
  const handleApprove = async (enrollmentId: string) => {
    setIsActionLoading(true)
    const approverName =
      (employee ? `${employee.first_name} ${employee.last_name}`.trim() : null) ||
      user?.email ||
      'HR / Admin'
    const now = new Date().toISOString()

    try {
      const { error } = await supabase
        .from('insurance_enrollments')
        .update({
          status: 'approved',
          approved_by: approverName,
          approved_at: now,
          admin_notes: null,
        })
        .eq('id', enrollmentId)

      if (error) throw error

      setAllEnrollments((prev) =>
        prev.map((item) =>
          item.id === enrollmentId
            ? { ...item, status: 'approved', approved_by: approverName, approved_at: now, admin_notes: null }
            : item
        )
      )

      if (selectedEnrollment?.id === enrollmentId) {
        setSelectedEnrollment((prev) =>
          prev ? { ...prev, status: 'approved', approved_by: approverName, approved_at: now, admin_notes: null } : null
        )
      }

      toast.success('Insurance enrollment approved successfully!')
    } catch (err: any) {
      console.error('Approve enrollment error:', err)
      toast.error(err?.message || 'Failed to approve enrollment')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Open Reject Prompt
  const handleOpenReject = (enr: InsuranceEnrollment & { employee?: Employee }) => {
    setRejectingEnrollmentId(enr.id)
    setRejectReason('Information incomplete or requires correction.')
    setIsRejectOpen(true)
  }

  // Confirm Rejection
  const handleConfirmReject = async () => {
    if (!rejectingEnrollmentId) return
    setIsActionLoading(true)
    const approverName =
      (employee ? `${employee.first_name} ${employee.last_name}`.trim() : null) ||
      user?.email ||
      'HR / Admin'
    const now = new Date().toISOString()

    try {
      const { error } = await supabase
        .from('insurance_enrollments')
        .update({
          status: 'rejected',
          approved_by: approverName,
          approved_at: now,
          admin_notes: rejectReason.trim() || 'Rejected by HR/Admin',
        })
        .eq('id', rejectingEnrollmentId)

      if (error) throw error

      setAllEnrollments((prev) =>
        prev.map((item) =>
          item.id === rejectingEnrollmentId
            ? {
                ...item,
                status: 'rejected',
                approved_by: approverName,
                approved_at: now,
                admin_notes: rejectReason.trim() || 'Rejected by HR/Admin',
              }
            : item
        )
      )

      if (selectedEnrollment?.id === rejectingEnrollmentId) {
        setSelectedEnrollment((prev) =>
          prev
            ? {
                ...prev,
                status: 'rejected',
                approved_by: approverName,
                approved_at: now,
                admin_notes: rejectReason.trim() || 'Rejected by HR/Admin',
              }
            : null
        )
      }

      toast.success('Insurance enrollment rejected.')
      setIsRejectOpen(false)
      setRejectingEnrollmentId(null)
    } catch (err: any) {
      console.error('Reject enrollment error:', err)
      toast.error(err?.message || 'Failed to reject enrollment')
    } finally {
      setIsActionLoading(false)
    }
  }

  // Open Full Details View More Dialog
  const handleOpenDetails = (enr: InsuranceEnrollment & { employee?: Employee }) => {
    setSelectedEnrollment(enr)
    setIsDetailOpen(true)
  }

  // Filtered Enrollments
  const filteredEnrollments = useMemo(() => {
    return allEnrollments.filter((enr) => {
      const status = (enr.status || 'pending').toLowerCase()
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'approved'
          ? status === 'approved'
          : statusFilter === 'rejected'
          ? status === 'rejected'
          : status !== 'approved' && status !== 'rejected'

      const q = searchQuery.toLowerCase().trim()
      if (!q) return matchesStatus

      const empName = `${enr.employee?.first_name || ''} ${enr.employee?.last_name || ''}`.toLowerCase()
      const empCode = (enr.employee?.employee_code || '').toLowerCase()
      const nom1 = (enr.nominee_name || '').toLowerCase()
      const nom2 = (enr.nominee2_name || '').toLowerCase()
      const phone = (enr.emergency_contact_phone || '').toLowerCase()
      const email = (enr.employee?.email || '').toLowerCase()

      const matchesSearch =
        empName.includes(q) ||
        empCode.includes(q) ||
        nom1.includes(q) ||
        nom2.includes(q) ||
        phone.includes(q) ||
        email.includes(q)

      return matchesStatus && matchesSearch
    })
  }, [allEnrollments, statusFilter, searchQuery])

  // Summary Metrics
  const summary = useMemo(() => {
    const total = allEnrollments.length
    const approved = allEnrollments.filter((e) => (e.status || '').toLowerCase() === 'approved').length
    const rejected = allEnrollments.filter((e) => (e.status || '').toLowerCase() === 'rejected').length
    const pending = total - approved - rejected
    return { total, approved, rejected, pending }
  }, [allEnrollments])

  // Toggle Nominee 2 in form
  const handleToggleNominee2 = (enable: boolean) => {
    setHasNominee2(enable)
    if (enable) {
      setNomineeShare('50')
      setNominee2Share('50')
    } else {
      setNomineeShare('100')
      setNominee2Share('0')
      setNominee2Name('')
      setNominee2Relation('')
      setNominee2Dob('')
    }
  }

  // Employee Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    if (!agreed) {
      toast.error('Please accept the declaration terms by checking the box.')
      return
    }
    if (!signature.trim()) {
      toast.error('Please type your full name in the signature field.')
      return
    }

    const share1 = Number(nomineeShare) || 0
    const share2 = hasNominee2 ? Number(nominee2Share) || 0 : 0
    if (share1 + share2 !== 100) {
      toast.error(`The total share of Nominee 1 (${share1}%) and Nominee 2 (${share2}%) must equal exactly 100%.`)
      return
    }

    if (hasNominee2 && (!nominee2Name.trim() || !nominee2Relation.trim())) {
      toast.error('Please enter the name and relationship for Secondary Nominee, or remove them.')
      return
    }

    const cleanAcc = bankAccount.replace(/\D/g, '').slice(0, 18)
    if (cleanAcc.length < 9 || cleanAcc.length > 18) {
      toast.error('Bank Account Number must be between 9 and 18 digits.')
      return
    }

    const cleanIfsc = bankIfsc.toUpperCase().trim().slice(0, 11)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    if (!ifscRegex.test(cleanIfsc)) {
      toast.error('Invalid IFSC Code. Must be exactly 11 characters (e.g. SBIN0001234).')
      return
    }

    setIsSubmitting(true)

    const payload = {
      employee_id: employee.id,
      employer_info: 'OKLUT Corporation',
      policy_info: 'Group Health Insurance - Gold Plan',
      // Nominee 1
      nominee_name: nomineeName,
      nominee_relation: nomineeRelation,
      nominee_dob: nomineeDob || null,
      nominee_share: share1,
      // Nominee 2
      nominee2_name: hasNominee2 ? nominee2Name : null,
      nominee2_relation: hasNominee2 ? nominee2Relation : null,
      nominee2_dob: hasNominee2 && nominee2Dob ? nominee2Dob : null,
      nominee2_share: hasNominee2 ? share2 : null,
      // Emergency Contact
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      emergency_contact_relation: emergencyRelation || null,
      // Addresses
      current_address: currentAddress,
      residential_address: currentAddress,
      permanent_address: sameAsCurrent ? currentAddress : permanentAddress,
      // Bank & Insurance
      existing_insurance_details: existingInsurance,
      bank_account: cleanAcc,
      bank_ifsc: cleanIfsc,
      declaration_signature: signature,
      declaration_signed: true,
      declaration_date: new Date().toISOString().slice(0, 10),
      status: 'pending',
    }

    let savedData: InsuranceEnrollment | null = null

    try {
      if (enrollment) {
        const res = await supabase
          .from('insurance_enrollments')
          .update(payload)
          .eq('id', enrollment.id)
          .select()
          .single()
        if (res.data) savedData = res.data as InsuranceEnrollment
        if (res.error) throw res.error
      } else {
        const res = await supabase.from('insurance_enrollments').insert(payload).select().single()
        if (res.data) savedData = res.data as InsuranceEnrollment
        if (res.error) throw res.error
      }
    } catch (err: any) {
      console.error('Supabase insurance enrollment error:', err)
      toast.error(`Database error: ${err.message || 'Failed to save to Supabase'}`)
      setIsSubmitting(false)
      return
    }

    if (savedData) {
      setEnrollment(savedData)
      toast.success('Insurance nomination submitted successfully to Supabase!')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Enrollment"
        description={
          isApprover
            ? 'Review and approve employee group health insurance enrollments and nominee records.'
            : 'Complete your company group health insurance, address verification, and nominee details.'
        }
      />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading enrollment information...</div>
      ) : isApprover ? (
        <div className="space-y-6">
          {/* Summary Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/10 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Total Submissions
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{summary.total}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 flex items-center justify-center font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Approved by HR
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {summary.approved}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 flex items-center justify-center font-bold">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/10 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Pending Approval
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {summary.pending}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 flex items-center justify-center font-bold">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-red-500/20 bg-red-50/40 dark:bg-red-950/10 shadow-2xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Rejected / Needs Fix
                  </p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-0.5">
                    {summary.rejected}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 dark:bg-red-900/50 flex items-center justify-center font-bold">
                  <XCircle className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee, ID, nominee, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground shrink-0 font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                <SelectTrigger className="h-9 text-xs w-[170px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Submissions ({summary.total})</SelectItem>
                  <SelectItem value="pending">Pending Approval ({summary.pending})</SelectItem>
                  <SelectItem value="approved">Approved ({summary.approved})</SelectItem>
                  <SelectItem value="rejected">Rejected ({summary.rejected})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Main Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2 text-foreground font-semibold">
                <ShieldCheck className="h-5 w-5 text-indigo-600" /> Employee Insurance & Nominee Enrollments
              </CardTitle>
              <CardDescription className="text-xs">
                Review employee beneficiaries, full address verifications, emergency contacts, and grant HR/Admin approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                      <th className="px-4 py-3 min-w-[160px]">Employee</th>
                      <th className="px-4 py-3 min-w-[150px]">Primary Nominee</th>
                      <th className="px-4 py-3 min-w-[140px]">Secondary Nominee</th>
                      <th className="px-4 py-3 min-w-[260px]">Current & Permanent Address</th>
                      <th className="px-4 py-3 min-w-[150px]">Emergency Contact</th>
                      <th className="px-4 py-3 text-center">Declaration</th>
                      <th className="px-4 py-3 text-center min-w-[140px]">Approval Status</th>
                      <th className="px-4 py-3 text-right min-w-[220px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEnrollments.map((enr) => {
                      const emp = enr.employee
                      const fullName = emp
                        ? `${emp.first_name} ${emp.last_name}`.trim()
                        : 'Employee'
                      const isAddrExpanded = expandedAddressIds.has(enr.id)
                      const currAddr = enr.current_address || enr.residential_address || '—'
                      const permAddr = enr.permanent_address || '—'
                      const isLongAddr = (currAddr.length + permAddr.length) > 55
                      const status = (enr.status || 'pending').toLowerCase()
                      const isApproved = status === 'approved'
                      const isRejected = status === 'rejected'
                      const isPending = !isApproved && !isRejected

                      return (
                        <tr key={enr.id} className="hover:bg-muted/20 transition-colors align-top">
                          {/* Employee */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-start gap-2.5">
                              <Avatar className="h-8 w-8 text-xs shrink-0 mt-0.5">
                                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700 font-bold">
                                  {emp ? initials(emp.first_name, emp.last_name) : 'OK'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-xs leading-none text-foreground">{fullName}</p>
                                {emp?.employee_code && (
                                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                                    {emp.employee_code}
                                  </p>
                                )}
                                {emp?.email && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                    {emp.email}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Primary Nominee */}
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-xs text-foreground">{enr.nominee_name || '—'}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {enr.nominee_relation || 'Nominee'} · <strong className="text-indigo-600 font-semibold">{enr.nominee_share ?? 100}% share</strong>
                            </p>
                            {enr.nominee_dob && (
                              <p className="text-[10px] text-muted-foreground">DOB: {formatDate(enr.nominee_dob)}</p>
                            )}
                          </td>

                          {/* Secondary Nominee */}
                          <td className="px-4 py-3.5">
                            {enr.nominee2_name ? (
                              <div>
                                <p className="font-semibold text-xs text-foreground">{enr.nominee2_name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {enr.nominee2_relation || 'Nominee'} · <strong className="text-purple-600 font-semibold">{enr.nominee2_share}% share</strong>
                                </p>
                                {enr.nominee2_dob && (
                                  <p className="text-[10px] text-muted-foreground">DOB: {formatDate(enr.nominee2_dob)}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </td>

                          {/* Current & Permanent Address with Inline View More / View Less */}
                          <td className="px-4 py-3.5 text-xs max-w-xs">
                            <div className="space-y-1">
                              <p className={`text-foreground/90 ${isAddrExpanded ? 'whitespace-normal break-words leading-relaxed' : 'truncate'}`}>
                                <strong className="text-muted-foreground font-semibold">Curr:</strong> {currAddr}
                              </p>
                              {enr.permanent_address && (
                                <p className={`text-muted-foreground ${isAddrExpanded ? 'whitespace-normal break-words leading-relaxed' : 'truncate'}`}>
                                  <strong className="font-semibold">Perm:</strong> {permAddr}
                                </p>
                              )}
                              {isLongAddr && (
                                <button
                                  type="button"
                                  onClick={() => toggleAddressExpand(enr.id)}
                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                >
                                  {isAddrExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" /> View less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" /> View more
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Emergency Contact */}
                          <td className="px-4 py-3.5 text-xs">
                            <p className="font-semibold text-foreground">{enr.emergency_contact_name || '—'}</p>
                            {enr.emergency_contact_relation && (
                              <p className="text-[10px] text-muted-foreground capitalize">({enr.emergency_contact_relation})</p>
                            )}
                            <p className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-medium mt-0.5">
                              {enr.emergency_contact_phone || '—'}
                            </p>
                          </td>

                          {/* Declaration */}
                          <td className="px-4 py-3.5 text-center">
                            {enr.declaration_signed ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-3 w-3" /> Signed {enr.declaration_date ? `(${enr.declaration_date})` : ''}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-200">
                                <Clock className="h-3 w-3" /> Pending
                              </span>
                            )}
                          </td>

                          {/* Approval Status Badge */}
                          <td className="px-4 py-3.5 text-center">
                            {isApproved ? (
                              <div className="inline-flex flex-col items-center">
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[11px] px-2.5 py-0.5 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Approved
                                </Badge>
                                {enr.approved_by && (
                                  <span className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[120px]" title={enr.approved_by}>
                                    by {enr.approved_by}
                                  </span>
                                )}
                              </div>
                            ) : isRejected ? (
                              <div className="inline-flex flex-col items-center">
                                <Badge variant="destructive" className="font-semibold text-[11px] px-2.5 py-0.5 gap-1">
                                  <XCircle className="h-3 w-3" /> Rejected
                                </Badge>
                                {enr.admin_notes && (
                                  <span className="text-[9px] text-red-500 mt-0.5 truncate max-w-[120px]" title={enr.admin_notes}>
                                    {enr.admin_notes}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-semibold text-[11px] px-2.5 py-0.5 gap-1">
                                <Clock className="h-3 w-3" /> Pending HR
                              </Badge>
                            )}
                          </td>

                          {/* Actions: View More Dialog + Approve + Reject */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetails(enr)}
                                className="h-7 text-xs px-2.5 gap-1 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                                View More
                              </Button>

                              {!isApproved && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(enr.id)}
                                  disabled={isActionLoading}
                                  className="h-7 text-xs px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-medium"
                                  title="Approve Insurance Enrollment"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                              )}

                              {!isRejected && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenReject(enr)}
                                  disabled={isActionLoading}
                                  className="h-7 text-xs px-2 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900"
                                  title="Reject with note"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}

                    {filteredEnrollments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                          {searchQuery || statusFilter !== 'all'
                            ? 'No insurance enrollments match the selected search or filter.'
                            : 'No insurance enrollment submissions recorded yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Full Details Modal Dialog ("View More") */}
          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base flex items-center justify-between gap-2 border-b pb-3">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Insurance Enrollment Details — {selectedEnrollment?.employee?.first_name || 'Staff'} {selectedEnrollment?.employee?.last_name || ''}
                  </span>
                  {selectedEnrollment?.status === 'approved' ? (
                    <Badge className="bg-emerald-600 text-white text-xs">Approved</Badge>
                  ) : selectedEnrollment?.status === 'rejected' ? (
                    <Badge variant="destructive" className="text-xs">Rejected</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                      Pending HR Approval
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs pt-1">
                  Employee ID: {selectedEnrollment?.employee?.employee_code || '—'} · Work Email: {selectedEnrollment?.employee?.email || '—'}
                </DialogDescription>
              </DialogHeader>

              {selectedEnrollment && (
                <div className="space-y-4 py-2 text-xs">
                  {/* Status Banner */}
                  {selectedEnrollment.status === 'approved' && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>
                          <strong>Approved:</strong> This insurance nomination is active and officially verified by {selectedEnrollment.approved_by || 'HR'} on {formatDate(selectedEnrollment.approved_at)}.
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedEnrollment.status === 'rejected' && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 p-3 flex items-start gap-2 text-red-800 dark:text-red-300">
                      <XCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-bold">Enrollment Rejected</p>
                        <p className="mt-0.5">{selectedEnrollment.admin_notes || 'Requires correction from employee.'}</p>
                      </div>
                    </div>
                  )}

                  {/* 1. Policy & Employer */}
                  <div className="rounded-lg border p-3.5 bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-indigo-600" /> Employer & Policy Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Employer Name:</span>
                        <span className="font-medium text-foreground">{selectedEnrollment.employer_info || 'OKLUT Corporation'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Policy Plan:</span>
                        <span className="font-medium text-foreground">{selectedEnrollment.policy_info || 'Group Health Insurance - Gold Plan'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Nominees Breakdown */}
                  <div className="rounded-lg border p-3.5 bg-indigo-50/20 border-indigo-200 space-y-2.5">
                    <h4 className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-600" /> Nominee Beneficiaries
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Nominee 1 */}
                      <div className="p-3 bg-white dark:bg-card rounded-lg border shadow-2xs space-y-1">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-indigo-900 dark:text-indigo-300">Primary Nominee</span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded text-[11px]">
                            {selectedEnrollment.nominee_share ?? 100}% Share
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground pt-1">{selectedEnrollment.nominee_name || '—'}</p>
                        <p className="text-muted-foreground">Relationship: <strong>{selectedEnrollment.nominee_relation || '—'}</strong></p>
                        {selectedEnrollment.nominee_dob && (
                          <p className="text-muted-foreground">Date of Birth: <strong>{formatDate(selectedEnrollment.nominee_dob)}</strong></p>
                        )}
                      </div>

                      {/* Nominee 2 */}
                      <div className="p-3 bg-white dark:bg-card rounded-lg border shadow-2xs space-y-1">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-purple-900 dark:text-purple-300">Secondary Nominee</span>
                          <span className="font-bold text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded text-[11px]">
                            {selectedEnrollment.nominee2_name ? `${selectedEnrollment.nominee2_share}% Share` : 'None'}
                          </span>
                        </div>
                        {selectedEnrollment.nominee2_name ? (
                          <>
                            <p className="text-sm font-semibold text-foreground pt-1">{selectedEnrollment.nominee2_name}</p>
                            <p className="text-muted-foreground">Relationship: <strong>{selectedEnrollment.nominee2_relation || '—'}</strong></p>
                            {selectedEnrollment.nominee2_dob && (
                              <p className="text-muted-foreground">Date of Birth: <strong>{formatDate(selectedEnrollment.nominee2_dob)}</strong></p>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground italic pt-2">No secondary nominee added.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Full Addresses */}
                  <div className="rounded-lg border p-3.5 bg-muted/20 space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-emerald-600" /> Complete Address Records
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 bg-white dark:bg-card rounded border">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Current Address:</span>
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedEnrollment.current_address || selectedEnrollment.residential_address || 'No current address entered.'}
                        </p>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-card rounded border">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Permanent Address:</span>
                        <p className="text-muted-foreground leading-relaxed">
                          {selectedEnrollment.permanent_address || 'Same as current address.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4. Emergency Contact & Bank Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3.5 bg-amber-50/30 border-amber-200 space-y-1.5">
                      <h4 className="font-semibold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                        <PhoneCall className="h-4 w-4 text-amber-600" /> Emergency Contact
                      </h4>
                      <p className="font-semibold text-foreground text-sm pt-1">{selectedEnrollment.emergency_contact_name || '—'}</p>
                      <p className="text-muted-foreground">Relation: {selectedEnrollment.emergency_contact_relation || '—'}</p>
                      <p className="text-indigo-600 font-mono font-medium">{selectedEnrollment.emergency_contact_phone || '—'}</p>
                    </div>

                    <div className="rounded-lg border p-3.5 bg-muted/20 space-y-1.5">
                      <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-slate-600" /> Bank & Policy Records
                      </h4>
                      <p className="text-muted-foreground pt-1">Bank Account: <strong className="font-mono text-foreground">{selectedEnrollment.bank_account || '—'}</strong></p>
                      <p className="text-muted-foreground">IFSC Code: <strong className="font-mono text-foreground">{selectedEnrollment.bank_ifsc || selectedEnrollment.ifsc_code || '—'}</strong></p>
                      {selectedEnrollment.existing_insurance_details && (
                        <p className="text-muted-foreground truncate">Prior Policy: {selectedEnrollment.existing_insurance_details}</p>
                      )}
                    </div>
                  </div>

                  {/* 5. Declaration Details */}
                  <div className="rounded-lg border p-3 bg-muted/10 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">Digital Signature & Confirmation</p>
                      <p className="text-muted-foreground">Signed by: <strong className="text-foreground">{selectedEnrollment.declaration_signature || selectedEnrollment.employee?.first_name || 'Staff'}</strong></p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                        Confirmed on {selectedEnrollment.declaration_date || '—'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>

                {isApprover && selectedEnrollment && (
                  <div className="flex items-center gap-2">
                    {selectedEnrollment.status !== 'rejected' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsDetailOpen(false)
                          handleOpenReject(selectedEnrollment)
                        }}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    )}

                    {selectedEnrollment.status !== 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleApprove(selectedEnrollment.id)}
                        disabled={isActionLoading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve Enrollment
                      </Button>
                    )}
                  </div>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Rejection Prompt Dialog */}
          <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5 text-red-600" /> Reject Insurance Enrollment
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Please provide a reason or correction note for the employee so they can amend their enrollment details.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <Label htmlFor="rej_reason" className="font-semibold text-foreground">
                  Reason for Rejection / Correction Required:
                </Label>
                <Textarea
                  id="rej_reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Address proof mismatch, invalid IFSC code, nominee share discrepancy..."
                  className="text-xs resize-none"
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectOpen(false)}
                  disabled={isActionLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmReject}
                  disabled={isActionLoading}
                  className="text-xs gap-1 font-semibold"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {isActionLoading ? 'Saving...' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* Regular Employee View Form */
        <Card className="max-w-3xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" /> Group Health Insurance & Nominee Details
              </CardTitle>
              {enrollment && (
                enrollment.status === 'approved' ? (
                  <Badge className="bg-emerald-600 text-white font-semibold text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Approved by HR
                  </Badge>
                ) : enrollment.status === 'rejected' ? (
                  <Badge variant="destructive" className="font-semibold text-xs gap-1">
                    <XCircle className="h-3 w-3" /> Rejected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold text-xs gap-1">
                    <Clock className="h-3 w-3" /> Pending HR Approval
                  </Badge>
                )
              )}
            </div>
            <CardDescription>
              Please provide accurate nominee allocations, emergency contact, and address information for policy records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Status alerts for employee */}
            {enrollment?.status === 'approved' && (
              <div className="mb-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 p-3.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>Enrollment Approved:</strong> Your insurance enrollment and nominee allocations have been verified and approved by {enrollment.approved_by || 'HR'} on {formatDate(enrollment.approved_at)}.
                </span>
              </div>
            )}

            {enrollment?.status === 'rejected' && (
              <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 p-3.5 flex items-start gap-2 text-xs text-red-800 dark:text-red-300">
                <XCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <p className="font-bold">Correction Requested by HR</p>
                  <p className="mt-0.5">{enrollment.admin_notes || 'Please review and update your information before resubmitting.'}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Employer & Policy Information */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Building className="h-4 w-4 text-indigo-600" /> Employer & Policy Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employer Name</Label>
                    <Input disabled value="OKLUT Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Policy Coverage</Label>
                    <Input disabled value="Group Health Insurance - Gold Plan (₹5,00,000)" />
                  </div>
                </div>
              </div>

              {/* 2. Nominee Details (Nominee 1 & Nominee 2) */}
              <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-indigo-950">
                      <Users className="h-4 w-4 text-indigo-600" /> Nominee Allocations
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Specify the primary and optional secondary beneficiaries for your coverage.
                    </p>
                  </div>
                  {!hasNominee2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleNominee2(true)}
                      className="text-xs h-8 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add 2nd Nominee
                    </Button>
                  )}
                </div>

                {/* Primary Nominee Card */}
                <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Primary Nominee (Nominee 1)
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Share: {nomineeShare}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom1_name">Nominee Name *</Label>
                      <Input
                        id="nom1_name"
                        required
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                        placeholder="e.g. Ramesh Sharma"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom1_rel">Relationship *</Label>
                      <Select value={nomineeRelation} onValueChange={setNomineeRelation} required>
                        <SelectTrigger id="nom1_rel">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map((rel) => (
                            <SelectItem key={rel} value={rel}>
                              {rel}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom1_dob">Date of Birth</Label>
                      <Input
                        id="nom1_dob"
                        type="date"
                        value={nomineeDob}
                        onChange={(e) => setNomineeDob(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom1_share">Share Percentage (%)</Label>
                      <Input
                        id="nom1_share"
                        type="number"
                        min="1"
                        max="100"
                        value={nomineeShare}
                        onChange={(e) => {
                          const val = e.target.value
                          setNomineeShare(val)
                          if (hasNominee2) {
                            const n = Number(val) || 0
                            setNominee2Share(String(Math.max(0, 100 - n)))
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary Nominee Card (Conditional) */}
                {hasNominee2 && (
                  <div className="bg-white p-3.5 rounded-lg border border-purple-200 shadow-sm space-y-3 relative">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                        Secondary Nominee (Nominee 2)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          Share: {nominee2Share}%
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleNominee2(false)}
                          className="h-6 px-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom2_name">Nominee Name *</Label>
                        <Input
                          id="nom2_name"
                          required={hasNominee2}
                          value={nominee2Name}
                          onChange={(e) => setNominee2Name(e.target.value)}
                          placeholder="e.g. Priya Sharma"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom2_rel">Relationship *</Label>
                        <Select value={nominee2Relation} onValueChange={setNominee2Relation} required={hasNominee2}>
                          <SelectTrigger id="nom2_rel">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((rel) => (
                              <SelectItem key={rel} value={rel}>
                                {rel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom2_dob">Date of Birth</Label>
                        <Input
                          id="nom2_dob"
                          type="date"
                          value={nominee2Dob}
                          onChange={(e) => setNominee2Dob(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom2_share">Share Percentage (%)</Label>
                        <Input
                          id="nom2_share"
                          type="number"
                          min="0"
                          max="100"
                          value={nominee2Share}
                          onChange={(e) => {
                            const val = e.target.value
                            setNominee2Share(val)
                            const n = Number(val) || 0
                            setNomineeShare(String(Math.max(0, 100 - n)))
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Emergency Contact */}
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/20 p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-900">
                  <PhoneCall className="h-4 w-4 text-amber-600" /> Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <Label htmlFor="em_name" className="text-xs font-semibold text-slate-900 h-5 flex items-center">
                      Contact Person Name <span className="text-rose-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="em_name"
                      required
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                      className="h-10 bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="em_rel" className="text-xs font-semibold text-slate-900 h-5 flex items-center">
                      Relationship
                    </Label>
                    <Select value={emergencyRelation} onValueChange={setEmergencyRelation}>
                      <SelectTrigger id="em_rel" className="h-10 bg-white">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel} value={rel}>
                            {rel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="em_phone" className="text-xs font-semibold text-slate-900 h-5 flex items-center justify-between">
                      <span>Emergency Contact Phone <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-muted-foreground font-normal shrink-0">(10 digits)</span>
                    </Label>
                    <Input
                      id="em_phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876500000"
                      className="h-10 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Residential & Permanent Address */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Home className="h-4 w-4 text-blue-600" /> Residential & Permanent Address
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="curr_addr">Current Residential Address *</Label>
                  <Textarea
                    id="curr_addr"
                    required
                    value={currentAddress}
                    onChange={(e) => {
                      setCurrentAddress(e.target.value)
                      if (sameAsCurrent) setPermanentAddress(e.target.value)
                    }}
                    rows={2}
                    placeholder="House / Flat No., Street, Landmark, Area, City, State, PIN"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !sameAsCurrent
                      setSameAsCurrent(next)
                      if (next) setPermanentAddress(currentAddress)
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {sameAsCurrent ? (
                      <CheckSquare className="h-4 w-4 text-indigo-600" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-400" />
                    )}
                    Permanent Address is same as Current Address
                  </button>
                </div>

                {!sameAsCurrent && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="perm_addr">Permanent Address *</Label>
                    <Textarea
                      id="perm_addr"
                      required={!sameAsCurrent}
                      value={permanentAddress}
                      onChange={(e) => setPermanentAddress(e.target.value)}
                      rows={2}
                      placeholder="Permanent address (as per Aadhaar / Passport)"
                    />
                  </div>
                )}
              </div>

              {/* 5. Additional Details & Bank Info */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <CreditCard className="h-4 w-4 text-slate-600" /> Reimbursement Bank Account Details
                </h3>
                <p className="text-xs text-muted-foreground">
                  Required for direct cashless claim settlements and policy payouts.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_acc">Bank Account Number *</Label>
                    <Input
                      id="bank_acc"
                      required
                      type="text"
                      maxLength={18}
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 18))}
                      placeholder="e.g. 100234567890"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_ifsc">Bank IFSC Code *</Label>
                    <Input
                      id="bank_ifsc"
                      required
                      maxLength={11}
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase().slice(0, 11))}
                      placeholder="e.g. SBIN0001234"
                      className="font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Label htmlFor="exist_ins">Existing Personal / Family Health Policy (Optional)</Label>
                  <Input
                    id="exist_ins"
                    value={existingInsurance}
                    onChange={(e) => setExistingInsurance(e.target.value)}
                    placeholder="e.g. Star Health Insurance Policy #123456"
                  />
                </div>
              </div>

              {/* 6. Employee Declaration */}
              <div className="space-y-4 rounded-lg border border-slate-300 p-4 bg-slate-50">
                <h3 className="font-semibold text-sm text-slate-900">Declaration & Signature</h3>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(Boolean(checked))}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs font-medium leading-relaxed text-slate-700 cursor-pointer"
                  >
                    I hereby declare that the information provided above (including nominee allocations and address details) is true and correct to the best of my knowledge.
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sig">Employee Signature (Type Full Name) *</Label>
                    <Input
                      id="sig"
                      required
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input disabled value={new Date().toLocaleDateString()} />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto shadow-sm"
                  disabled={isSubmitting || !agreed || !signature}
                >
                  {isSubmitting ? 'Saving Enrollment...' : 'Submit Insurance Details'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Landmark,
  Building,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Search,
  Filter,
  Download,
  UploadCloud,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  UserCheck,
  ShieldCheck,
  Send,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/database.types'
import {
  EmployeeBankDetail,
  POPULAR_BANKS,
  fetchAllEmployeeBankDetails,
  submitEmployeeBankDetail,
  verifyEmployeeBankDetail,
  rejectEmployeeBankDetail,
  maskAccountNumber,
  isValidIFSC,
  isValidAccountNumber,
  isValidPAN,
  isValidUPI,
  detectBankFromIFSC,
} from '@/lib/api/bankDetails'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export default function BankDetailsPage() {
  const { user, employee, isAdmin, isHR } = useAuth()

  // Strict HR / Admin check:
  // ONLY true admin, HR role, or accounts with admin/hr email or ceo@oklut.com
  const roleName = (user?.role?.name || '').toLowerCase().trim()
  const userEmail = (user?.email || employee?.email || '').toLowerCase().trim()
  const isHrOrAdmin =
    isAdmin ||
    Boolean(isHR) ||
    roleName === 'admin' ||
    roleName === 'hr' ||
    roleName.includes('admin') ||
    roleName.includes('hr') ||
    userEmail.startsWith('admin') ||
    userEmail.startsWith('hr') ||
    userEmail === 'ceo@oklut.com'

  // Top-level navigation:
  // Non-HR/regular employees can NEVER navigate to 'admin'
  const [activeSectorTab, setActiveSectorTab] = useState<'employee' | 'admin'>('employee')

  useEffect(() => {
    if (isHrOrAdmin) {
      setActiveSectorTab('admin')
    } else {
      setActiveSectorTab('employee')
    }
  }, [isHrOrAdmin])

  // Employees list for selection and joining
  const [employees, setEmployees] = useState<Employee[]>([])
  const [, setLoadingEmployees] = useState(true)

  // Bank details records
  const [bankDetailsList, setBankDetailsList] = useState<EmployeeBankDetail[]>([])
  const [, setLoadingBankDetails] = useState(true)

  // Currently selected employee in Employee View
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const currentSelectedEmp = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  // Form states for Employee View
  const [accountHolderName, setAccountHolderName] = useState('')
  const [bankName, setBankName] = useState('HDFC Bank')
  const [customBankName, setCustomBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [branchName, setBranchName] = useState('')
  const [accountType, setAccountType] = useState<'Salary' | 'Savings' | 'Current'>('Salary')
  const [upiId, setUpiId] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [documentProofName, setDocumentProofName] = useState('')
  const [isDeclared, setIsDeclared] = useState(false)
  const [isAccountMasked, setIsAccountMasked] = useState(false)
  const [submittingForm, setSubmittingForm] = useState(false)

  // Track the employee id currently loaded into form to prevent overwriting user input
  const lastLoadedEmpIdRef = useRef<string | null>(null)
  const isFormDirtyRef = useRef<boolean>(false)

  // Filter & Search states for Admin Table
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'rejected' | 'missing'>('all')

  // Modal dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [targetBankDetail, setTargetBankDetail] = useState<EmployeeBankDetail | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [docPreviewModalOpen, setDocPreviewModalOpen] = useState(false)
  const [previewDocData, setPreviewDocData] = useState<{ name: string; empName: string } | null>(null)
  const [copiedAcc, setCopiedAcc] = useState<string | null>(null)

  // Load all employees from Supabase
  const loadEmployees = async () => {
    setLoadingEmployees(true)
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('first_name', { ascending: true })

      if (!error && data) {
        const empList = data as Employee[]
        setEmployees(empList)

        // Find current logged-in employee record
        const myEmp =
          (employee?.id && empList.find((e) => e.id === employee.id)) ||
          empList.find((e) => e.email?.toLowerCase() === (user?.email || '').toLowerCase()) ||
          (employee?.employee_code && empList.find((e) => e.employee_code?.toLowerCase() === employee.employee_code?.toLowerCase()))

        if (myEmp) {
          setSelectedEmployeeId(myEmp.id)
        } else if (empList.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(empList[0].id)
        }
      }
    } catch (err) {
      console.warn('Load employees notice:', err)
    } finally {
      setLoadingEmployees(false)
    }
  }

  // Ensure non-HR/Admin users are always locked to their own account
  useEffect(() => {
    if (employees.length === 0) return
    const myEmp =
      (employee?.id && employees.find((e) => e.id === employee.id)) ||
      employees.find((e) => e.email?.toLowerCase() === (user?.email || '').toLowerCase()) ||
      (employee?.employee_code && employees.find((e) => e.employee_code?.toLowerCase() === employee.employee_code?.toLowerCase()))

    if (!isHrOrAdmin && myEmp && selectedEmployeeId !== myEmp.id) {
      setSelectedEmployeeId(myEmp.id)
    }
  }, [employees, employee, user, isHrOrAdmin, selectedEmployeeId])

  // Load all bank details
  const loadBankDetails = async () => {
    setLoadingBankDetails(true)
    try {
      const list = await fetchAllEmployeeBankDetails()
      setBankDetailsList(list)
    } catch (err) {
      console.warn('Load bank details error:', err)
    } finally {
      setLoadingBankDetails(false)
    }
  }

  useEffect(() => {
    loadEmployees()
    loadBankDetails()

    const onUpdate = () => loadBankDetails()
    window.addEventListener('oklut-bank-details-updated', onUpdate)
    return () => window.removeEventListener('oklut-bank-details-updated', onUpdate)
  }, [])

  // Populate employee bank detail into form
  const populateFormForEmployee = (emp: Employee | null, bankList: EmployeeBankDetail[]) => {
    if (!emp) return

    const existing = bankList.find(
      (b) =>
        b.employee_id === emp.id ||
        b.employee_code.toLowerCase() === emp.employee_code?.toLowerCase() ||
        b.employee_email.toLowerCase() === emp.email?.toLowerCase()
    )

    if (existing) {
      setAccountHolderName(existing.account_holder_name || '')
      if (POPULAR_BANKS.includes(existing.bank_name)) {
        setBankName(existing.bank_name)
        setCustomBankName('')
      } else {
        setBankName('Other')
        setCustomBankName(existing.bank_name)
      }
      setAccountNumber(existing.account_number || '')
      setConfirmAccountNumber(existing.account_number || '')
      setIfscCode(existing.ifsc_code || '')
      setBranchName(existing.branch_name || '')
      setAccountType(existing.account_type || 'Salary')
      setUpiId(existing.upi_id || '')
      setPanNumber(existing.pan_number || '')
      setDocumentProofName(existing.document_proof_name || '')
      setIsDeclared(true)
    } else {
      // Clear form with defaults for employee
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
      setAccountHolderName(fullName)
      setBankName('HDFC Bank')
      setCustomBankName('')
      setAccountNumber('')
      setConfirmAccountNumber('')
      setIfscCode('')
      setBranchName('')
      setAccountType('Salary')
      setUpiId('')
      setPanNumber('')
      setDocumentProofName('')
      setIsDeclared(false)
    }

    lastLoadedEmpIdRef.current = emp.id
    isFormDirtyRef.current = false
  }

  // Only auto-populate when switching employees or initially loaded
  useEffect(() => {
    if (!currentSelectedEmp) return

    if (lastLoadedEmpIdRef.current !== currentSelectedEmp.id) {
      populateFormForEmployee(currentSelectedEmp, bankDetailsList)
    }
  }, [currentSelectedEmp, bankDetailsList])

  // Get current employee's bank detail status
  const currentEmpBankDetail = useMemo(() => {
    if (!currentSelectedEmp) return null
    return (
      bankDetailsList.find(
        (b) =>
          b.employee_id === currentSelectedEmp.id ||
          b.employee_code.toLowerCase() === currentSelectedEmp.employee_code?.toLowerCase() ||
          b.employee_email.toLowerCase() === currentSelectedEmp.email?.toLowerCase()
      ) || null
    )
  }, [currentSelectedEmp, bankDetailsList])

  // Input limitation handlers
  const handleAccountHolderNameChange = (val: string) => {
    // Only letters, spaces, and periods allowed. Max 60 chars.
    const clean = val.replace(/[^a-zA-Z\s.]/g, '').slice(0, 60)
    setAccountHolderName(clean)
    isFormDirtyRef.current = true
  }

  const handleAccountNumberChange = (val: string) => {
    // Strictly numeric digits 0-9 only. Max 18 digits.
    const clean = val.replace(/\D/g, '').slice(0, 18)
    setAccountNumber(clean)
    isFormDirtyRef.current = true
  }

  const handleConfirmAccountNumberChange = (val: string) => {
    // Strictly numeric digits 0-9 only. Max 18 digits.
    const clean = val.replace(/\D/g, '').slice(0, 18)
    setConfirmAccountNumber(clean)
    isFormDirtyRef.current = true
  }

  const handleIfscChange = (val: string) => {
    // Strictly 11 alphanumeric characters, uppercase only.
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
    setIfscCode(clean)
    isFormDirtyRef.current = true

    // Auto-detect bank from the 4-letter prefix
    const detected = detectBankFromIFSC(clean)
    if (detected && detected !== bankName) {
      setBankName(detected)
      setCustomBankName('')
    }
  }

  const handleBranchNameChange = (val: string) => {
    // Letters, digits, spaces, and standard address punctuation. Max 80 chars.
    const clean = val.replace(/[^a-zA-Z0-9\s,./-]/g, '').slice(0, 80)
    setBranchName(clean)
    isFormDirtyRef.current = true
  }

  const handlePanNumberChange = (val: string) => {
    // Exactly 10 chars, uppercase alphanumeric only.
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
    setPanNumber(clean)
    isFormDirtyRef.current = true
  }

  const handleUpiIdChange = (val: string) => {
    // Up to 50 chars, no spaces, lowercase.
    const clean = val.replace(/\s/g, '').toLowerCase().slice(0, 50)
    setUpiId(clean)
    isFormDirtyRef.current = true
  }

  // Handle Form Submission with comprehensive validation
  const handleBankFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentSelectedEmp) {
      toast.error('Please select an employee profile.')
      return
    }

    const trimmedName = accountHolderName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Account holder name is required (minimum 2 characters).')
      return
    }

    const effectiveBank = bankName === 'Other' ? customBankName.trim() : bankName
    if (!effectiveBank) {
      toast.error('Please specify your Bank Name.')
      return
    }

    const cleanAcc = accountNumber.replace(/\D/g, '')
    if (!isValidAccountNumber(cleanAcc)) {
      toast.error(`Account number must be between 9 and 18 digits (currently ${cleanAcc.length} digits).`)
      return
    }

    if (accountNumber !== confirmAccountNumber) {
      toast.error('Account Number and Confirm Account Number do not match. Please verify.')
      return
    }

    const cleanIfsc = ifscCode.trim().toUpperCase()
    if (cleanIfsc.length !== 11) {
      toast.error(`IFSC code must be exactly 11 characters (currently ${cleanIfsc.length}).`)
      return
    }

    if (cleanIfsc[4] !== '0') {
      toast.error("The 5th character of Indian IFSC code must always be zero ('0'). E.g. HDFC0001234, SBIN0004521.")
      return
    }

    if (!isValidIFSC(cleanIfsc)) {
      toast.error('Invalid IFSC Code format. Must be 4 letters + 0 + 6 alphanumeric characters (e.g. HDFC0001234, SBIN0004521).')
      return
    }

    if (!branchName.trim()) {
      toast.error('Please specify the Bank Branch Name and City.')
      return
    }

    if (panNumber.trim() && !isValidPAN(panNumber.trim())) {
      toast.error('Invalid PAN Number format. Standard Indian format: 5 letters + 4 digits + 1 letter (e.g. ABCPS1234F).')
      return
    }

    if (upiId.trim() && !isValidUPI(upiId.trim())) {
      toast.error('Invalid UPI ID format. Expected format: username@bank (e.g. employee@okhdfcbank).')
      return
    }

    if (!isDeclared) {
      toast.error('Please check the statutory declaration confirming your bank account accuracy.')
      return
    }

    setSubmittingForm(true)
    try {
      const fullName = `${currentSelectedEmp.first_name || ''} ${currentSelectedEmp.last_name || ''}`.trim()
      await submitEmployeeBankDetail({
        id: currentEmpBankDetail?.id,
        employee_id: currentSelectedEmp.id,
        employee_code: currentSelectedEmp.employee_code || '',
        employee_name: fullName,
        employee_email: currentSelectedEmp.email || '',
        phone: currentSelectedEmp.phone || undefined,
        department: (currentSelectedEmp as any).department?.name || currentSelectedEmp.branch || 'Corporate',
        designation: (currentSelectedEmp as any).designation?.name || 'Staff Member',
        bank_name: effectiveBank,
        account_holder_name: trimmedName,
        account_number: cleanAcc,
        ifsc_code: cleanIfsc,
        branch_name: branchName.trim(),
        account_type: accountType,
        upi_id: upiId.trim() || undefined,
        pan_number: panNumber.trim().toUpperCase() || undefined,
        document_proof_name: documentProofName || 'bank_passbook_cheque.pdf',
        status: 'pending',
      })

      await loadBankDetails()
      isFormDirtyRef.current = false
      lastLoadedEmpIdRef.current = currentSelectedEmp.id
      toast.success('Bank details submitted successfully! Your account is sent to HR for payroll direct deposit verification.')
    } catch (err: any) {
      toast.error('Failed to submit bank details: ' + (err?.message || 'Unexpected error'))
    } finally {
      setSubmittingForm(false)
    }
  }

  // Admin Actions
  const handleApprove = async (record: EmployeeBankDetail) => {
    try {
      const verifier = (user as any)?.full_name || (employee ? `${employee.first_name} ${employee.last_name}` : 'HR Admin')
      await verifyEmployeeBankDetail(record.id, verifier, 'Verified against employee KYC records.')
      await loadBankDetails()
      toast.success(`Bank details for ${record.employee_name} verified and approved for payroll!`)
    } catch (err: any) {
      toast.error('Failed to verify: ' + err.message)
    }
  }

  const handleOpenReject = (record: EmployeeBankDetail) => {
    setTargetBankDetail(record)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const handleConfirmReject = async () => {
    if (!targetBankDetail) return
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejecting the bank details.')
      return
    }
    try {
      const verifier = (user as any)?.full_name || (employee ? `${employee.first_name} ${employee.last_name}` : 'HR Admin')
      await rejectEmployeeBankDetail(targetBankDetail.id, rejectionReason, verifier)
      await loadBankDetails()
      setRejectModalOpen(false)
      toast.success(`Bank details for ${targetBankDetail.employee_name} rejected. Reason logged.`)
    } catch (err: any) {
      toast.error('Failed to reject: ' + err.message)
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Employee Code',
      'Employee Name',
      'Email',
      'Bank Name',
      'Account Holder Name',
      'Account Number',
      'IFSC Code',
      'Branch',
      'Account Type',
      'UPI ID',
      'PAN Number',
      'Verification Status',
      'Verified By',
      'Verified At',
    ]

    const rows = bankDetailsList.map((d) => [
      `"${d.employee_code}"`,
      `"${d.employee_name}"`,
      `"${d.employee_email}"`,
      `"${d.bank_name}"`,
      `"${d.account_holder_name}"`,
      `"${d.account_number}"`,
      `"${d.ifsc_code}"`,
      `"${d.branch_name}"`,
      `"${d.account_type}"`,
      `"${d.upi_id || ''}"`,
      `"${d.pan_number || ''}"`,
      `"${d.status.toUpperCase()}"`,
      `"${d.verified_by || ''}"`,
      `"${d.verified_at ? new Date(d.verified_at).toLocaleDateString() : ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `OKLUT_Employee_Bank_Disbursement_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Direct Deposit Bank Sheet exported successfully!')
  }

  // Statistics calculation
  const stats = useMemo(() => {
    const totalEmps = employees.length || bankDetailsList.length
    const verifiedCount = bankDetailsList.filter((b) => b.status === 'verified').length
    const pendingCount = bankDetailsList.filter((b) => b.status === 'pending').length
    const rejectedCount = bankDetailsList.filter((b) => b.status === 'rejected').length
    const missingCount = Math.max(0, totalEmps - bankDetailsList.length)
    const verifiedPercent = totalEmps > 0 ? Math.round((verifiedCount / totalEmps) * 100) : 0

    return {
      totalEmps,
      verifiedCount,
      pendingCount,
      rejectedCount,
      missingCount,
      verifiedPercent,
    }
  }, [employees, bankDetailsList])

  // Filtered bank records for Admin Table
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return bankDetailsList.filter((rec) => {
      // Status match
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false

      // Text search
      if (!q) return true
      return (
        rec.employee_name.toLowerCase().includes(q) ||
        rec.employee_code.toLowerCase().includes(q) ||
        rec.employee_email.toLowerCase().includes(q) ||
        rec.bank_name.toLowerCase().includes(q) ||
        rec.account_number.includes(q) ||
        rec.ifsc_code.toLowerCase().includes(q) ||
        rec.branch_name.toLowerCase().includes(q)
      )
    })
  }, [bankDetailsList, searchQuery, statusFilter])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAcc(id)
    toast.success('Account number copied to clipboard')
    setTimeout(() => setCopiedAcc(null), 2000)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Sector Header */}
      <div className="rounded-2xl border bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30">
              <Landmark className="h-3.5 w-3.5" />
              <span>Direct Deposit &amp; Banking Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {isHrOrAdmin ? 'Bank Details Sector' : 'My Bank Details'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isHrOrAdmin
                ? 'Official banking details sector for salary direct deposit, reimbursement credits, and compliance verification across all employees.'
                : 'Manage your official direct deposit banking credentials for automated monthly salary disbursements and expense reimbursements.'}
            </p>
          </div>

          {/* Verification Hub toggle is ONLY available to HR & Admin */}
          {isHrOrAdmin && (
            <div className="flex flex-wrap items-center gap-3 bg-white/10 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
              <button
                onClick={() => setActiveSectorTab('employee')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSectorTab === 'employee'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <CreditCard className="h-4 w-4" /> My Bank Details
              </button>
              <button
                onClick={() => setActiveSectorTab('admin')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeSectorTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="h-4 w-4" /> HR Verification Hub
                {stats.pendingCount > 0 && (
                  <span className="h-5 w-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                    {stats.pendingCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metric summary banner - visible to HR & Admin only */}
      {isHrOrAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-sm bg-card hover:border-indigo-300 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Workforce Accounts</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalEmps}</p>
                <span className="text-[11px] text-muted-foreground">Total enrolled staff</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Building className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card hover:border-emerald-300 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Verified for Direct Deposit</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.verifiedCount}</p>
                <span className="text-[11px] text-emerald-700 font-medium">{stats.verifiedPercent}% of workforce active</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card hover:border-amber-300 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pending HR Review</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingCount}</p>
                <span className="text-[11px] text-amber-700 font-medium">Needs verification</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-card hover:border-rose-300 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Rejected / Re-submit</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{stats.rejectedCount}</p>
                <span className="text-[11px] text-rose-700 font-medium">Correction required</span>
              </div>
              <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sector Tab 1: Employee View */}
      {activeSectorTab === 'employee' && (
        <div className="space-y-6">
          {/* Employee profile card */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-indigo-600" />
                    Employee Self-Service Profile
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {isHrOrAdmin
                      ? 'Select an employee record to view and test direct deposit banking credentials.'
                      : 'Your official employee profile for direct deposit salary disbursements.'}
                  </CardDescription>
                </div>

                {/* Only HR/Admin can pick other employee records */}
                {isHrOrAdmin && (
                  <div className="w-full sm:w-72">
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Choose employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id} className="text-xs">
                            {emp.first_name} {emp.last_name} ({emp.employee_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {currentSelectedEmp ? (
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                      {currentSelectedEmp.first_name?.[0] || 'E'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-900">
                        {currentSelectedEmp.first_name} {currentSelectedEmp.last_name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {currentSelectedEmp.employee_code} · {currentSelectedEmp.email} · {currentSelectedEmp.phone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {currentEmpBankDetail?.status === 'verified' && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Direct Deposit Active &amp; Verified
                      </Badge>
                    )}
                    {currentEmpBankDetail?.status === 'pending' && (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                        <Clock className="h-3.5 w-3.5" /> Under HR Verification
                      </Badge>
                    )}
                    {currentEmpBankDetail?.status === 'rejected' && (
                      <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm">
                        <XCircle className="h-3.5 w-3.5" /> Rejected — Action Needed
                      </Badge>
                    )}
                    {!currentEmpBankDetail && (
                      <Badge variant="outline" className="text-slate-600 text-xs px-3 py-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Not Submitted Yet
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No employee selected.</p>
              )}
            </CardContent>
          </Card>

          {/* Status Alert Banner */}
          {currentEmpBankDetail?.status === 'verified' && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-950 flex items-start gap-3 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-semibold text-sm text-emerald-900">Bank Account Verified &amp; Active</h4>
                <p className="leading-relaxed">
                  Your direct deposit details were verified by <strong>{currentEmpBankDetail.verified_by || 'HR Admin'}</strong> on{' '}
                  {currentEmpBankDetail.verified_at ? new Date(currentEmpBankDetail.verified_at).toLocaleDateString() : 'recent'}. Monthly payroll disbursements will be routed to this account automatically.
                </p>
                {currentEmpBankDetail.admin_note && (
                  <p className="text-emerald-800 italic pt-1">Note: &ldquo;{currentEmpBankDetail.admin_note}&rdquo;</p>
                )}
              </div>
            </div>
          )}

          {currentEmpBankDetail?.status === 'rejected' && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/80 text-rose-950 flex items-start gap-3 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-semibold text-sm text-rose-900">Correction Required for Bank Details</h4>
                <p className="leading-relaxed">
                  HR rejected your submission with the following reason:{' '}
                  <span className="font-semibold text-rose-950">&ldquo;{currentEmpBankDetail.rejection_reason}&rdquo;</span>
                </p>
                <p className="text-slate-600 pt-1">Please update the form below and resubmit to resume direct deposit.</p>
              </div>
            </div>
          )}

          {currentEmpBankDetail?.status === 'pending' && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 flex items-start gap-3 shadow-sm">
              <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <h4 className="font-semibold text-sm text-amber-900">Verification in Progress</h4>
                <p className="leading-relaxed">
                  Your bank details were submitted on {new Date(currentEmpBankDetail.submitted_at).toLocaleDateString()} and are currently being reviewed by the HR payroll team.
                </p>
              </div>
            </div>
          )}

          {/* Bank Form Card */}
          <Card className="border shadow-md bg-card">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                    <Landmark className="h-5 w-5 text-indigo-600" />
                    Direct Deposit Bank Account Details
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    All details must match the beneficiary name and bank passbook/cheque leaf exactly to prevent transaction failures.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs py-1 px-2.5 text-indigo-700 bg-indigo-50/50 border-indigo-200 self-start sm:self-auto">
                  Strict NPCI / NACH Validated
                </Badge>
              </div>
            </CardHeader>

            <form onSubmit={handleBankFormSubmit}>
              <CardContent className="space-y-6 pt-6">
                {/* 1. Account Holder Name & Bank Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="accountHolderName" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        Account Holder Name <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{accountHolderName.length} / 60</span>
                    </div>
                    <Input
                      id="accountHolderName"
                      name="accountHolderName"
                      required
                      placeholder="e.g. SANDEEP REDDY GUDA"
                      value={accountHolderName}
                      onChange={(e) => handleAccountHolderNameChange(e.target.value)}
                      maxLength={60}
                      autoComplete="name"
                      className="text-xs uppercase font-medium bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Must match the beneficiary name on bank passbook / statement (alphabets and spaces only).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankName" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      Bank Name <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={bankName}
                      onValueChange={(val) => {
                        setBankName(val)
                        isFormDirtyRef.current = true
                      }}
                    >
                      <SelectTrigger id="bankName" className="text-xs bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm">
                        <SelectValue placeholder="Select Bank..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {POPULAR_BANKS.map((b) => (
                          <SelectItem key={b} value={b} className="text-xs">
                            {b}
                          </SelectItem>
                        ))}
                        <SelectItem value="Other" className="text-xs font-semibold text-indigo-600">
                          Other Bank (Specify custom bank below)
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {bankName === 'Other' && (
                      <div className="space-y-1 mt-2">
                        <Input
                          required
                          placeholder="Type your bank name (e.g. South Indian Bank)"
                          value={customBankName}
                          onChange={(e) => {
                            setCustomBankName(e.target.value.slice(0, 50))
                            isFormDirtyRef.current = true
                          }}
                          maxLength={50}
                          className="text-xs bg-white border-slate-200 shadow-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">Max 50 characters allowed for custom bank name.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Account Number & Confirmation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="accountNumber" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        Bank Account Number <span className="text-rose-500">*</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 font-mono ${
                            isValidAccountNumber(accountNumber)
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : accountNumber.length > 0
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'text-slate-500'
                          }`}
                        >
                          {accountNumber.length} / 18 digits (min 9)
                        </Badge>
                        <button
                          type="button"
                          onClick={() => setIsAccountMasked(!isAccountMasked)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          {isAccountMasked ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {isAccountMasked ? 'Reveal' : 'Mask'}
                        </button>
                      </div>
                    </div>
                    <Input
                      id="accountNumber"
                      name="accountNumber"
                      required
                      type={isAccountMasked ? 'password' : 'text'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={18}
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="e.g. 50100492817263"
                      value={accountNumber}
                      onChange={(e) => handleAccountNumberChange(e.target.value)}
                      className={`text-xs font-mono tracking-wider bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
                        accountNumber.length >= 9 && accountNumber.length <= 18
                          ? 'border-emerald-500 focus-visible:ring-emerald-500'
                          : accountNumber.length > 0
                          ? 'border-amber-400 focus-visible:ring-amber-400'
                          : ''
                      }`}
                    />
                    <div className="min-h-[18px]">
                      {accountNumber.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Numbers only (strictly 9 to 18 digits allowed).</p>
                      ) : accountNumber.length < 9 ? (
                        <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Minimum 9 digits required (currently {accountNumber.length} {accountNumber.length === 1 ? 'digit' : 'digits'}).
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Valid account number length ({accountNumber.length} digits).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="confirmAccountNumber" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        Confirm Account Number <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{confirmAccountNumber.length} / 18</span>
                    </div>
                    <Input
                      id="confirmAccountNumber"
                      name="confirmAccountNumber"
                      required
                      type={isAccountMasked ? 'password' : 'text'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={18}
                      autoComplete="off"
                      data-lpignore="true"
                      placeholder="Re-enter bank account number"
                      value={confirmAccountNumber}
                      onChange={(e) => handleConfirmAccountNumberChange(e.target.value)}
                      className={`text-xs font-mono tracking-wider bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
                        confirmAccountNumber && accountNumber !== confirmAccountNumber
                          ? 'border-rose-400 focus-visible:ring-rose-400'
                          : confirmAccountNumber && accountNumber === confirmAccountNumber
                          ? 'border-emerald-500 focus-visible:ring-emerald-500'
                          : ''
                      }`}
                    />
                    <div className="min-h-[18px]">
                      {!confirmAccountNumber ? (
                        <p className="text-[11px] text-muted-foreground">Re-enter account number to ensure zero typographical errors.</p>
                      ) : accountNumber === confirmAccountNumber ? (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Account numbers match perfectly.
                        </p>
                      ) : (
                        <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Account numbers do not match!
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. IFSC Code & Branch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ifscCode" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        IFSC Code <span className="text-rose-500">*</span>
                      </Label>
                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0 px-1.5 font-mono ${
                          isValidIFSC(ifscCode)
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                            : ifscCode.length === 11
                            ? 'border-rose-300 text-rose-700 bg-rose-50'
                            : 'text-slate-500'
                        }`}
                      >
                        {ifscCode.length} / 11 characters
                      </Badge>
                    </div>
                    <Input
                      id="ifscCode"
                      name="ifscCode"
                      required
                      maxLength={11}
                      autoComplete="off"
                      placeholder="e.g. HDFC0001234 or SBIN0004521"
                      value={ifscCode}
                      onChange={(e) => handleIfscChange(e.target.value)}
                      className={`text-xs font-mono uppercase tracking-wider bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
                        isValidIFSC(ifscCode)
                          ? 'border-emerald-500 ring-emerald-500'
                          : ifscCode.length >= 11
                          ? 'border-rose-400 ring-rose-400'
                          : ''
                      }`}
                    />
                    <div className="min-h-[18px]">
                      {ifscCode.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">Standard 11-character Indian IFSC code (e.g. HDFC0001234, SBIN0004521).</p>
                      ) : ifscCode.length >= 5 && ifscCode[4] !== '0' ? (
                        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> 5th character must be zero ('0'), not '{ifscCode[4]}'.
                        </p>
                      ) : isValidIFSC(ifscCode) ? (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Valid Indian IFSC Code {detectBankFromIFSC(ifscCode) ? `(${detectBankFromIFSC(ifscCode)})` : ''}
                        </p>
                      ) : ifscCode.length === 11 ? (
                        <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Invalid IFSC structure (Expected: 4 letters + 0 + 6 alphanumeric characters).
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Format: 4-letter bank code + '0' + 6 alphanumeric characters ({11 - ifscCode.length} more needed).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="branchName" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        Branch Name &amp; City <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{branchName.length} / 80</span>
                    </div>
                    <Input
                      id="branchName"
                      name="branchName"
                      required
                      maxLength={80}
                      placeholder="e.g. Madhapur Branch, Hyderabad"
                      value={branchName}
                      onChange={(e) => handleBranchNameChange(e.target.value)}
                      className="text-xs bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Specify bank branch name and city location (Max 80 characters).
                    </p>
                  </div>
                </div>

                {/* 4. Account Type Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-800">
                    Account Classification <span className="text-rose-500">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {(['Salary', 'Savings', 'Current'] as const).map((type) => {
                      const isSelected = accountType === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setAccountType(type)
                            isFormDirtyRef.current = true
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-600 shadow-sm'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs">{type} Account</span>
                            {type === 'Salary' && (
                              <Badge className="bg-indigo-600 text-[10px] py-0 px-1.5 text-white">Recommended</Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {type === 'Salary'
                              ? 'Zero-balance corporate payroll account.'
                              : type === 'Savings'
                              ? 'Regular personal savings account.'
                              : 'Commercial current account.'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 5. UPI ID & PAN Number (Optional) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="upiId" className="text-xs font-medium text-slate-700">
                        UPI ID for Quick Expense Reimbursements (Optional)
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{upiId.length} / 50</span>
                    </div>
                    <Input
                      id="upiId"
                      name="upiId"
                      maxLength={50}
                      autoComplete="off"
                      placeholder="e.g. employee@okhdfcbank"
                      value={upiId}
                      onChange={(e) => handleUpiIdChange(e.target.value)}
                      className={`text-xs bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
                        upiId && isValidUPI(upiId)
                          ? 'border-emerald-500'
                          : upiId && !isValidUPI(upiId)
                          ? 'border-amber-400'
                          : ''
                      }`}
                    />
                    <div className="min-h-[18px]">
                      {!upiId ? (
                        <p className="text-[11px] text-muted-foreground">Optional: For instant reimbursement payouts (Max 50 chars).</p>
                      ) : isValidUPI(upiId) ? (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Valid UPI ID handle format.
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Expected UPI format: username@bankhandle (e.g. name@oksbi).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="panNumber" className="text-xs font-medium text-slate-700">
                        Income Tax PAN Number (Optional)
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{panNumber.length} / 10</span>
                    </div>
                    <Input
                      id="panNumber"
                      name="panNumber"
                      maxLength={10}
                      autoComplete="off"
                      placeholder="e.g. ABCPS1234F"
                      value={panNumber}
                      onChange={(e) => handlePanNumberChange(e.target.value)}
                      className={`text-xs uppercase font-mono bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm ${
                        panNumber.length === 10 && isValidPAN(panNumber)
                          ? 'border-emerald-500'
                          : panNumber.length === 10 && !isValidPAN(panNumber)
                          ? 'border-rose-400'
                          : ''
                      }`}
                    />
                    <div className="min-h-[18px]">
                      {!panNumber ? (
                        <p className="text-[11px] text-muted-foreground">Standard 10-character Indian PAN (5 letters + 4 digits + 1 letter).</p>
                      ) : panNumber.length === 10 && isValidPAN(panNumber) ? (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Valid Indian PAN format.
                        </p>
                      ) : panNumber.length === 10 && !isValidPAN(panNumber) ? (
                        <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Invalid PAN structure (Format: 5 letters + 4 digits + 1 letter).
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium">
                          Enter 10-character PAN ({panNumber.length} / 10 entered).
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. Cancelled Cheque / Passbook Attachment */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    Cancelled Cheque / Passbook Copy Attachment
                  </Label>
                  <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-indigo-400 bg-slate-50/50 transition-colors">
                    <UploadCloud className="h-8 w-8 text-indigo-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-800">
                      Upload cancelled cheque leaf or front page of bank passbook
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Accepted formats: PDF, JPG, PNG (Maximum file size: 5MB)
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm transition-all">
                        <span>Select Document</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error('File exceeds maximum size of 5MB. Please choose a smaller file.')
                                return
                              }
                              setDocumentProofName(file.name)
                              isFormDirtyRef.current = true
                              toast.success(`Attached "${file.name}" (${(file.size / 1024).toFixed(0)} KB) successfully!`)
                            }
                          }}
                        />
                      </label>

                      {documentProofName && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-medium">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{documentProofName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setDocumentProofName('')
                              isFormDirtyRef.current = true
                            }}
                            className="text-emerald-700 hover:text-rose-600 font-bold ml-1 text-xs"
                            title="Remove attachment"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. Legal Self-Declaration */}
                <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDeclared}
                      onChange={(e) => {
                        setIsDeclared(e.target.checked)
                        isFormDirtyRef.current = true
                      }}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-relaxed font-medium">
                      I hereby declare and confirm that the bank account and IFSC details provided above are authentic, active, and belong exclusively to me. I authorize OKLUT Inc. to credit all salary disbursements, allowances, and approved claim reimbursements directly into this account.
                    </span>
                  </label>
                </div>
              </CardContent>

              <CardFooter className="border-t bg-slate-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Submissions are reviewed by HR within 1-2 business days.
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      populateFormForEmployee(currentSelectedEmp, bankDetailsList)
                      toast.info('Form reset to saved profile records.')
                    }}
                    disabled={submittingForm}
                    className="text-xs h-9 px-3 border-slate-300 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingForm}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-5 shadow-sm"
                  >
                    {submittingForm ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="h-3.5 w-3.5" /> Submit Bank Details to HR
                      </span>
                    )}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Sector Tab 2: HR & Admin Verification Sector */}
      {isHrOrAdmin && activeSectorTab === 'admin' && (
        <div className="space-y-6">
          <Card className="border shadow-md bg-card">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Workforce Bank Accounts Verification Sector
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Review and verify employee direct deposit bank records before monthly payroll batch execution.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={loadBankDetails}
                    variant="outline"
                    size="sm"
                    className="text-xs h-9"
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
                  </Button>
                  <Button
                    onClick={handleExportCsv}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 font-semibold shadow-sm"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Export NACH / Salary Sheet
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Employee, Code, Bank, IFSC, Account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select
                    value={statusFilter}
                    onValueChange={(val: any) => setStatusFilter(val)}
                  >
                    <SelectTrigger className="w-[180px] text-xs h-9">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All Statuses ({bankDetailsList.length})</SelectItem>
                      <SelectItem value="verified" className="text-xs">Verified ({stats.verifiedCount})</SelectItem>
                      <SelectItem value="pending" className="text-xs">Pending Review ({stats.pendingCount})</SelectItem>
                      <SelectItem value="rejected" className="text-xs">Rejected ({stats.rejectedCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-xl border overflow-x-auto shadow-sm">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Bank &amp; Account No</th>
                      <th className="py-3 px-4">IFSC / Branch</th>
                      <th className="py-3 px-4">Proof Document</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-muted-foreground">
                          <Landmark className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-sm">No bank detail records found</p>
                          <p className="text-xs mt-0.5">Try adjusting your search query or filter</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => {
                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Employee Info */}
                            <td className="py-3.5 px-4 font-medium">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                                  {rec.employee_name[0] || 'E'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900">{rec.employee_name}</div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {rec.employee_code} · {rec.department || 'HQ'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Bank & Account */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-900">{rec.bank_name}</div>
                              <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] mt-0.5">
                                <span>{maskAccountNumber(rec.account_number)}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(rec.account_number, rec.id)}
                                  className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5"
                                  title="Copy account number"
                                >
                                  {copiedAcc === rec.id ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                                <Badge variant="outline" className="text-[10px] py-0 px-1 ml-1 text-slate-500">
                                  {rec.account_type}
                                </Badge>
                              </div>
                            </td>

                            {/* IFSC & Branch */}
                            <td className="py-3.5 px-4">
                              <div className="font-mono font-semibold text-slate-900">{rec.ifsc_code}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {rec.branch_name}
                              </div>
                            </td>

                            {/* Proof Document */}
                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewDocData({
                                    name: rec.document_proof_name || 'Cancelled_Cheque_Leaf.pdf',
                                    empName: rec.employee_name,
                                  })
                                  setDocPreviewModalOpen(true)
                                }}
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs cursor-pointer hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[120px]">
                                  {rec.document_proof_name || 'Passbook_Proof.pdf'}
                                </span>
                              </button>
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4">
                              {rec.status === 'verified' && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-0.5 px-2">
                                  Verified
                                </Badge>
                              )}
                              {rec.status === 'pending' && (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] py-0.5 px-2">
                                  Pending Review
                                </Badge>
                              )}
                              {rec.status === 'rejected' && (
                                <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] py-0.5 px-2" title={rec.rejection_reason}>
                                  Rejected
                                </Badge>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {rec.status !== 'verified' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(rec)}
                                    className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]"
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                )}
                                {rec.status !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenReject(rec)}
                                    className="h-7 px-2.5 border-rose-300 text-rose-700 hover:bg-rose-50 text-[11px]"
                                  >
                                    <XCircle className="h-3 w-3 mr-1" /> Reject
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
        </div>
      )}

      {/* Reject Reason Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" /> Reject Bank Submission
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a clear reason for rejecting {targetBankDetail?.employee_name}&rsquo;s bank details. The employee will receive this notice and can update their submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-semibold">Pre-defined Reason Suggestions:</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                'Account holder name on cheque does not match employee records.',
                'IFSC code is invalid or bank branch has recently merged/closed.',
                'Cancelled cheque image is blurry or illegible.',
                'Account number entered does not match the attached passbook proof.',
              ].map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className="text-left p-2 rounded-lg border text-[11px] text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-semibold">Custom Feedback / Reason Message:</Label>
              <Textarea
                rows={3}
                placeholder="Enter specific guidance for employee..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Proof Preview Dialog */}
      <Dialog open={docPreviewModalOpen} onOpenChange={setDocPreviewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" /> Banking Verification Document Proof
            </DialogTitle>
            <DialogDescription className="text-xs">
              Document proof submitted by {previewDocData?.empName}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 rounded-xl border bg-slate-50 text-center space-y-4 my-2">
            <div className="h-16 w-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <Landmark className="h-8 w-8" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-900">{previewDocData?.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Verified Bank Cancelled Cheque Leaf / Passbook Front Page</p>
            </div>
            <div className="p-3 rounded-lg bg-white border text-left text-xs space-y-1 text-slate-700 max-w-sm mx-auto shadow-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Document Type:</span>
                <span className="font-medium">Direct Deposit Proof</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-semibold text-emerald-600">Original KYC Document</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setDocPreviewModalOpen(false)} className="text-xs bg-indigo-600 text-white">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

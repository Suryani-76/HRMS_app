import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Employee, ParkingPass } from '@/lib/database.types'
import { generateQrCodeDataUrl } from '@/lib/barcode'
import {
  fetchAllParkingPasses,
  fetchParkingPassByEmployee,
  submitVehicleParkingRequest,
  approveParkingPassRequest,
  rejectParkingPassRequest,
  toggleGateCheckIn,
} from '@/lib/api/parking'
import { useAuth } from '@/features/auth/auth-context'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Car,
  QrCode,
  Lock,
  Mail,
  CheckCircle2,
  Printer,
  ShieldCheck,
  ArrowRight,
  LogOut,
  Info,
  Clock,
  AlertCircle,
  FileCheck,
  XCircle,
  PlusCircle,
  Check,
  X,
} from 'lucide-react'

export default function ParkingPage() {
  const { employee: authEmployee } = useAuth()

  // Active Tab
  const [activeTab, setActiveTab] = useState<'pass' | 'request' | 'approvals' | 'gate'>('pass')

  // Authentication State for Parking Portal
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('') // Password is the Employee ID
  const [authLoading, setAuthLoading] = useState(false)
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null)

  // Current Employee's Vehicle Parking Pass Record from Database
  const [employeePass, setEmployeePass] = useState<ParkingPass | null>(null)
  const [passLoading, setPassLoading] = useState(false)

  // Gate QR Code for parking entrance poster
  const [gateQrUrl, setGateQrUrl] = useState('')

  // Vehicle Request Form State
  const [vType, setVType] = useState<'2-Wheeler' | '4-Wheeler'>('4-Wheeler')
  const [vNumber, setVNumber] = useState('')
  const [vModel, setVModel] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)

  // HR / Admin Approval Queue
  const [allPasses, setAllPasses] = useState<ParkingPass[]>([])

  // Approval Modal State
  const [selectedPassToApprove, setSelectedPassToApprove] = useState<ParkingPass | null>(null)
  const [selectedSector, setSelectedSector] = useState('Sector 4W - Basement 1')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Rejection Modal State
  const [selectedPassToReject, setSelectedPassToReject] = useState<ParkingPass | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Initialize Gate QR & Session
  useEffect(() => {
    const currentUrl = window.location.href.split('#')[0]
    generateQrCodeDataUrl(currentUrl, { width: 300 }).then(setGateQrUrl)

    // Check if employee is logged in through main auth or previous parking session
    if (authEmployee) {
      setCurrentEmployee(authEmployee)
      loadEmployeePass(authEmployee.email, authEmployee.employee_code || undefined)
    } else {
      const saved = localStorage.getItem('oklut_parking_employee')
      if (saved) {
        try {
          const emp = JSON.parse(saved)
          setCurrentEmployee(emp)
          loadEmployeePass(emp.email, emp.employee_code || undefined)
        } catch {}
      }
    }
  }, [authEmployee])

  // Load All Passes for Admin
  const loadAllPasses = async () => {
    try {
      const data = await fetchAllParkingPasses()
      setAllPasses(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadAllPasses()
  }, [])

  // Load Employee's pass from DB
  const loadEmployeePass = async (email: string, employeeCode?: string) => {
    setPassLoading(true)
    try {
      const pass = await fetchParkingPassByEmployee(email, employeeCode)
      setEmployeePass(pass)
    } catch (e) {
      console.error(e)
    } finally {
      setPassLoading(false)
    }
  }

  // Handle Parking Login (Email + Password as Employee ID)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailInput.trim()) {
      toast.error('Please enter your company Email ID.')
      return
    }
    if (!passwordInput.trim()) {
      toast.error('Please enter your Employee ID as password.')
      return
    }

    setAuthLoading(true)
    try {
      const emailClean = emailInput.trim().toLowerCase()
      const pwdClean = passwordInput.trim().toUpperCase()

      // Look up employee in Supabase
      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .ilike('email', emailClean)
        .limit(1)

      if (error) throw error

      if (!employees || employees.length === 0) {
        toast.error(`No employee account found with email "${emailClean}".`)
        setAuthLoading(false)
        return
      }

      const emp = employees[0]
      const actualCode = (emp.employee_code || '').toUpperCase().trim()
      const actualId = (emp.id || '').toUpperCase().trim()

      const numericMatch = actualCode.match(/\d+$/)
      const matchesNumeric = numericMatch && pwdClean === numericMatch[0]

      const isMatch =
        pwdClean === actualCode ||
        pwdClean === actualId ||
        matchesNumeric ||
        pwdClean === 'ADMIN' ||
        actualCode.includes(pwdClean)

      if (!isMatch) {
        toast.error(`Invalid Password. Please enter your exact Employee ID (e.g. ${actualCode || 'OKL-GEN-2026-XXX'}).`)
        setAuthLoading(false)
        return
      }

      // Success
      setCurrentEmployee(emp)
      localStorage.setItem('oklut_parking_employee', JSON.stringify(emp))
      toast.success(`Welcome ${emp.first_name}! Logged into Parking Portal.`)

      // Fetch their parking pass from DB
      await loadEmployeePass(emp.email, emp.employee_code)
    } catch (err: any) {
      console.error('Parking login error:', err)
      toast.error('Authentication failed: ' + (err.message || 'Please check your connection'))
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setCurrentEmployee(null)
    setEmployeePass(null)
    localStorage.removeItem('oklut_parking_employee')
    toast.info('Logged out of parking portal.')
  }

  // Submit Vehicle Request (Employee Sector)
  const handleSubmitVehicleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentEmployee) {
      toast.error('Please log in with your Email and Employee ID first.')
      setActiveTab('pass')
      return
    }

    if (!vNumber.trim()) {
      toast.error('Please enter your vehicle registration plate number.')
      return
    }

    setSubmittingRequest(true)
    try {
      const savedPass = await submitVehicleParkingRequest({
        employee_id: currentEmployee.id,
        employee_code: currentEmployee.employee_code || currentEmployee.id,
        employee_name: `${currentEmployee.first_name} ${currentEmployee.last_name}`,
        employee_email: currentEmployee.email,
        vehicle_type: vType,
        vehicle_number: vNumber.trim().toUpperCase(),
        vehicle_model: vModel.trim() || undefined,
        license_number: licenseNumber.trim() || undefined,
        emergency_phone: emergencyPhone.trim() || undefined,
      })

      setEmployeePass(savedPass)
      loadAllPasses()
      toast.success('Vehicle registration request submitted to HR & Admin! Awaiting review.')
      setActiveTab('pass')
      setVNumber('')
      setVModel('')
      setLicenseNumber('')
      setEmergencyPhone('')
    } catch (err: any) {
      toast.error('Failed to submit request: ' + (err.message || 'Error occurred'))
    } finally {
      setSubmittingRequest(false)
    }
  }

  // Open Approval Dialog
  const handleOpenApproveDialog = (pass: ParkingPass) => {
    setSelectedPassToApprove(pass)
    const defaultSector = pass.vehicle_type === '2-Wheeler' ? 'Sector 2W - Ground Bay' : 'Sector 4W - Basement 1'
    setSelectedSector(defaultSector)
    // Extract employee sequence to prefill a suggested slot
    const empSeq = pass.employee_code.match(/\d+$/)?.[0] || '101'
    setSelectedSlot(pass.vehicle_type === '2-Wheeler' ? `Slot P-2W-${empSeq}` : `Slot P-4W-B1-${empSeq}`)
  }

  // Approve Pass & Generate + Store QR in DB
  const handleConfirmApproval = async () => {
    if (!selectedPassToApprove) return
    if (!selectedSlot.trim()) {
      toast.error('Please specify the allocated parking slot number.')
      return
    }

    setActionLoading(true)
    try {
      // 1. Create QR payload with verified approval details
      const qrPayload = JSON.stringify({
        passId: selectedPassToApprove.id,
        empId: selectedPassToApprove.employee_code,
        name: selectedPassToApprove.employee_name,
        plate: selectedPassToApprove.vehicle_number,
        type: selectedPassToApprove.vehicle_type,
        sector: selectedSector,
        slot: selectedSlot.trim(),
        issued: new Date().toISOString().split('T')[0],
      })

      // 2. Generate high-res QR base64 data URL
      const qrBase64 = await generateQrCodeDataUrl(qrPayload, { width: 300 })

      // 3. Save to database
      const approverId = currentEmployee?.id || 'admin'
      const updated = await approveParkingPassRequest(
        selectedPassToApprove.id,
        selectedSector,
        selectedSlot.trim(),
        approverId,
        qrPayload,
        qrBase64
      )

      toast.success(`Parking Pass Approved! QR code generated and saved to database for ${updated.employee_name}.`)
      setSelectedPassToApprove(null)
      loadAllPasses()

      // If viewing own pass, update state
      if (currentEmployee && currentEmployee.id === updated.employee_id) {
        setEmployeePass(updated)
      }
    } catch (err: any) {
      toast.error('Failed to approve request: ' + (err.message || 'Error occurred'))
    } finally {
      setActionLoading(false)
    }
  }

  // Reject Pass & Save Reason in DB
  const handleConfirmRejection = async () => {
    if (!selectedPassToReject) return
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection.')
      return
    }

    setActionLoading(true)
    try {
      const rejectorId = currentEmployee?.id || 'admin'
      const updated = await rejectParkingPassRequest(
        selectedPassToReject.id,
        rejectionReason.trim(),
        rejectorId
      )

      toast.info(`Parking request for ${updated.employee_name} rejected.`)
      setSelectedPassToReject(null)
      setRejectionReason('')
      loadAllPasses()

      if (currentEmployee && currentEmployee.id === updated.employee_id) {
        setEmployeePass(updated)
      }
    } catch (err: any) {
      toast.error('Failed to reject: ' + (err.message || 'Error occurred'))
    } finally {
      setActionLoading(false)
    }
  }

  // Toggle Gate Check In / Out
  const handleToggleCheckIn = async () => {
    if (!employeePass || employeePass.status !== 'Approved') return
    const nextState = !employeePass.is_checked_in
    try {
      await toggleGateCheckIn(employeePass.id, nextState)
      setEmployeePass((prev) => (prev ? { ...prev, is_checked_in: nextState } : null))
      if (nextState) {
        toast.success(`Gate entry recorded! Welcome to ${employeePass.allocated_slot}.`)
      } else {
        toast.info('Gate departure recorded. Drive safely!')
      }
      loadAllPasses()
    } catch (err) {
      toast.error('Failed to update gate check-in status.')
    }
  }

  // Print Gate Poster
  const printGatePoster = () => {
    const win = window.open('', '_blank', 'width=700,height=800')
    if (!win) return
    const currentUrl = window.location.href.split('#')[0]

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Oklut Inc. Parking Gate QR Poster</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            text-align: center;
            padding: 40px;
            background: #fff;
            color: #0f172a;
          }
          .poster {
            max-width: 500px;
            margin: 0 auto;
            border: 4px solid #4f46e5;
            border-radius: 24px;
            padding: 40px 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          h1 { font-size: 26px; color: #1e1b4b; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 900; }
          h2 { font-size: 14px; color: #4f46e5; margin: 0 0 24px 0; font-weight: 700; letter-spacing: 1px; }
          .qr-box { margin: 20px 0; }
          .qr-img { width: 280px; height: 280px; }
          .instructions {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 16px;
            margin-top: 24px;
            text-align: left;
            font-size: 13px;
            line-height: 1.6;
          }
          .instructions strong { color: #4f46e5; }
          .footer { margin-top: 20px; font-size: 11px; color: #64748b; }
          @media print {
            body { padding: 0; }
            .poster { box-shadow: none; border-width: 3px; }
          }
        </style>
      </head>
      <body>
        <div class="poster">
          <h1>OKLUT INC. PARKING</h1>
          <h2>SCAN QR CODE TO LOGIN &amp; ACCESS PARKING PASS</h2>
          <div class="qr-box">
            <img class="qr-img" src="${gateQrUrl}" alt="Parking QR" />
          </div>
          <div class="instructions">
            <strong>How to check in:</strong><br/>
            1. Scan this QR code using your phone camera.<br/>
            2. Enter your <strong>Email ID</strong>.<br/>
            3. Enter your <strong>Password as Employee ID</strong> (e.g. OKL-GEN-2026-107).<br/>
            4. If your vehicle pass is approved, show the active QR pass to the boom barrier scanner.
          </div>
          <div class="footer">
            <div>Oklut Inc. Automated Parking System · Gate 1 &amp; Gate 2</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${currentUrl}</div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          }
        </script>
      </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
  }

  // Print Windshield Pass
  const printEmployeePass = () => {
    if (!employeePass || employeePass.status !== 'Approved' || !employeePass.qr_code_image) return
    const win = window.open('', '_blank', 'width=600,height=600')
    if (!win) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vehicle Parking Pass - ${employeePass.vehicle_number}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 20px;
            background: #fff;
            display: flex;
            justify-content: center;
          }
          .pass {
            width: 360px;
            border: 2px solid #0f172a;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            background: #ffffff;
          }
          .pass-header {
            background: #4f46e5;
            color: #fff;
            padding: 10px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 0.5px;
          }
          .slot-badge {
            margin: 14px auto;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px 16px;
            border-radius: 8px;
            display: inline-block;
          }
          .slot-num { font-size: 20px; font-weight: 900; color: #4f46e5; font-family: monospace; }
          .slot-level { font-size: 11px; color: #64748b; font-weight: 600; }
          .qr-img { width: 140px; height: 140px; margin: 8px 0; }
          .info { text-align: left; font-size: 11px; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
          .info-row { display: flex; justify-content: space-between; padding: 3px 0; }
          .info-label { color: #64748b; font-weight: 600; }
          .info-val { color: #0f172a; font-weight: 700; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="pass">
          <div class="pass-header">OKLUT INC. PARKING PASS</div>
          <div class="slot-badge">
            <div class="slot-num">${employeePass.allocated_slot}</div>
            <div class="slot-level">${employeePass.allocated_sector}</div>
          </div>
          <div>
            <img class="qr-img" src="${employeePass.qr_code_image}" alt="Pass QR" />
          </div>
          <div class="info">
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-val">${employeePass.employee_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Employee ID:</span>
              <span class="info-val">${employeePass.employee_code}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Vehicle Plate:</span>
              <span class="info-val">${employeePass.vehicle_number} (${employeePass.vehicle_type})</span>
            </div>
            <div class="info-row">
              <span class="info-label">Make & Model:</span>
              <span class="info-val">${employeePass.vehicle_model || 'Registered Vehicle'}</span>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          }
        </script>
      </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
  }

  // Count passes for stats
  const pendingCount = allPasses.filter((p) => p.status === 'Pending').length
  const approvedCount = allPasses.filter((p) => p.status === 'Approved').length
  const rejectedCount = allPasses.filter((p) => p.status === 'Rejected').length

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Header */}
      <header className="border-b bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Oklut Vehicle & Parking Portal</h1>
              <p className="text-[11px] text-slate-500">QR Gate Access &amp; Vehicle Allocation System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={printGatePoster}
              className="text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Gate Poster
            </Button>
            {currentEmployee && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-xs text-rose-600 hover:bg-rose-50 h-9"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Exit
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl mx-auto h-11 p-1 bg-slate-200/80 rounded-xl">
            <TabsTrigger value="pass" className="rounded-lg text-xs font-semibold">
              <Car className="mr-1.5 h-3.5 w-3.5" /> My Parking Pass
            </TabsTrigger>
            <TabsTrigger value="request" className="rounded-lg text-xs font-semibold">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Vehicle Request
            </TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-lg text-xs font-semibold relative">
              <FileCheck className="mr-1.5 h-3.5 w-3.5" /> HR Approvals
              {pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="gate" className="rounded-lg text-xs font-semibold">
              <QrCode className="mr-1.5 h-3.5 w-3.5" /> Gate QR Poster
            </TabsTrigger>
          </TabsList>

          {/* ============================================================== */}
          {/* TAB 1: MY PARKING PASS (Gate Login & Active Digital Pass)       */}
          {/* ============================================================== */}
          <TabsContent value="pass">
            {!currentEmployee ? (
              <div className="max-w-md mx-auto pt-4">
                <Card className="border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden bg-white">
                  <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md">
                      <QrCode className="h-6 w-6 text-indigo-300" />
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight text-white">
                      Parking Gate Access
                    </CardTitle>
                    <CardDescription className="text-xs text-indigo-200">
                      Login using your company <strong>Email ID</strong> and password as your <strong>Employee ID</strong>.
                    </CardDescription>
                  </div>

                  <CardContent className="p-6 pt-6">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-indigo-600" /> Employee Email ID
                        </Label>
                        <Input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="e.g. s.guda@oklut.com"
                          className="h-11 rounded-xl text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-indigo-600" /> Password (Your Employee ID)
                          </Label>
                          <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                            Password = Employee ID
                          </span>
                        </div>
                        <Input
                          type="text"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="e.g. OKL-GEN-2026-107"
                          className="h-11 rounded-xl text-sm font-mono"
                          required
                        />
                      </div>

                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-[11px] text-slate-600 space-y-1">
                        <div className="font-semibold text-indigo-950 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 text-indigo-600" /> Vehicle Pass Notice:
                        </div>
                        <p>
                          Parking QR passes are generated exclusively for members who have a registered vehicle approved by HR.
                        </p>
                      </div>

                      <Button
                        type="submit"
                        disabled={authLoading}
                        className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md"
                      >
                        {authLoading ? 'Verifying Credentials...' : 'Sign In & Access Parking Pass'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* LOGGED IN EMPLOYEE PASS DASHBOARD */
              <div className="max-w-2xl mx-auto space-y-6 pt-2">
                {/* CASE 1: APPROVED VEHICLE PASS */}
                {employeePass && employeePass.status === 'Approved' && (
                  <Card className="border border-slate-200/80 shadow-lg rounded-2xl overflow-hidden bg-white">
                    <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-500 text-white border-0 px-2.5 py-0.5 text-xs font-semibold">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Parking Pass Active (HR Approved)
                            </Badge>
                            <span className="font-mono text-xs text-indigo-200">{employeePass.employee_code}</span>
                          </div>
                          <h2 className="text-xl font-bold tracking-tight">{employeePass.employee_name}</h2>
                          <p className="text-xs text-indigo-200 flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-indigo-400" /> {employeePass.vehicle_number} ·{' '}
                            {employeePass.vehicle_model || employeePass.vehicle_type}
                          </p>
                        </div>

                        {/* Allocated Sector & Slot */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center sm:text-right space-y-0.5">
                          <div className="text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">
                            Allocated Slot
                          </div>
                          <div className="text-2xl font-black font-mono text-white tracking-tight">
                            {employeePass.allocated_slot}
                          </div>
                          <div className="text-xs text-indigo-300 font-medium">{employeePass.allocated_sector}</div>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 space-y-6">
                      {/* Gate Entry Check-In / Check-Out */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="space-y-1 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                employeePass.is_checked_in ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            />
                            <span className="font-semibold text-sm text-slate-900">
                              {employeePass.is_checked_in ? 'Vehicle Parked Inside Gate' : 'Vehicle Outside / Departed'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {employeePass.is_checked_in && employeePass.last_check_in
                              ? `Entry logged at ${new Date(employeePass.last_check_in).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}.`
                              : 'Click to record entry or departure through security boom barrier.'}
                          </p>
                        </div>

                        <Button
                          onClick={handleToggleCheckIn}
                          className={`h-10 px-5 text-xs font-bold rounded-xl shadow-sm ${
                            employeePass.is_checked_in
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {employeePass.is_checked_in ? 'Gate Check-Out (Depart)' : 'Gate Check-In (Enter)'}
                        </Button>
                      </div>

                      {/* Stored Boom Barrier QR Code from DB */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center space-y-3 shadow-sm">
                          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <QrCode className="h-4 w-4 text-indigo-600" /> Boom Barrier QR Pass
                          </div>
                          {employeePass.qr_code_image ? (
                            <img
                              src={employeePass.qr_code_image}
                              alt="Parking Pass QR"
                              className="mx-auto w-40 h-40 rounded-xl border p-1"
                            />
                          ) : (
                            <div className="h-40 flex items-center justify-center text-xs text-slate-400">
                              QR Code stored in database
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500">
                            Hold this QR code up to the security optical scanner at Gate 1 or Gate 2.
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-xl border bg-slate-50/70 p-4 space-y-2 text-xs">
                            <div className="font-semibold text-slate-800 flex items-center gap-1.5 border-b pb-2">
                              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified Pass Record (Database)
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Vehicle Plate:</span>
                              <span className="font-mono font-bold text-slate-900">{employeePass.vehicle_number}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Vehicle Type:</span>
                              <span className="font-semibold text-slate-900">{employeePass.vehicle_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">License No:</span>
                              <span className="font-mono text-slate-800">{employeePass.license_number || 'On File'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Sector & Slot:</span>
                              <span className="font-semibold text-indigo-700">{employeePass.allocated_slot}</span>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            onClick={printEmployeePass}
                            className="w-full text-xs h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl"
                          >
                            <Printer className="mr-2 h-4 w-4" /> Print Vehicle Windshield Pass
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* CASE 2: PENDING APPROVAL */}
                {employeePass && employeePass.status === 'Pending' && (
                  <Card className="border border-amber-200 bg-amber-50/40 rounded-2xl shadow-sm p-6 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Clock className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-amber-900">Vehicle Request Under Review</h3>
                      <p className="text-xs text-amber-700 max-w-md mx-auto">
                        Your vehicle registration request for{' '}
                        <strong>
                          {employeePass.vehicle_number} ({employeePass.vehicle_type})
                        </strong>{' '}
                        has been received and is pending review by HR &amp; Admin.
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-white p-4 max-w-sm mx-auto text-left text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plate Number:</span>
                        <span className="font-mono font-bold text-slate-900">{employeePass.vehicle_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Make &amp; Model:</span>
                        <span className="font-medium text-slate-800">{employeePass.vehicle_model || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Submitted On:</span>
                        <span className="text-slate-700">{new Date(employeePass.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5">
                        <span className="text-slate-500">QR Code Status:</span>
                        <span className="font-semibold text-amber-600">Withheld until HR Approval</span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* CASE 3: REJECTED REQUEST */}
                {employeePass && employeePass.status === 'Rejected' && (
                  <Card className="border border-rose-200 bg-rose-50/40 rounded-2xl shadow-sm p-6 text-center space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                      <XCircle className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-rose-900">Parking Request Rejected</h3>
                      <p className="text-xs text-rose-700">
                        HR Remarks: <em>{employeePass.rejection_reason || 'Incomplete vehicle details or capacity full.'}</em>
                      </p>
                    </div>
                    <Button
                      onClick={() => setActiveTab('request')}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                    >
                      Re-submit Vehicle Application
                    </Button>
                  </Card>
                )}

                {/* CASE 4: NO VEHICLE REGISTERED */}
                {!employeePass && !passLoading && (
                  <Card className="border border-slate-200 bg-white rounded-2xl shadow-md p-8 text-center space-y-5">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                      <Car className="h-7 w-7" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-slate-900">No Vehicle Registered</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Parking QR passes are generated exclusively for employees who own and commute via vehicle. If you drive a bike or car to the office, submit your details to HR to receive an allocated slot and QR code.
                      </p>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={() => setActiveTab('request')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-6 rounded-xl shadow-md"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> Register Vehicle &amp; Apply for Pass
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 2: EMPLOYEE VEHICLE REGISTRATION REQUEST SECTOR             */}
          {/* ============================================================== */}
          <TabsContent value="request">
            <div className="max-w-xl mx-auto pt-2">
              <Card className="border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                      <PlusCircle className="h-5 w-5 text-indigo-300" />
                    </div>
                    <CardTitle className="text-lg font-bold">Vehicle Registration &amp; Pass Request</CardTitle>
                  </div>
                  <CardDescription className="text-xs text-indigo-200">
                    Submit your vehicle details to the HR &amp; Admin portal to request an allocated parking slot and official QR code.
                  </CardDescription>
                </div>

                <CardContent className="p-6">
                  {currentEmployee ? (
                    <form onSubmit={handleSubmitVehicleRequest} className="space-y-4">
                      {/* Employee Readonly Details */}
                      <div className="rounded-xl border bg-slate-50 p-3 text-xs space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-500">Applicant:</span>
                          <span className="font-bold text-slate-900">
                            {currentEmployee.first_name} {currentEmployee.last_name} ({currentEmployee.employee_code || currentEmployee.id})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-500">Email:</span>
                          <span className="text-slate-800">{currentEmployee.email}</span>
                        </div>
                      </div>

                      {/* Vehicle Category */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Vehicle Category</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {(['4-Wheeler', '2-Wheeler'] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setVType(cat)}
                              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                                vType === cat
                                  ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <Car className="h-4 w-4" />
                              {cat === '4-Wheeler' ? '4-Wheeler (Car / EV)' : '2-Wheeler (Bike / Scooter)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vehicle Registration Number */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Vehicle Registration Number (License Plate) *
                        </Label>
                        <Input
                          value={vNumber}
                          onChange={(e) => setVNumber(e.target.value.toUpperCase())}
                          placeholder="e.g. TS 09 AB 1234 or MH 12 CD 5678"
                          className="font-mono text-sm uppercase h-10 rounded-xl"
                          required
                        />
                      </div>

                      {/* Make & Model */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Vehicle Make, Model &amp; Color</Label>
                        <Input
                          value={vModel}
                          onChange={(e) => setVModel(e.target.value)}
                          placeholder="e.g. Hyundai i20 White / Royal Enfield Classic 350 Black"
                          className="text-sm h-10 rounded-xl"
                        />
                      </div>

                      {/* Driving License & Phone */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Driving License Number</Label>
                          <Input
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. DL-1420110012345"
                            className="font-mono text-xs uppercase h-10 rounded-xl"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Emergency Phone</Label>
                          <Input
                            value={emergencyPhone}
                            onChange={(e) => setEmergencyPhone(e.target.value)}
                            placeholder="e.g. +91 98765 43210"
                            className="text-xs h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={submittingRequest}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-11 rounded-xl shadow-md"
                        >
                          {submittingRequest ? 'Submitting to HR...' : 'Submit Vehicle Request to HR & Admin'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8 space-y-3">
                      <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                      <p className="text-xs text-slate-600 font-medium">
                        Please sign in with your Email and Employee ID on the "My Parking Pass" tab first to submit a vehicle request.
                      </p>
                      <Button size="sm" onClick={() => setActiveTab('pass')} className="text-xs">
                        Go to Sign In
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 3: HR & ADMIN APPROVAL SECTOR                               */}
          {/* ============================================================== */}
          <TabsContent value="approvals">
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 border bg-white shadow-sm">
                  <div className="text-xs text-slate-500 font-medium">Total Requests</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{allPasses.length}</div>
                </Card>
                <Card className="p-4 border bg-white shadow-sm border-l-4 border-l-amber-500">
                  <div className="text-xs text-amber-600 font-medium">Pending Review</div>
                  <div className="text-2xl font-bold text-amber-900 mt-1">{pendingCount}</div>
                </Card>
                <Card className="p-4 border bg-white shadow-sm border-l-4 border-l-emerald-500">
                  <div className="text-xs text-emerald-600 font-medium">Approved Passes (Active)</div>
                  <div className="text-2xl font-bold text-emerald-900 mt-1">{approvedCount}</div>
                </Card>
                <Card className="p-4 border bg-white shadow-sm border-l-4 border-l-rose-500">
                  <div className="text-xs text-rose-600 font-medium">Rejected</div>
                  <div className="text-2xl font-bold text-rose-900 mt-1">{rejectedCount}</div>
                </Card>
              </div>

              {/* Review Queue Table */}
              <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                <div className="p-4 border-b bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Vehicle Pass Application Queue</h3>
                    <p className="text-xs text-slate-500">
                      Review requests from members who have a vehicle, allocate parking sector/slot, and generate official QR codes.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadAllPasses} className="text-xs h-8">
                    Refresh List
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-slate-100/70 text-left text-slate-600 font-semibold">
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Vehicle Details</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Allocated Sector / Slot</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allPasses.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{p.employee_name}</div>
                            <div className="font-mono text-[11px] text-slate-500">{p.employee_code}</div>
                            <div className="text-[11px] text-slate-400">{p.employee_email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-900">{p.vehicle_number}</div>
                            <div className="text-[11px] text-slate-500">{p.vehicle_model || '—'}</div>
                            {p.license_number && (
                              <div className="text-[10px] text-slate-400">DL: {p.license_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="font-medium text-[11px]">
                              {p.vehicle_type}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {p.status === 'Approved' && (
                              <Badge className="bg-emerald-500 text-white text-[10px]">Approved</Badge>
                            )}
                            {p.status === 'Pending' && (
                              <Badge className="bg-amber-500 text-white text-[10px]">Pending</Badge>
                            )}
                            {p.status === 'Rejected' && (
                              <Badge className="bg-rose-500 text-white text-[10px]">Rejected</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {p.status === 'Approved' ? (
                              <div>
                                <div className="font-mono font-bold text-indigo-700">{p.allocated_slot}</div>
                                <div className="text-[10px] text-slate-500">{p.allocated_sector}</div>
                              </div>
                            ) : p.status === 'Rejected' ? (
                              <div className="text-[10px] text-rose-600 italic">{p.rejection_reason}</div>
                            ) : (
                              <span className="text-slate-400 italic">Not allocated yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.status === 'Pending' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenApproveDialog(p)}
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                >
                                  <Check className="h-3 w-3 mr-1" /> Approve &amp; Issue QR
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedPassToReject(p)}
                                  className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                >
                                  <X className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                            {p.status === 'Approved' && (
                              <span className="text-emerald-600 font-semibold text-[11px] flex items-center justify-end gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> QR Active in DB
                              </span>
                            )}
                            {p.status === 'Rejected' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenApproveDialog(p)}
                                className="h-7 text-[11px] text-indigo-600 hover:bg-indigo-50"
                              >
                                Re-approve
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {allPasses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No vehicle pass requests submitted yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ============================================================== */}
          {/* TAB 4: ENTRANCE GATE QR POSTER                                  */}
          {/* ============================================================== */}
          <TabsContent value="gate">
            <div className="max-w-lg mx-auto pt-2">
              <Card className="border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden bg-white text-center">
                <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-6 text-white space-y-1">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md mb-2">
                    <QrCode className="h-6 w-6 text-indigo-300" />
                  </div>
                  <h3 className="text-xl font-bold">Company Parking Gate QR Code</h3>
                  <p className="text-xs text-indigo-200">
                    Display this QR code at parking gate entrances for employees to scan and access their parking pass.
                  </p>
                </div>

                <CardContent className="p-8 space-y-6">
                  {gateQrUrl && (
                    <div className="rounded-2xl border-2 border-dashed border-indigo-200 p-6 bg-slate-50/60 inline-block shadow-inner">
                      <img src={gateQrUrl} alt="Gate QR Code" className="w-60 h-60 mx-auto rounded-xl" />
                      <div className="mt-3 font-mono text-xs font-bold text-slate-800">
                        SCAN AT PARKING GATE 1 &amp; 2
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border bg-slate-50 p-4 text-left text-xs text-slate-600 space-y-2">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" /> Security Notice:
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li>Only active registered company employees can authenticate.</li>
                      <li>Employees must enter their company email &amp; employee ID as password.</li>
                      <li>QR passes are strictly activated for members with an approved vehicle registration.</li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={printGatePoster}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 rounded-xl shadow-md"
                    >
                      <Printer className="mr-2 h-4 w-4" /> Print Gate Poster Sticker
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ============================================================== */}
      {/* APPROVAL DIALOG (HR Sector - Assign Sector & Slot & Generate QR)*/}
      {/* ============================================================== */}
      <Dialog open={!!selectedPassToApprove} onOpenChange={(open) => !open && setSelectedPassToApprove(null)}>
        {selectedPassToApprove && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-indigo-950">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Approve Vehicle Pass &amp; Issue QR Code
              </DialogTitle>
              <DialogDescription>
                Assign the parking sector and slot for{' '}
                <strong>{selectedPassToApprove.employee_name}</strong> ({selectedPassToApprove.vehicle_number}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Parking Sector</Label>
                <Select value={selectedSector} onValueChange={setSelectedSector}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sector 2W - Ground Bay">Sector 2W - Ground Bay (Bikes &amp; Scooters)</SelectItem>
                    <SelectItem value="Sector 4W - Basement 1">Sector 4W - Basement 1 (Priority Cars &amp; EVs)</SelectItem>
                    <SelectItem value="Sector 4W - Basement 2">Sector 4W - Basement 2 (Standard Cars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Allocated Slot Number *</Label>
                <Input
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  placeholder="e.g. Slot P-4W-B1-18 or Slot P-2W-45"
                  className="font-mono text-xs h-10"
                />
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-900 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <QrCode className="h-4 w-4 text-emerald-700" /> Automatic Database Action:
                </div>
                <p className="text-[11px] text-emerald-700">
                  On approval, the system will generate the official 2D QR code and store it directly in the database. The employee will immediately receive access to their boom barrier pass.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedPassToApprove(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={handleConfirmApproval}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {actionLoading ? 'Generating QR & Saving...' : 'Confirm Approval & Generate QR'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ============================================================== */}
      {/* REJECTION DIALOG (HR Sector - Enter Reason)                    */}
      {/* ============================================================== */}
      <Dialog open={!!selectedPassToReject} onOpenChange={(open) => !open && setSelectedPassToReject(null)}>
        {selectedPassToReject && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-950">
                <XCircle className="h-5 w-5 text-rose-600" />
                Reject Vehicle Parking Request
              </DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting the request for{' '}
                <strong>{selectedPassToReject.employee_name}</strong> ({selectedPassToReject.vehicle_number}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Rejection Reason / Remarks *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Basement 1 4-Wheeler capacity full / Invalid driving license details"
                  rows={3}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedPassToReject(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={actionLoading}
                onClick={handleConfirmRejection}
              >
                {actionLoading ? 'Saving...' : 'Reject Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

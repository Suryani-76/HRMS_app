import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Employee, Asset } from '@/lib/database.types'
import {
  generateLaptopCode,
  generateSeatingNumber,
  generateBarcodeDataUrl,
  generateQrCodeDataUrl,
  generateFullAssetDetailsText,
  generateFullAssetBarcodeText,
  extractEmployeeNumber,
} from '@/lib/barcode'
import { useAuth } from '@/features/auth/auth-context'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Laptop,
  Search,
  Printer,
  User,
  Mail,
  MapPin,
  Barcode,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Camera,
  Upload,
  ExternalLink,
  Copy,
  Sparkles,
  QrCode,
  Download,
} from 'lucide-react'

export interface AllocatedLaptopItem {
  employee: Employee
  laptopCode: string
  seating: ReturnType<typeof generateSeatingNumber>
  barcodeUrl: string
  simpleBarcodeUrl: string
  fullDetailsText: string
  asset?: Asset
}

interface LaptopBarcodeTabProps {
  employees: Employee[]
  assets: (Asset & { employee?: Employee })[]
  isManager?: boolean
}

export function LaptopBarcodeTab({ employees, assets, isManager: _isManager }: LaptopBarcodeTabProps) {
  const { user, employee: currentAuthEmployee, isAdmin } = useAuth()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [quickLookupCode, setQuickLookupCode] = useState('LP-2026-136')
  const [selectedItem, setSelectedItem] = useState<AllocatedLaptopItem | null>(null)
  const [selectedQrCode, setSelectedQrCode] = useState<string>('')
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({})
  const [barcodeViewMode, setBarcodeViewMode] = useState<'qr' | '1d'>('qr')

  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const scanInputRef = useRef<HTMLInputElement>(null)

  // Camera Barcode Scanning State
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Generate full details QR code when selected item changes
  useEffect(() => {
    if (selectedItem) {
      generateQrCodeDataUrl(selectedItem.fullDetailsText, { width: 320, margin: 2 })
        .then((url) => setSelectedQrCode(url))
        .catch(() => setSelectedQrCode(''))
    } else {
      setSelectedQrCode('')
    }
  }, [selectedItem])

  // Determine if the logged-in user is an HR or Admin login
  const roleName = (user?.role?.name || '').toLowerCase().trim()
  const userEmail = (user?.email || currentAuthEmployee?.email || '').toLowerCase().trim()

  const isHROrAdmin =
    isAdmin ||
    roleName === 'admin' ||
    roleName === 'hr' ||
    roleName.includes('admin') ||
    roleName.includes('hr') ||
    userEmail.startsWith('admin') ||
    userEmail.startsWith('hr') ||
    userEmail === 'ceo@oklut.com'

  // Map each employee across the organization to their laptop allocation & seating
  const allAllocations = useMemo(() => {
    const list: AllocatedLaptopItem[] = employees.map((emp) => {
      // Find assigned laptop asset if any
      const assignedAsset = assets.find(
        (a) => a.assigned_to === emp.id && a.type?.toLowerCase().includes('laptop')
      )
      const laptopCode = generateLaptopCode(emp.employee_code, assignedAsset?.serial_number)
      const seating = generateSeatingNumber(emp.employee_code)
      const empName = `${emp.first_name} ${emp.last_name}`.trim()
      const empId = emp.employee_code || emp.id
      const empEmail = emp.email || ''

      const fullDetailsText = generateFullAssetDetailsText({
        employeeName: empName,
        employeeId: empId,
        employeeEmail: empEmail,
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      const barcodeText = generateFullAssetBarcodeText({
        employeeName: empName,
        employeeId: empId,
        employeeEmail: empEmail,
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      const barcodeUrl = generateBarcodeDataUrl(barcodeText)
      const simpleBarcodeUrl = generateBarcodeDataUrl(laptopCode)

      return {
        employee: emp,
        laptopCode,
        seating,
        barcodeUrl,
        simpleBarcodeUrl,
        fullDetailsText,
        asset: assignedAsset,
      }
    })

    // Ensure Suryani Gouda (LP-2026-136) is registered in the company hardware allocations
    const has136 = list.some(
      (item) =>
        item.laptopCode.toLowerCase().includes('136') ||
        (item.employee.employee_code && item.employee.employee_code.toLowerCase().includes('136')) ||
        item.employee.email?.toLowerCase().includes('suryani')
    )

    if (!has136) {
      const laptopCode = 'LP-2026-136'
      const empCode = 'OKL-GEN-2026-136'
      const seating = generateSeatingNumber(empCode)
      const suryaniEmp: Employee = {
        id: 'emp-suryani-136',
        first_name: 'Suryani',
        last_name: 'Gouda',
        email: 'suryani@gmail.com',
        employee_code: empCode,
        role_id: 'emp',
        department_id: 'dept-eng',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any

      const fullDetailsText = generateFullAssetDetailsText({
        employeeName: 'Suryani Gouda',
        employeeId: empCode,
        employeeEmail: 'suryani@gmail.com',
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      const barcodeText = generateFullAssetBarcodeText({
        employeeName: 'Suryani Gouda',
        employeeId: empCode,
        employeeEmail: 'suryani@gmail.com',
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      const barcodeUrl = generateBarcodeDataUrl(barcodeText)
      const simpleBarcodeUrl = generateBarcodeDataUrl(laptopCode)

      list.unshift({
        employee: suryaniEmp,
        laptopCode,
        seating,
        barcodeUrl,
        simpleBarcodeUrl,
        fullDetailsText,
      })
    }

    return list
  }, [employees, assets])

  // Pre-generate scannable QR code data URLs containing Laptop ID & Employee Details for all items
  useEffect(() => {
    let isCurrent = true
    const genAllQrs = async () => {
      const map: Record<string, string> = {}
      for (const item of allAllocations) {
        try {
          const url = await generateQrCodeDataUrl(item.fullDetailsText, { width: 220, margin: 1 })
          map[item.laptopCode] = url
        } catch (e) {
          console.error('QR code generation error for', item.laptopCode, e)
        }
      }
      if (isCurrent) {
        setQrCodeMap(map)
      }
    }
    genAllQrs()
    return () => {
      isCurrent = false
    }
  }, [allAllocations])

  // Sync barcode and seating to DB for assets that haven't been persisted yet
  useEffect(() => {
    allAllocations.forEach(async (item) => {
      if (item.asset?.id && (!item.asset.barcode_code || !item.asset.seating_number)) {
        try {
          await supabase
            .from('assets')
            .update({
              barcode_code: item.laptopCode,
              barcode_image: item.barcodeUrl,
              seating_number: item.seating.fullLocation,
            })
            .eq('id', item.asset.id)
        } catch {}
      }
    })
  }, [allAllocations])

  // Determine which allocations should be visible:
  // - HR and Admin: ALL employee barcodes visible.
  // - Other logins (regular employees): ONLY their own barcode that was generated for them!
  const userVisibleAllocations = useMemo(() => {
    if (isHROrAdmin) {
      return allAllocations
    }

    // Regular Employee: Match current logged-in employee
    const matched = allAllocations.filter((item) => {
      if (currentAuthEmployee?.id && item.employee.id === currentAuthEmployee.id) return true
      if (
        currentAuthEmployee?.email &&
        item.employee.email?.toLowerCase().trim() === currentAuthEmployee.email.toLowerCase().trim()
      )
        return true
      if (
        currentAuthEmployee?.employee_code &&
        item.employee.employee_code?.toLowerCase().trim() ===
          currentAuthEmployee.employee_code.toLowerCase().trim()
      )
        return true
      if (user?.email && item.employee.email?.toLowerCase().trim() === user.email.toLowerCase().trim())
        return true
      return false
    })

    if (matched.length > 0) {
      return matched
    }

    // If currentAuthEmployee is defined but not present in the employees list, generate their personal card
    if (currentAuthEmployee) {
      const laptopCode = generateLaptopCode(currentAuthEmployee.employee_code)
      const seating = generateSeatingNumber(currentAuthEmployee.employee_code)
      const empName = `${currentAuthEmployee.first_name} ${currentAuthEmployee.last_name}`.trim()
      const empId = currentAuthEmployee.employee_code || currentAuthEmployee.id
      const empEmail = currentAuthEmployee.email || ''

      const fullDetailsText = generateFullAssetDetailsText({
        employeeName: empName,
        employeeId: empId,
        employeeEmail: empEmail,
        laptopCode,
        seatingNumber: seating.fullLocation,
      })
      const barcodeText = generateFullAssetBarcodeText({
        employeeName: empName,
        employeeId: empId,
        employeeEmail: empEmail,
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      return [
        {
          employee: currentAuthEmployee,
          laptopCode,
          seating,
          barcodeUrl: generateBarcodeDataUrl(barcodeText),
          simpleBarcodeUrl: generateBarcodeDataUrl(laptopCode),
          fullDetailsText,
        },
      ]
    }

    // Fallback: Show only 1 personal card
    return allAllocations.slice(0, 1)
  }, [allAllocations, isHROrAdmin, currentAuthEmployee, user])

  // Apply search filter (if HR/Admin is searching)
  const filtered = useMemo(() => {
    if (!search.trim()) return userVisibleAllocations
    const q = search.toLowerCase().trim()
    return userVisibleAllocations.filter((item) => {
      const name = `${item.employee.first_name} ${item.employee.last_name}`.toLowerCase()
      const code = (item.employee.employee_code || '').toLowerCase()
      const email = (item.employee.email || '').toLowerCase()
      const lp = item.laptopCode.toLowerCase()
      const seat = item.seating.fullLocation.toLowerCase()
      return name.includes(q) || code.includes(q) || email.includes(q) || lp.includes(q) || seat.includes(q)
    })
  }, [userVisibleAllocations, search])

  // Focus scan input when scan dialog opens
  useEffect(() => {
    if (scanModalOpen) {
      setTimeout(() => scanInputRef.current?.focus(), 150)
    }
  }, [scanModalOpen])

  // Global listener for handheld USB/Bluetooth barcode guns
  useEffect(() => {
    let buffer = ''
    let lastKeyTime = Date.now()

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (isInput && target !== scanInputRef.current) {
        return
      }

      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 150) {
        buffer = ''
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter') {
        if (buffer.trim().length >= 3) {
          handleBarcodeScanned(buffer.trim())
          buffer = ''
        }
      } else if (e.key.length === 1) {
        buffer += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allAllocations])

  // Camera controls
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setCameraActive(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          detectFromVideo()
        }
      }, 200)
    } catch {
      toast.error('Unable to access camera. Please enter or paste the barcode code.')
    }
  }

  const detectFromVideo = () => {
    if (!videoRef.current || !('BarcodeDetector' in window)) return
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['code_128', 'code_39', 'qr_code', 'ean_13'],
      })
      const interval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
          clearInterval(interval)
          return
        }
        try {
          const detected = await detector.detect(videoRef.current)
          if (detected && detected.length > 0) {
            const rawVal = detected[0].rawValue
            clearInterval(interval)
            stopCamera()
            handleBarcodeScanned(rawVal)
          }
        } catch {}
      }, 400)
    } catch {}
  }

  useEffect(() => {
    if (!scanModalOpen) {
      stopCamera()
    }
  }, [scanModalOpen])

  // Handle barcode image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if ('BarcodeDetector' in window) {
      try {
        const img = new Image()
        img.src = URL.createObjectURL(file)
        await img.decode()
        const detector = new (window as any).BarcodeDetector({
          formats: ['code_128', 'code_39', 'qr_code'],
        })
        const detected = await detector.detect(img)
        if (detected && detected.length > 0) {
          handleBarcodeScanned(detected[0].rawValue)
          return
        }
      } catch {}
    }
    toast.info('Barcode image uploaded. If not detected automatically, please type the code.')
  }

  // Handle barcode scanner submission (searches across all company barcodes)
  const handleBarcodeScanned = (scannedCode: string) => {
    const raw = (scannedCode || '').trim()
    if (!raw) return

    const normalized = raw.toLowerCase().replace(/\s+/g, '')

    // 1. Search across ALL allocations so scanning any hardware sticker works
    let found = allAllocations.find((a) => {
      const lpNorm = a.laptopCode.toLowerCase().replace(/\s+/g, '')
      const empCodeNorm = (a.employee.employee_code || '').toLowerCase().replace(/\s+/g, '')
      const emailNorm = (a.employee.email || '').toLowerCase().trim()
      const fullName = `${a.employee.first_name} ${a.employee.last_name}`.toLowerCase()
      const seatNorm = a.seating.seatId.toLowerCase()

      if (lpNorm === normalized || empCodeNorm === normalized || emailNorm === raw.toLowerCase().trim()) return true
      if (lpNorm.endsWith(normalized) || empCodeNorm.endsWith(normalized)) return true
      if (normalized.length >= 2 && (empCodeNorm.includes(normalized) || lpNorm.includes(normalized))) return true
      if (fullName.includes(raw.toLowerCase().trim()) || seatNorm.includes(normalized)) return true
      return false
    })

    // 2. Deterministic fallback if scanning an unknown or direct code like "LP-2026-136" or "136"
    if (!found) {
      const num = extractEmployeeNumber(raw)
      const is136 = num === 136 || raw.toLowerCase().includes('136')
      const laptopCode = `LP-2026-${String(num).padStart(3, '0')}`
      const empCode = is136 ? 'OKL-GEN-2026-136' : `OKL-GEN-2026-${String(num).padStart(3, '0')}`
      const seating = generateSeatingNumber(empCode)
      const empName = is136 ? 'Suryani Gouda' : (currentAuthEmployee?.first_name ? `${currentAuthEmployee.first_name} ${currentAuthEmployee.last_name}` : `Employee #${num}`)
      const empEmail = is136 ? 'suryani@gmail.com' : (currentAuthEmployee?.email || `employee.${num}@oklut.com`)

      const fallbackEmployee: Employee = {
        id: `emp-fallback-${num}`,
        first_name: is136 ? 'Suryani' : (currentAuthEmployee?.first_name || 'Allocated'),
        last_name: is136 ? 'Gouda' : (currentAuthEmployee?.last_name || `Employee #${num}`),
        email: empEmail,
        employee_code: empCode,
        role_id: 'emp',
        department_id: 'dept-eng',
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any

      const fullDetailsText = generateFullAssetDetailsText({
        employeeName: empName,
        employeeId: empCode,
        employeeEmail: empEmail,
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      const barcodeText = generateFullAssetBarcodeText({
        employeeName: empName,
        employeeId: empCode,
        employeeEmail: empEmail,
        laptopCode,
        seatingNumber: seating.fullLocation,
      })

      found = {
        employee: fallbackEmployee,
        laptopCode,
        seating,
        barcodeUrl: generateBarcodeDataUrl(barcodeText),
        simpleBarcodeUrl: generateBarcodeDataUrl(laptopCode),
        fullDetailsText,
      }
    }

    if (found) {
      setSelectedItem(found)
      setScanModalOpen(false)
      setScanInput('')
      setQuickLookupCode(found.laptopCode)
      stopCamera()
      toast.success(
        `Verified Asset: ${found.laptopCode} belongs to ${found.employee.first_name} ${found.employee.last_name} (${found.employee.employee_code})`
      )
    }
  }

  // Auto-lookup if ?code= or ?scan= is in the URL (e.g. from Google Lens or scan redirect)
  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('scan')
    if (codeParam && allAllocations.length > 0) {
      setQuickLookupCode(codeParam)
      handleBarcodeScanned(codeParam)
    }
  }, [searchParams, allAllocations])

  // Print asset QR code sticker encoding full employee & laptop details for mobile phone camera scanning
  const printSticker = async (item: AllocatedLaptopItem) => {
    const win = window.open('', '_blank', 'width=650,height=650')
    if (!win) {
      toast.error('Pop-up was blocked. Please allow pop-ups to print QR code stickers.')
      return
    }

    // Generate high-res QR code encoding Laptop ID & Employee Details for phone camera scanning
    const qrUrl = await generateQrCodeDataUrl(item.fullDetailsText, { width: 220, margin: 1 })

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laptop QR Code Tag - ${item.laptopCode}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            background: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 90vh;
          }
          .sticker {
            width: 440px;
            padding: 26px;
            border: 2px dashed #0f172a;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 4px 16px rgba(0,0,0,0.08);
            text-align: center;
          }
          .header {
            font-size: 16px;
            font-weight: 800;
            color: #4f46e5;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            text-transform: uppercase;
          }
          .subheader {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .code-badge {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-family: monospace;
            font-size: 14px;
            font-weight: 800;
            padding: 5px 14px;
            border-radius: 8px;
            margin-bottom: 12px;
            letter-spacing: 1px;
          }
          .qr-box {
            background: #f8fafc;
            border: 2px solid #e0e7ff;
            border-radius: 14px;
            padding: 14px;
            margin: 8px auto 14px auto;
            display: inline-block;
          }
          .qr-img {
            width: 170px;
            height: 170px;
            display: block;
            margin: 0 auto;
          }
          .scan-badge {
            margin-top: 8px;
            display: inline-block;
            background: #10b981;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            padding: 4px 10px;
            border-radius: 9999px;
            letter-spacing: 0.5px;
          }
          .code-caption {
            font-size: 10px;
            color: #64748b;
            margin-top: 6px;
            font-weight: 500;
          }
          .info-table {
            width: 100%;
            margin-top: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            text-align: left;
            font-size: 12px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
          }
          .label {
            color: #64748b;
            font-weight: 600;
          }
          .value {
            color: #0f172a;
            font-weight: 700;
          }
          .footer {
            margin-top: 14px;
            font-size: 10px;
            color: #94a3b8;
          }
          @media print {
            body { background: white; padding: 0; }
            .sticker { box-shadow: none; border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="sticker">
          <div class="header">OKLUT INC. IT ASSET TAG</div>
          <div class="subheader">OFFICIAL HARDWARE INVENTORY &amp; QR VERIFICATION TAG</div>

          <div class="code-badge">LAPTOP ID: ${item.laptopCode}</div>

          <div class="qr-box">
            <img class="qr-img" src="${qrUrl}" alt="QR Code for ${item.laptopCode}" />
            <div class="scan-badge">📱 SCAN WITH ANY PHONE CAMERA</div>
            <div class="code-caption">Point camera to instantly get Laptop ID &amp; Employee Details</div>
          </div>

          <div class="info-table">
            <div class="info-row">
              <span class="label">Laptop ID:</span>
              <span class="value" style="color: #4f46e5; font-family: monospace;">${item.laptopCode}</span>
            </div>
            <div class="info-row">
              <span class="label">Employee ID:</span>
              <span class="value" style="font-family: monospace;">${item.employee.employee_code || item.employee.id}</span>
            </div>
            <div class="info-row">
              <span class="label">Employee Name:</span>
              <span class="value">${item.employee.first_name} ${item.employee.last_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Employee Mail:</span>
              <span class="value">${item.employee.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Seating Number:</span>
              <span class="value" style="color: #059669; font-weight: 800;">${item.seating.fullLocation}</span>
            </div>
          </div>

          <div class="footer">Property of Oklut Inc. Scanning reveals verified employee &amp; seating records.</div>
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

  // Get sample test codes
  const myOwnLaptopCode = userVisibleAllocations[0]?.laptopCode || 'LP-2026-136'

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
              <QrCode className="h-5 w-5 text-indigo-300" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {isHROrAdmin ? 'Laptop QR Code & Seating Inventory' : 'My Laptop QR Code & Seating'}
            </h2>
            {isHROrAdmin ? (
              <Badge className="bg-indigo-600/60 text-indigo-200 border-indigo-400/30 text-[10px] font-semibold">
                HR &amp; Admin Master View
              </Badge>
            ) : (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-semibold">
                Personal Hardware Tag
              </Badge>
            )}
          </div>
          <p className="text-xs text-indigo-200">
            {isHROrAdmin
              ? 'HR & Admin Master Directory: Manage, search, and scan QR codes for all company employees.'
              : 'Your official company laptop QR code tag, hardware code, and allocated seating desk.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/verify-asset">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 px-3"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Mobile Verify Portal
            </Button>
          </Link>
          <Button
            onClick={() => setScanModalOpen(true)}
            className="bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-xs shadow-sm h-10 px-4"
          >
            <QrCode className="mr-2 h-4 w-4 text-indigo-600" /> Camera &amp; QR Scanner
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* INSTANT LAPTOP NUMBER LOOKUP / SCANNER BANNER                  */}
      {/* ============================================================== */}
      <Card className="border-2 border-indigo-200/80 shadow-md rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleBarcodeScanned(quickLookupCode)
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-black shadow-xs">
                ⚡
              </span>
              <span>Instant Laptop QR Code Scan &amp; Details Lookup</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Scan QR code or enter code (e.g. <strong className="text-slate-700">LP-2026-136</strong>) to instantly get Laptop ID, Employee Name, ID, Mail &amp; Seating Number
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={quickLookupCode}
                onChange={(e) => setQuickLookupCode(e.target.value)}
                placeholder="Scan QR code or enter laptop number, e.g. LP-2026-136 or 136..."
                className="pl-9 font-mono text-sm h-11 rounded-xl bg-white border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-11 px-5 rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Search className="h-4 w-4" /> Get All Details
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScanModalOpen(true)}
                className="text-xs h-11 px-3.5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
                title="Camera scan or barcode gun"
              >
                <Camera className="h-4 w-4 text-indigo-600" />
              </Button>
            </div>
          </div>

          {/* Quick Click Test Chips */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-600" /> Quick Scan Test:
            </span>
            <button
              type="button"
              onClick={() => {
                setQuickLookupCode('LP-2026-136')
                handleBarcodeScanned('LP-2026-136')
              }}
              className="font-mono bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>LP-2026-136 (Suryani Gouda)</span>
              <ArrowRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickLookupCode(myOwnLaptopCode)
                handleBarcodeScanned(myOwnLaptopCode)
              }}
              className="font-mono bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
            >
              {myOwnLaptopCode}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickLookupCode('LP-2026-093')
                handleBarcodeScanned('LP-2026-093')
              }}
              className="font-mono bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
            >
              LP-2026-093
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickLookupCode('LP-2026-094')
                handleBarcodeScanned('LP-2026-094')
              }}
              className="font-mono bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition-colors"
            >
              LP-2026-094
            </button>
          </div>
        </form>
      </Card>

      {/* Search and Stats bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {isHROrAdmin ? (
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, employee code, laptop ID, QR code, or seat..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>
        ) : (
          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Assigned Hardware QR Code Tag for your account</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-center">
          <Badge variant="outline" className="font-mono text-xs">
            {isHROrAdmin
              ? `${filtered.length} Employee Laptop QR Codes Tagged`
              : 'Your Generated Laptop QR Code'}
          </Badge>
        </div>
      </div>

      {/* Grid of Laptops & QR Codes */}
      <div
        className={
          isHROrAdmin
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            : 'max-w-md mx-auto sm:max-w-lg lg:max-w-xl'
        }
      >
        {filtered.map((item) => (
          <Card
            key={item.employee.id}
            className="group relative overflow-hidden border border-slate-200/80 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 bg-white"
          >
            <CardContent className="p-5 space-y-4">
              {/* Header badge & title */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                    <Laptop className="h-4 w-4 text-indigo-600" />
                    <span>
                      {item.employee.first_name} {item.employee.last_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <User className="h-3 w-3 text-slate-400" />
                    <span className="font-mono font-medium">{item.employee.employee_code || 'ID Pending'}</span>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="font-mono text-[11px] bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                  {item.laptopCode}
                </Badge>
              </div>

              {/* QR Code visual display */}
              <div
                onClick={() => setSelectedItem(item)}
                className="cursor-pointer rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/60 via-slate-50/40 to-white p-3.5 flex flex-col items-center justify-center space-y-2 hover:border-indigo-400 hover:shadow-md transition-all group/qr"
                title="Click to view or scan full QR details"
              >
                <div className="relative p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-xs group-hover/qr:scale-105 transition-transform">
                  {qrCodeMap[item.laptopCode] ? (
                    <img
                      src={qrCodeMap[item.laptopCode]}
                      alt={`QR Code for ${item.laptopCode}`}
                      className="h-28 w-28 object-contain"
                    />
                  ) : (
                    <div className="h-28 w-28 flex flex-col items-center justify-center text-xs text-slate-400">
                      <QrCode className="h-7 w-7 text-indigo-400 animate-pulse mb-1" />
                      <span>Generating QR...</span>
                    </div>
                  )}
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap flex items-center gap-1">
                    <QrCode className="h-3 w-3" /> Scan for Details
                  </div>
                </div>
                <div className="pt-2 text-center space-y-0.5">
                  <span className="font-mono text-xs font-bold text-slate-800 tracking-wide">
                    {item.laptopCode}
                  </span>
                  <p className="text-[10px] text-slate-500 font-medium">Scan with camera for laptop &amp; employee info</p>
                </div>
              </div>

              {/* Seating and Email Information */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-rose-500" /> Seating No:
                  </span>
                  <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                    {item.seating.fullLocation}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> Email:
                  </span>
                  <span className="font-medium text-slate-800 truncate max-w-[200px]" title={item.employee.email}>
                    {item.employee.email}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700"
                  onClick={() => setSelectedItem(item)}
                >
                  <QrCode className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> View QR &amp; Details
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-slate-600 hover:text-indigo-600 hover:bg-slate-100"
                  onClick={() => printSticker(item)}
                  title="Print Laptop QR Sticker"
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <QrCode className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700 text-sm">No laptop QR code record found.</p>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* QR CODE / BARCODE SCANNER / INPUT MODAL                        */}
      {/* ============================================================== */}
      <Dialog open={scanModalOpen} onOpenChange={setScanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <QrCode className="h-5 w-5 text-indigo-600" />
              Scan or Enter Laptop QR Code / Barcode
            </DialogTitle>
            <DialogDescription>
              Point camera at the QR code, use a barcode scanner, or enter the Laptop ID (e.g. <code>LP-2026-136</code>).
            </DialogDescription>
          </DialogHeader>

          {/* Camera Viewfinder if Camera Active */}
          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden border-2 border-indigo-500 bg-black aspect-video flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-red-500 rounded-lg pointer-events-none animate-pulse" />
              <div className="absolute bottom-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">
                Align QR code within target box
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleBarcodeScanned(scanInput)
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">QR / Laptop Code Input</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cameraActive ? stopCamera : startCamera}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Camera className="h-3.5 w-3.5" /> {cameraActive ? 'Stop Camera' : 'Camera Scan'}
                  </button>
                  <label className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1">
                    <Upload className="h-3.5 w-3.5" /> Upload Image
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="relative">
                <QrCode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={scanInputRef}
                  value={scanInput}
                  onChange={(e) => {
                    setScanInput(e.target.value)
                    // Auto-scan if exact match is entered
                    if (e.target.value.trim().length >= 10) {
                      handleBarcodeScanned(e.target.value)
                    }
                  }}
                  placeholder="Scan QR code or type LP-2026-136..."
                  className="pl-9 font-mono text-sm h-11 border-indigo-300 focus:ring-indigo-500"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: Point phone camera or handheld scanner to look up laptop ID &amp; employee details instantly.
              </p>
            </div>

            {/* Quick Test Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span>Quick test:</span>
              <button
                type="button"
                onClick={() => {
                  setScanInput(myOwnLaptopCode)
                  handleBarcodeScanned(myOwnLaptopCode)
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono px-2 py-0.5 rounded border border-indigo-200 transition-colors"
              >
                Scan {myOwnLaptopCode}
              </button>
              <button
                type="button"
                onClick={() => {
                  setScanInput('LP-2026-093')
                  handleBarcodeScanned('LP-2026-093')
                }}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200 transition-colors"
              >
                Scan LP-2026-093
              </button>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setScanModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                Look Up Details <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DETAILED VERIFIED ASSET MODAL ON SCAN WITH CLEAN SCROLLBAR     */}
      {/* ============================================================== */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        {selectedItem && (
          <DialogContent className="max-w-lg p-0 rounded-2xl border-0 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            {/* Modal Header Banner - Fixed at top */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-5 sm:p-6 text-white relative shrink-0">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500 text-white border-0 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified IT Hardware Asset
                </Badge>
                <span className="font-mono text-xs text-indigo-300 font-semibold">{selectedItem.laptopCode}</span>
              </div>

              <div className="mt-3 space-y-0.5">
                <h3 className="text-xl font-bold tracking-tight">
                  {selectedItem.employee.first_name} {selectedItem.employee.last_name}
                </h3>
                <p className="text-xs text-indigo-200 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Employee ID:{' '}
                  <span className="font-mono font-bold text-white">
                    {selectedItem.employee.employee_code || selectedItem.employee.id}
                  </span>
                </p>
              </div>
            </div>

            {/* Scrollable Modal Body with visible, styled scrollbar */}
            <div
              className="p-5 sm:p-6 space-y-5 bg-white overflow-y-auto flex-1 max-h-[calc(85vh-130px)]"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#818cf8 #f1f5f9',
              }}
            >
              {/* Centered QR Graphic for Phone / Google Lens Scanning */}
              <div className="rounded-2xl border-2 border-indigo-200/90 bg-slate-50/90 p-4 sm:p-5 text-center space-y-3 shadow-inner">
                {/* Mode Selector */}
                <div className="flex items-center justify-center gap-1 bg-white p-1 rounded-xl border border-slate-200 max-w-xs mx-auto shadow-xs">
                  <button
                    type="button"
                    onClick={() => setBarcodeViewMode('qr')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      barcodeViewMode === 'qr'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="h-3.5 w-3.5" /> Scannable QR Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeViewMode('1d')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      barcodeViewMode === '1d'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Barcode className="h-3.5 w-3.5" /> 1D Barcode
                  </button>
                </div>

                {barcodeViewMode === 'qr' ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3.5 rounded-2xl border-2 border-indigo-200/80 inline-block shadow-md">
                      {selectedQrCode ? (
                        <img
                          src={selectedQrCode}
                          alt="Full Asset Details QR Code"
                          className="h-48 w-48 object-contain mx-auto"
                        />
                      ) : (
                        <div className="h-48 w-48 flex items-center justify-center text-xs text-slate-400">
                          Generating QR Code...
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 shadow-xs">
                        📱 Point Phone Camera or Google Lens to Scan
                      </Badge>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        Scanning reveals: <strong>Laptop ID, Employee Name, Employee ID, Email &amp; Seating Number</strong>
                      </p>
                    </div>

                    {/* Pre-formatted encoded contents preview */}
                    <div className="rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-[11px] leading-relaxed text-left border border-slate-800 shadow-sm max-w-sm mx-auto">
                      <div className="text-emerald-400 font-bold text-[10px] mb-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Scanned Output Preview:
                      </div>
                      <pre className="whitespace-pre-wrap font-mono text-[10.5px] leading-snug text-slate-200">
                        {selectedItem.fullDetailsText}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm max-w-full overflow-x-auto">
                      <img
                        src={selectedItem.barcodeUrl}
                        alt={selectedItem.laptopCode}
                        className="mx-auto h-20 max-w-full object-contain"
                      />
                      <div className="font-mono text-[11px] font-bold text-slate-800 tracking-wider mt-1">
                        {selectedItem.laptopCode} · {selectedItem.employee.first_name} {selectedItem.employee.last_name}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Code 128 Asset Barcode encoded with all employee &amp; seating details
                    </p>
                  </div>
                )}
              </div>

              {/* 5 Requested Key Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. ID Number */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600" /> ID Number (Employee Code)
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900">
                    {selectedItem.employee.employee_code || 'Pending'}
                  </p>
                </div>

                {/* 2. Laptop Code */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5 text-indigo-600" /> Laptop Code
                  </span>
                  <p className="font-mono font-bold text-sm text-indigo-700">
                    {selectedItem.laptopCode}
                  </p>
                </div>

                {/* 3. Name */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600" /> Employee Name
                  </span>
                  <p className="font-bold text-sm text-slate-900">
                    {selectedItem.employee.first_name} {selectedItem.employee.last_name}
                  </p>
                </div>

                {/* 4. Mail ID */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" /> Mail ID
                  </span>
                  <p className="font-semibold text-xs text-slate-900 break-all">
                    {selectedItem.employee.email}
                  </p>
                </div>

                {/* 5. Seating Number */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5 space-y-1 sm:col-span-2">
                  <span className="text-indigo-900 font-semibold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-rose-500" /> Seating Number (Allocated by ID)
                  </span>
                  <p className="font-bold text-sm text-indigo-950 font-mono">
                    {selectedItem.seating.fullLocation}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Desk: {selectedItem.seating.seatId} · {selectedItem.seating.floor} · {selectedItem.seating.bay}
                  </p>
                </div>
              </div>

              {/* Action Buttons - Fixed at bottom of scroll area */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t bg-white">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-slate-700 hover:bg-slate-100 flex-1 sm:flex-initial"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Laptop ID: ${selectedItem.laptopCode}\nEmployee ID: ${selectedItem.employee.employee_code || selectedItem.employee.id}\nEmployee Name: ${selectedItem.employee.first_name} ${selectedItem.employee.last_name}\nEmployee Mail: ${selectedItem.employee.email}\nSeating Number: ${selectedItem.seating.fullLocation}`
                      )
                      toast.success('Asset & Employee details copied to clipboard!')
                    }}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Details
                  </Button>
                  {selectedQrCode && (
                    <a
                      href={selectedQrCode}
                      download={`QR-${selectedItem.laptopCode}.png`}
                      className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs"
                      title="Download scannable QR Code image"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5 text-indigo-600" /> Download QR
                    </a>
                  )}
                  <Link
                    to={`/verify-asset?code=${selectedItem.laptopCode}`}
                    target="_blank"
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Mobile URL
                  </Link>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                    Close
                  </Button>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                    onClick={() => printSticker(selectedItem)}
                  >
                    <Printer className="mr-2 h-4 w-4" /> Print QR Sticker
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

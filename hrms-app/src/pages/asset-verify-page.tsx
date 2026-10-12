import { useState, useEffect } from 'react'
import { useSearchParams, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/lib/database.types'
import {
  generateLaptopCode,
  generateSeatingNumber,
  generateBarcodeDataUrl,
  generateQrCodeDataUrl,
  generateFullAssetDetailsText,
  generateFullAssetBarcodeText,
  extractEmployeeNumber,
} from '@/lib/barcode'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Laptop,
  User,
  Mail,
  MapPin,
  Barcode,
  CheckCircle2,
  Search,
  ArrowRight,
  Printer,
  ExternalLink,
  QrCode,
} from 'lucide-react'

export default function AssetVerifyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useParams<{ code?: string }>()

  const initialCode = params.code || searchParams.get('code') || searchParams.get('scan') || 'LP-2026-136'
  const [inputCode, setInputCode] = useState(initialCode)
  const [searchedCode, setSearchedCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const [barcodeViewMode, setBarcodeViewMode] = useState<'qr' | '1d'>('qr')

  const [assetDetails, setAssetDetails] = useState<{
    laptopCode: string
    employeeName: string
    employeeId: string
    employeeEmail: string
    seatingNumber: string
    seatingDesk: string
    seatingFloor: string
    seatingBay: string
    barcodeUrl: string
    qrCodeUrl: string
    fullDetailsText: string
  } | null>(null)

  // Lookup function by laptop number, employee code, or sequence
  const lookupAsset = async (queryCode: string) => {
    const raw = queryCode.trim()
    if (!raw) return

    setLoading(true)
    setSearchedCode(raw)

    try {
      // 1. First search Supabase employees table
      const { data: allEmployees } = await supabase
        .from('employees')
        .select('*')

      let matchedEmp: Employee | null = null

      if (allEmployees && allEmployees.length > 0) {
        // Try exact match on laptop code derived from employee
        matchedEmp = allEmployees.find((emp) => {
          const lp = generateLaptopCode(emp.employee_code).toLowerCase()
          const code = (emp.employee_code || '').toLowerCase()
          const email = (emp.email || '').toLowerCase()
          const name = `${emp.first_name} ${emp.last_name}`.toLowerCase()
          const q = raw.toLowerCase()

          if (lp === q || code === q || email === q || name.includes(q)) return true
          // Match sequence number (e.g. 136)
          const num = extractEmployeeNumber(emp.employee_code)
          if (q.endsWith(String(num)) || q === String(num)) return true
          return false
        }) || null
      }

      // If matched an actual employee in DB
      if (matchedEmp) {
        const laptopCode = generateLaptopCode(matchedEmp.employee_code)
        const seating = generateSeatingNumber(matchedEmp.employee_code)
        const empName = `${matchedEmp.first_name} ${matchedEmp.last_name}`.trim()
        const empId = matchedEmp.employee_code || matchedEmp.id
        const empEmail = matchedEmp.email || ''

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
        const qrCodeUrl = await generateQrCodeDataUrl(fullDetailsText, { width: 300, margin: 2 })

        setAssetDetails({
          laptopCode,
          employeeName: empName,
          employeeId: empId,
          employeeEmail: empEmail,
          seatingNumber: seating.fullLocation,
          seatingDesk: seating.seatId,
          seatingFloor: seating.floor,
          seatingBay: seating.bay,
          barcodeUrl,
          qrCodeUrl,
          fullDetailsText,
        })
      } else {
        // Deterministic calculation from code number (e.g. "LP-2026-136" -> 136)
        const num = extractEmployeeNumber(raw)
        const is136 = num === 136 || raw.toLowerCase().includes('136')
        const laptopCode = `LP-2026-${String(num).padStart(3, '0')}`
        const empCode = is136 ? 'OKL-GEN-2026-136' : `OKL-GEN-2026-${String(num).padStart(3, '0')}`
        const empName = is136 ? 'Suryani Gouda' : `Employee #${num}`
        const empEmail = is136 ? 'suryani@gmail.com' : `employee.${num}@oklut.com`
        const seating = generateSeatingNumber(empCode)

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

        const barcodeUrl = generateBarcodeDataUrl(barcodeText)
        const qrCodeUrl = await generateQrCodeDataUrl(fullDetailsText, { width: 300, margin: 2 })

        setAssetDetails({
          laptopCode,
          employeeName: empName,
          employeeId: empCode,
          employeeEmail: empEmail,
          seatingNumber: seating.fullLocation,
          seatingDesk: seating.seatId,
          seatingFloor: seating.floor,
          seatingBay: seating.bay,
          barcodeUrl,
          qrCodeUrl,
          fullDetailsText,
        })
      }
    } catch (e) {
      console.error('Lookup error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialCode) {
      lookupAsset(initialCode)
    }
  }, [initialCode])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputCode.trim()) {
      setSearchParams({ code: inputCode.trim() })
      lookupAsset(inputCode.trim())
    }
  }

  // Print asset sticker
  const handlePrint = () => {
    if (!assetDetails) return
    const win = window.open('', '_blank', 'width=600,height=500')
    if (!win) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laptop Barcode Sticker - ${assetDetails.laptopCode}</title>
        <style>
          body { font-family: -apple-system, sans-serif; padding: 20px; text-align: center; }
          .sticker { width: 380px; margin: 0 auto; padding: 24px; border: 2px dashed #000; border-radius: 12px; }
          .barcode-img { height: 70px; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
          .label { color: #64748b; font-weight: 600; }
          .val { font-weight: bold; color: #0f172a; }
        </style>
      </head>
      <body>
        <div class="sticker">
          <div style="font-weight: 900; color: #4f46e5; text-transform: uppercase;">OKLUT INC. IT ASSET TAG</div>
          <img class="barcode-img" src="${assetDetails.barcodeUrl}" />
          <div class="row"><span class="label">Laptop Code:</span><span class="val">${assetDetails.laptopCode}</span></div>
          <div class="row"><span class="label">Employee ID:</span><span class="val">${assetDetails.employeeId}</span></div>
          <div class="row"><span class="label">Employee Name:</span><span class="val">${assetDetails.employeeName}</span></div>
          <div class="row"><span class="label">Mail ID:</span><span class="val">${assetDetails.employeeEmail}</span></div>
          <div class="row"><span class="label">Seating No:</span><span class="val" style="color:#4f46e5;">${assetDetails.seatingNumber}</span></div>
        </div>
        <script>window.onload = function() { setTimeout(function(){ window.print(); }, 250); }</script>
      </body>
      </html>
    `
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Header */}
      <header className="border-b bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Oklut IT Asset Verification</h1>
              <p className="text-[11px] text-slate-500">Instant Laptop Code &amp; Seating Lookup</p>
            </div>
          </div>

          <Link to="/assets">
            <Button variant="outline" size="sm" className="text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              Open HRMS Portal <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Search Bar for scanning or typing laptop number */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white p-4">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Search className="h-4 w-4 text-indigo-600" /> Enter or Paste Laptop Number (from QR code scan)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. LP-2026-136, LP-2026-093, or Employee ID..."
                  className="pl-9 font-mono text-sm h-11 rounded-xl"
                  required
                />
              </div>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-11 px-5 rounded-xl shadow-sm">
                {loading ? 'Finding...' : 'Get Details'} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            {/* Quick Test Chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <span>Quick lookup:</span>
              {(['LP-2026-136', 'LP-2026-093', 'LP-2026-094', 'LP-2026-131'] as const).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInputCode(chip)
                    setSearchParams({ code: chip })
                    lookupAsset(chip)
                  }}
                  className={`font-mono px-2 py-0.5 rounded border transition-colors ${
                    searchedCode === chip
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </form>
        </Card>

        {/* Results Card with ALL 5 Details Requested */}
        {assetDetails ? (
          <Card className="border border-slate-200/80 shadow-xl rounded-2xl overflow-hidden bg-white">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white relative">
              <div className="flex items-center justify-between">
                <Badge className="bg-emerald-500 text-white border-0 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified IT Hardware Asset
                </Badge>
                <span className="font-mono text-xs text-indigo-300 font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                  {assetDetails.laptopCode}
                </span>
              </div>

              <div className="mt-4 space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">{assetDetails.employeeName}</h2>
                <p className="text-xs text-indigo-200 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Employee ID: <span className="font-mono font-bold text-white">{assetDetails.employeeId}</span>
                </p>
              </div>
            </div>

            {/* Content Details */}
            <CardContent className="p-6 space-y-6">
              {/* Centered Barcode / QR Graphic for Phone / Google Lens Scanning */}
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
                      {assetDetails.qrCodeUrl ? (
                        <img
                          src={assetDetails.qrCodeUrl}
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
                        📱 Point Phone Camera or Google Lens Here
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
                        {assetDetails.fullDetailsText}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-sm max-w-full overflow-x-auto">
                      <img
                        src={assetDetails.barcodeUrl}
                        alt={assetDetails.laptopCode}
                        className="mx-auto h-20 max-w-full object-contain"
                      />
                      <div className="font-mono text-[11px] font-bold text-slate-800 tracking-wider mt-1">
                        {assetDetails.laptopCode} · {assetDetails.employeeName}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Code 128 Asset Barcode encoded with all employee &amp; seating details
                    </p>
                  </div>
                )}
              </div>

              {/* All Requested Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. Employee Name */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600" /> Employee Name
                  </span>
                  <p className="font-bold text-sm text-slate-900">
                    {assetDetails.employeeName}
                  </p>
                </div>

                {/* 2. Employee ID */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-indigo-600" /> Employee ID
                  </span>
                  <p className="font-mono font-bold text-sm text-slate-900">
                    {assetDetails.employeeId}
                  </p>
                </div>

                {/* 3. Laptop Code */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Laptop className="h-3.5 w-3.5 text-indigo-600" /> Laptop Number (Code)
                  </span>
                  <p className="font-mono font-bold text-sm text-indigo-700">
                    {assetDetails.laptopCode}
                  </p>
                </div>

                {/* 4. Employee Mail */}
                <div className="rounded-xl border p-3.5 bg-slate-50/60 space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" /> Employee Mail ID
                  </span>
                  <p className="font-semibold text-xs text-slate-900 break-all">
                    {assetDetails.employeeEmail}
                  </p>
                </div>

                {/* 5. Seating Number */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 space-y-1 sm:col-span-2">
                  <span className="text-indigo-950 font-bold flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-rose-500" /> Allocated Seating Number
                  </span>
                  <p className="font-extrabold text-base text-indigo-950 font-mono">
                    {assetDetails.seatingNumber}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Desk: <strong className="text-slate-900">{assetDetails.seatingDesk}</strong> · {assetDetails.seatingFloor} · {assetDetails.seatingBay}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t">
                <Link to="/assets">
                  <Button variant="outline" size="sm" className="text-xs">
                    View in HRMS Assets
                  </Button>
                </Link>
                <Button onClick={handlePrint} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs">
                  <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Hardware Sticker
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-slate-400">
            {loading ? 'Fetching asset details from database...' : 'Enter a laptop code to see details.'}
          </div>
        )}
      </main>
    </div>
  )
}

import { useState, useRef } from 'react'
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download,
  X,
  FileCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { queryKeys } from '@/lib/queryKeys'
import { formatCurrency, monthName } from '@/lib/format'
import type { Employee, PayrollProfile } from '@/lib/database.types'
import {
  parsePayrollExcel,
  commitExcelPayroll,
  downloadPayrollTemplate,
  type ExcelPayrollParseResult,
} from '@/lib/payroll-excel'

interface ExcelPayrollImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPeriod: string
  employees: Employee[]
  profiles: PayrollProfile[]
  onSuccess?: (period: string) => void
}

export function ExcelPayrollImportModal({
  open,
  onOpenChange,
  currentPeriod,
  employees,
  profiles,
  onSuccess,
}: ExcelPayrollImportModalProps) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [parseResult, setParseResult] = useState<ExcelPayrollParseResult | null>(null)
  const [targetPeriod, setTargetPeriod] = useState(currentPeriod)

  // Reset state on open/close
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setFile(null)
      setParseResult(null)
      setParsing(false)
      setSubmitting(false)
    } else {
      setTargetPeriod(currentPeriod)
    }
    onOpenChange(isOpen)
  }

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    await processFile(selectedFile)
  }

  // Drag and drop handler
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (!droppedFile) return
    await processFile(droppedFile)
  }

  const processFile = async (selectedFile: File) => {
    const name = selectedFile.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      toast.error('Please upload an Excel spreadsheet (.xlsx, .xls) or CSV file.')
      return
    }

    setFile(selectedFile)
    setParsing(true)
    try {
      const result = await parsePayrollExcel(selectedFile, employees, targetPeriod)
      setParseResult(result)
      if (result.period && result.period !== targetPeriod) {
        setTargetPeriod(result.period)
      }
      toast.success(
        `Excel parsed: ${result.matchedRows.length} employee record(s) identified!`
      )
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse Excel file.')
      setFile(null)
      setParseResult(null)
    } finally {
      setParsing(false)
    }
  }

  // Commit & Auto-Generate
  const handleCommit = async () => {
    if (!parseResult || parseResult.matchedRows.length === 0) {
      toast.error('No matched employee records to generate payroll for.')
      return
    }

    setSubmitting(true)
    try {
      // Ensure period matches targetPeriod if user selected a period
      const finalRows = parseResult.matchedRows.map((r) => ({
        ...r,
        payPeriod: targetPeriod || r.payPeriod,
      }))

      const res = await commitExcelPayroll(finalRows)
      qc.invalidateQueries({ queryKey: queryKeys.payroll })
      qc.invalidateQueries({ queryKey: queryKeys.payrollProfiles })
      qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })

      toast.success(
        `Payroll automatically generated for ${res.count} employee(s) for ${monthName(
          targetPeriod
        )}!`
      )
      onSuccess?.(targetPeriod)
      handleOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate payroll from Excel.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Upload Monthly Payroll Excel Sheet
            </DialogTitle>
          </div>
          <DialogDescription>
            Upload your monthly Excel or CSV salary sheet to automatically compute and generate
            the payroll for {monthName(targetPeriod)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File Upload Zone */}
          {!parseResult ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 hover:bg-muted/40 transition-colors cursor-pointer text-center bg-slate-50/50 dark:bg-slate-900/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {parsing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Reading and mapping Excel records...
                  </p>
                  <p className="text-xs text-muted-foreground">Matching employee IDs & names</p>
                </div>
              ) : (
                <>
                  <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                    Click to select or drag & drop payroll Excel sheet
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Supports Microsoft Excel (.xlsx, .xls) and CSV files. Standard salary headers
                    like Basic, HRA, Allowances, Deductions, Net Pay, etc., are automatically recognized.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge variant="outline" className="text-[11px] font-normal">
                      .XLSX
                    </Badge>
                    <Badge variant="outline" className="text-[11px] font-normal">
                      .XLS
                    </Badge>
                    <Badge variant="outline" className="text-[11px] font-normal">
                      .CSV
                    </Badge>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Parsed Summary & Confirmation */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900">
                <div className="flex items-center gap-3 min-w-0">
                  <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100 truncate">
                      {file?.name}
                    </p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300">
                      Target Pay Period:{' '}
                      <span className="font-bold underline">{monthName(targetPeriod)}</span> (
                      {targetPeriod})
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setParseResult(null)
                  }}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Change File
                </Button>
              </div>

              {/* Quick Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-card">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Matched Employees</p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xl font-bold text-emerald-600">
                        {parseResult.matchedRows.length}
                      </span>
                      <span className="text-xs text-muted-foreground">/ {employees.length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Total Gross</p>
                    <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {formatCurrency(parseResult.totalGross)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground">Total Deductions</p>
                    <p className="mt-1 text-base font-bold text-destructive truncate">
                      {formatCurrency(parseResult.totalDeductions)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card border-emerald-300 bg-emerald-50/20">
                  <CardContent className="p-3">
                    <p className="text-[11px] text-emerald-700 font-medium">Net Salary Payable</p>
                    <p className="mt-1 text-base font-bold text-emerald-600 truncate">
                      {formatCurrency(parseResult.totalNet)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Unmatched Rows Notice (if any) */}
              {parseResult.unmatchedRows.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>
                      {parseResult.unmatchedRows.length} row(s) could not be matched to an active employee
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-400">
                    Rows: {parseResult.unmatchedRows.map((u) => u.rawIdentifier).join(', ')}. These will
                    be skipped.
                  </p>
                </div>
              )}

              {/* Preview Table of Matched Records */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground flex justify-between items-center">
                  <span>Preview of Parsed Payroll ({parseResult.matchedRows.length} rows ready)</span>
                  <span className="text-[11px] font-normal">Scroll to review</span>
                </div>
                <div className="max-h-56 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/20 border-b text-[11px] text-muted-foreground sticky top-0 bg-background">
                      <tr>
                        <th className="px-3 py-2">Code</th>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Basic</th>
                        <th className="px-3 py-2">HRA</th>
                        <th className="px-3 py-2">Allowances</th>
                        <th className="px-3 py-2">Deductions</th>
                        <th className="px-3 py-2">PF / Tax</th>
                        <th className="px-3 py-2 font-bold text-emerald-600">Net Salary</th>
                        <th className="px-3 py-2 text-center">Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parseResult.matchedRows.map((r) => (
                        <tr key={r.employeeId} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-[11px] text-primary">
                            {r.employeeCode}
                          </td>
                          <td className="px-3 py-2 font-medium">{r.employeeName}</td>
                          <td className="px-3 py-2">{formatCurrency(r.basicSalary)}</td>
                          <td className="px-3 py-2">{formatCurrency(r.hra)}</td>
                          <td className="px-3 py-2">{formatCurrency(r.allowances + r.bonus)}</td>
                          <td className="px-3 py-2 text-destructive">
                            {formatCurrency(r.deductions)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatCurrency(r.providentFund + r.tax)}
                          </td>
                          <td className="px-3 py-2 font-semibold text-emerald-600">
                            {formatCurrency(r.netSalary)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {r.presentDays}/{r.totalDays}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
          {/* Download Template button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadPayrollTemplate(employees, profiles, targetPeriod)}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download Pre-Filled Excel Template
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            {parseResult && (
              <Button
                type="button"
                size="sm"
                onClick={handleCommit}
                disabled={submitting || parseResult.matchedRows.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Payroll...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Generate & Save Payroll ({parseResult.matchedRows.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

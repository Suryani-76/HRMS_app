import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Award,
  CheckCircle2,
  Send,
  Save,
  UserCheck,
  Star,
  Laptop,
  Briefcase,
  Sparkles,
  Info,
  Calendar,
  ShieldCheck,
  RotateCcw,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Clock,
  Users,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableEmployeeSelect } from '@/components/ui/searchable-employee-select'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { useEmployees } from '@/hooks/use-queries'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { formatDate } from '@/lib/format'
import {
  TrackType,
  AssessmentItem,
  EmployeeAssessment,
  getEmployeeAssessment,
  saveAssessmentDraft,
  submitAssessmentForReview,
  submitReviewerGrading,
  calculateAssessmentMetrics,
  createSampleCandidateAssessment,
  fetchEmployeeAssessmentRemote,
  fetchAllEmployeeAssessmentsRemote,
  getEmployeeCategory,
} from '@/lib/api/performanceAssessment'

const REVIEW_PERIODS = ['Q4 2026', 'Q3 2026', 'Q2 2026', 'Q1 2026', 'Annual 2026']

export function PerformanceAssessmentSheet() {
  const qc = useQueryClient()
  const { user, employee: currentEmployee, isAdmin, isHR, isManager } = useAuth()
  const { data: allEmployees = [] } = useEmployees()

  const isReviewer = Boolean(isAdmin || isHR || isManager)

  // In HR / Reviewer mode, default to candidate (e.g. Meera Sharma EMP-0002) so HR immediately sees a candidate's submission
  const defaultCandidate = useMemo(() => {
    if (!isReviewer) return currentEmployee?.id || user?.employee_id || allEmployees[0]?.id || 'emp-self'
    const nonHr = allEmployees.find(
      (e) => (e.email || '').toLowerCase() === 'employee@oklut.com' || e.employee_code === 'EMP-0002'
    )
    if (nonHr) return nonHr.id
    const otherEmp = allEmployees.find((e) => e.id !== currentEmployee?.id)
    return otherEmp?.id || allEmployees[0]?.id || currentEmployee?.id || 'emp-self'
  }, [isReviewer, allEmployees, currentEmployee?.id, user?.employee_id])

  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultCandidate)

  // Sync selected employee when allEmployees load if still on reviewer's own ID
  useEffect(() => {
    if (isReviewer && defaultCandidate && (!selectedEmpId || selectedEmpId === currentEmployee?.id)) {
      setSelectedEmpId(defaultCandidate)
    }
  }, [isReviewer, defaultCandidate, currentEmployee?.id, selectedEmpId])

  // Active employee object
  const activeEmployee = useMemo(() => {
    return allEmployees.find((e) => e.id === selectedEmpId) || currentEmployee || null
  }, [allEmployees, selectedEmpId, currentEmployee])

  // Automatically determine the exact sector (IT or NON_IT) based on employee's designation & role
  const activeSector = useMemo(() => {
    return getEmployeeCategory(activeEmployee)
  }, [activeEmployee])

  // Track selection: IT or NON_IT (locked to employee's sector based on category)
  const [track, setTrack] = useState<TrackType>(() => {
    return activeEmployee ? getEmployeeCategory(activeEmployee) : 'IT'
  })
  const [period, setPeriod] = useState<string>('Q4 2026')

  // Automatically update track to candidate's/employee's sector whenever candidate changes
  useEffect(() => {
    if (activeSector) {
      setTrack(activeSector)
    }
  }, [activeSector, selectedEmpId])

  // Search & Filter state for candidate queue (with IT and Non-IT filters)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'it' | 'non_it' | 'submitted' | 'reviewed' | 'draft'>('all')

  // Submissions list for HR / Admin queue
  const [allSubmissions, setAllSubmissions] = useState<EmployeeAssessment[]>([])

  const reloadSubmissions = useCallback(async () => {
    if (!isReviewer) return
    try {
      const list = await fetchAllEmployeeAssessmentsRemote()
      setAllSubmissions(list)
    } catch (err) {
      console.warn('Submissions reload notice:', err)
    }
  }, [isReviewer])

  useEffect(() => {
    reloadSubmissions()
  }, [reloadSubmissions])

  // Derived categorized candidate lists
  const submittedList = useMemo(() => {
    return allEmployees.filter((e) => {
      const sub = allSubmissions.find((s) => s.employeeId === e.id)
      return sub?.status === 'submitted'
    })
  }, [allEmployees, allSubmissions])

  const reviewedList = useMemo(() => {
    return allEmployees.filter((e) => {
      const sub = allSubmissions.find((s) => s.employeeId === e.id)
      return sub?.status === 'reviewed'
    })
  }, [allEmployees, allSubmissions])

  const draftList = useMemo(() => {
    return allEmployees.filter((e) => {
      const sub = allSubmissions.find((s) => s.employeeId === e.id)
      return !sub || sub.status === 'draft'
    })
  }, [allEmployees, allSubmissions])

  // IT & Non-IT candidate lists based on designation, role & department
  const itList = useMemo(() => {
    return allEmployees.filter((e) => getEmployeeCategory(e) === 'IT')
  }, [allEmployees])

  const nonItList = useMemo(() => {
    return allEmployees.filter((e) => getEmployeeCategory(e) === 'NON_IT')
  }, [allEmployees])

  // Search filtered candidates
  const filteredEmployees = useMemo(() => {
    let base = allEmployees
    if (filterStatus === 'it') base = itList
    else if (filterStatus === 'non_it') base = nonItList
    else if (filterStatus === 'submitted') base = submittedList
    else if (filterStatus === 'reviewed') base = reviewedList
    else if (filterStatus === 'draft') base = draftList

    if (!searchQuery.trim()) return base
    const q = searchQuery.toLowerCase().trim()
    return base.filter((e) => {
      const name = `${e.first_name} ${e.last_name}`.toLowerCase()
      const code = (e.employee_code || '').toLowerCase()
      const email = (e.email || '').toLowerCase()
      const dept = (e.department?.name || '').toLowerCase()
      const desig = ((e as any).designation?.name || (e as any).designation?.title || '').toLowerCase()
      return name.includes(q) || code.includes(q) || email.includes(q) || dept.includes(q) || desig.includes(q)
    })
  }, [allEmployees, itList, nonItList, submittedList, reviewedList, draftList, filterStatus, searchQuery])

  // Clean subset of candidates to show in quick pills (avoids clumsy 54-pill dump)
  const candidatesToShow = useMemo(() => {
    if (searchQuery.trim() || filterStatus !== 'all') {
      return filteredEmployees.slice(0, 10)
    }
    // Default view: Prioritize currently selected, then candidates with submissions, then up to 4 other candidates
    const prioritized: typeof allEmployees = []
    if (activeEmployee) prioritized.push(activeEmployee)
    for (const emp of submittedList) {
      if (!prioritized.some((p) => p.id === emp.id)) prioritized.push(emp)
    }
    for (const emp of reviewedList) {
      if (!prioritized.some((p) => p.id === emp.id)) prioritized.push(emp)
    }
    for (const emp of allEmployees) {
      if (prioritized.length >= 7) break
      if (!prioritized.some((p) => p.id === emp.id)) prioritized.push(emp)
    }
    return prioritized
  }, [searchQuery, filterStatus, filteredEmployees, activeEmployee, submittedList, reviewedList, allEmployees])

  // Assessment state
  const [assessment, setAssessment] = useState<EmployeeAssessment>(() => {
    return getEmployeeAssessment(
      selectedEmpId,
      track,
      period,
      activeEmployee
        ? {
            name: `${activeEmployee.first_name} ${activeEmployee.last_name}`,
            code: activeEmployee.employee_code,
            role: (activeEmployee as any).designation?.title || (track === 'IT' ? 'Software Engineer' : 'Operations Specialist'),
            department: activeEmployee.department?.name || (track === 'IT' ? 'Technology' : 'Operations'),
          }
        : undefined
    )
  })

  // Reviewer general comments state
  const [reviewerGeneralFeedback, setReviewerGeneralFeedback] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Asynchronously fetch assessment from Supabase (or cached local store) when employee, track, or period changes
  useEffect(() => {
    let cancelled = false
    const details = activeEmployee
      ? {
          name: `${activeEmployee.first_name} ${activeEmployee.last_name}`,
          code: activeEmployee.employee_code,
          role: (activeEmployee as any).designation?.title || (track === 'IT' ? 'Software Engineer' : 'Operations Specialist'),
          department: activeEmployee.department?.name || (track === 'IT' ? 'Technology' : 'Operations'),
        }
      : undefined

    fetchEmployeeAssessmentRemote(selectedEmpId, track, period, details).then((loaded) => {
      if (!cancelled) {
        setAssessment(loaded)
        setReviewerGeneralFeedback(loaded.reviewerFeedback || '')
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedEmpId, track, period, activeEmployee])

  // Checkbox toggle: goal reached
  const handleToggleGoalReached = (itemId: number) => {
    setAssessment((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const newReached = !item.goalReached
          return {
            ...item,
            goalReached: newReached,
            selfRating: newReached && !item.selfRating ? 4 : item.selfRating,
          }
        }
        return item
      })
      const metrics = calculateAssessmentMetrics(updatedItems)
      return {
        ...prev,
        items: updatedItems,
        totalGoalsReached: metrics.totalGoalsReached,
        totalGoalsCount: metrics.totalGoalsCount,
        overallScore: metrics.overallScore,
        overallPercentage: metrics.overallPercentage,
        performanceBand: metrics.performanceBand,
      }
    })
  }

  // Update employee comment or evidence
  const handleUpdateItemField = (itemId: number, field: keyof AssessmentItem, value: any) => {
    setAssessment((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const updated = { ...item, [field]: value }
          return updated
        }
        return item
      })
      const metrics = calculateAssessmentMetrics(updatedItems)
      return {
        ...prev,
        items: updatedItems,
        totalGoalsReached: metrics.totalGoalsReached,
        totalGoalsCount: metrics.totalGoalsCount,
        overallScore: metrics.overallScore,
        overallPercentage: metrics.overallPercentage,
        performanceBand: metrics.performanceBand,
      }
    })
  }

  // Update reviewer rating & recompute weighted score
  const handleUpdateReviewerRating = (itemId: number, rating: number) => {
    setAssessment((prev) => {
      const updatedItems = prev.items.map((item) => {
        if (item.id === itemId) {
          const weightedScore = Number(((rating * item.weight) / 100).toFixed(2))
          return {
            ...item,
            reviewerRating: rating,
            weightedScore,
          }
        }
        return item
      })
      const metrics = calculateAssessmentMetrics(updatedItems)
      return {
        ...prev,
        items: updatedItems,
        totalGoalsReached: metrics.totalGoalsReached,
        totalGoalsCount: metrics.totalGoalsCount,
        overallScore: metrics.overallScore,
        overallPercentage: metrics.overallPercentage,
        performanceBand: metrics.performanceBand,
      }
    })
  }

  // Save draft
  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const updated = await saveAssessmentDraft(assessment)
      setAssessment(updated)
      await reloadSubmissions()
      toast.success('Performance Assessment draft saved successfully')
    } catch (err: any) {
      toast.error('Failed to save draft: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Submit by candidate/employee
  const handleSubmitCandidateAssessment = async () => {
    if (assessment.totalGoalsReached === 0) {
      const proceed = confirm(
        'You have not marked any goals as reached yet. Are you sure you want to submit this assessment to HR?'
      )
      if (!proceed) return
    }

    setIsSubmitting(true)
    try {
      const updated = await submitAssessmentForReview(assessment)
      setAssessment(updated)
      await reloadSubmissions()
      qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews })
      qc.invalidateQueries({ queryKey: queryKeys.notifications })
      toast.success('Your Performance Assessment has been submitted to HR for review!')
    } catch (err: any) {
      toast.error('Failed to submit assessment: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit review & ratings by HR/Manager
  const handleSubmitReviewerRatings = async () => {
    const unratedCount = assessment.items.filter((i) => !i.reviewerRating).length
    if (unratedCount > 0) {
      const proceed = confirm(
        `There are ${unratedCount} goals without an HR rating. Do you want to submit ratings and finalize this review?`
      )
      if (!proceed) return
    }

    setIsSubmitting(true)
    try {
      const reviewerName = currentEmployee
        ? `${currentEmployee.first_name} ${currentEmployee.last_name}`
        : user?.role?.name || 'HR Reviewer'
      const updated = await submitReviewerGrading(
        assessment,
        currentEmployee?.id || user?.id,
        reviewerName,
        reviewerGeneralFeedback
      )
      setAssessment(updated)
      await reloadSubmissions()
      qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
      qc.invalidateQueries({ queryKey: queryKeys.performanceReviews })
      qc.invalidateQueries({ queryKey: queryKeys.notifications })
      toast.success('HR Ratings & Performance Review have been finalized and recorded!')
    } catch (err: any) {
      toast.error('Failed to submit review: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Quick load sample candidate submission for testing
  const handleLoadSampleSubmission = () => {
    const sample = createSampleCandidateAssessment(
      selectedEmpId,
      activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : 'Candidate',
      activeEmployee?.employee_code || 'EMP-0002',
      track,
      period
    )
    setAssessment(sample)
    saveAssessmentDraft(sample)
    reloadSubmissions()
    toast.success('Loaded candidate responses: checked goals, detailed notes, and evidence!')
  }

  // Reset current sheet to blank template
  const handleResetSheet = () => {
    if (confirm('Are you sure you want to reset all responses on this sheet to blank?')) {
      const blank = getEmployeeAssessment(selectedEmpId, track, period, {
        name: activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : 'Employee',
      })
      blank.items = blank.items.map((i) => ({
        ...i,
        goalReached: false,
        selfRating: undefined,
        employeeComment: '',
        evidenceSource: '',
        reviewerComment: '',
        reviewerRating: undefined,
        weightedScore: 0,
      }))
      blank.totalGoalsReached = 0
      blank.overallScore = 0
      blank.status = 'draft'
      setAssessment(blank)
      saveAssessmentDraft(blank)
      reloadSubmissions()
      toast.info('Assessment sheet reset to blank.')
    }
  }

  const metrics = useMemo(() => calculateAssessmentMetrics(assessment.items), [assessment.items])

  return (
    <div className="space-y-6">
      {/* Top Navigation & Track Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-4 rounded-2xl border shadow-xs">
        {/* Track Category Display: Shows ONLY the option relevant to employee's category */}
        <div className="flex flex-wrap items-center gap-2">
          {track === 'IT' ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-md shadow-blue-500/20">
                <Laptop className="h-4 w-4" />
                <span>IT Employee Assessment</span>
                <Badge variant="outline" className="ml-1 text-[10px] border-white/40 text-white font-mono">
                  14 Goals
                </Badge>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200">
                Category: IT Sector
              </Badge>
              {isReviewer && (
                <button
                  type="button"
                  onClick={() => setTrack('NON_IT')}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
                  title="Override candidate sector to Non-IT"
                >
                  (Switch to Non-IT)
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                <Briefcase className="h-4 w-4" />
                <span>Non-IT Employee Assessment</span>
                <Badge variant="outline" className="ml-1 text-[10px] border-white/40 text-white font-mono">
                  14 Goals
                </Badge>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                Category: Non-IT Sector
              </Badge>
              {isReviewer && (
                <button
                  type="button"
                  onClick={() => setTrack('IT')}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
                  title="Override candidate sector to IT"
                >
                  (Switch to IT)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Period & Clean Searchable Employee Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="h-9 w-32 text-xs font-medium">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* HR / Reviewer Clean Searchable Employee Select */}
          {isReviewer && (
            <div className="flex items-center gap-1.5 text-xs">
              <SearchableEmployeeSelect
                employees={allEmployees as any}
                value={selectedEmpId}
                onValueChange={setSelectedEmpId}
                placeholder="Search candidate by name or code..."
                className="w-72 h-9 text-xs"
                renderLabel={(emp) => {
                  const sec = getEmployeeCategory(emp)
                  const sub = allSubmissions.find((s) => s.employeeId === emp.id)
                  const tag = sec === 'IT' ? '[IT]' : '[Non-IT]'
                  if (sub?.status === 'submitted') return `${tag} ⏱ ${sub.totalGoalsReached}/14 Checked`
                  if (sub?.status === 'reviewed') return `${tag} ✓ Graded`
                  return tag
                }}
              />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleResetSheet} className="h-9 text-xs gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Clean Candidate Search & Filter Toolbar (Replaces clumsy 54-pill dump) */}
      {isReviewer && (
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Live Search Input */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search candidate by name, employee code (e.g. OKL-GEN-171), or department..."
                  className="pl-9 pr-8 h-9 text-xs rounded-xl bg-muted/40 border-border"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status & Sector Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border text-xs flex items-center gap-1.5 cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted border-border'
                  }`}
                >
                  <span>All</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-current">
                    {allEmployees.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('it')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border text-xs flex items-center gap-1.5 cursor-pointer ${
                    filterStatus === 'it'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-blue-50/60 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}
                >
                  <Laptop className="h-3 w-3" />
                  <span>IT Sector</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-200 text-blue-900">
                    {itList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('non_it')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border text-xs flex items-center gap-1.5 cursor-pointer ${
                    filterStatus === 'non_it'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}
                >
                  <Briefcase className="h-3 w-3" />
                  <span>Non-IT Sector</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-200 text-emerald-900">
                    {nonItList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('submitted')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border text-xs flex items-center gap-1.5 cursor-pointer ${
                    filterStatus === 'submitted'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-blue-50/60 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                  }`}
                >
                  <span>Submitted</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-blue-200 text-blue-900">
                    {submittedList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('reviewed')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border text-xs flex items-center gap-1.5 cursor-pointer ${
                    filterStatus === 'reviewed'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}
                >
                  <span>Graded</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-200 text-emerald-900">
                    {reviewedList.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('draft')}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border text-xs flex items-center gap-1.5 cursor-pointer ${
                    filterStatus === 'draft'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-amber-50/60 text-amber-700 hover:bg-amber-100 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                  }`}
                >
                  <span>Draft</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-200 text-amber-900">
                    {draftList.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Clean, Non-Clumsy Candidate Quick Strip (Only shows active or matching candidates) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 custom-scrollbar">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-indigo-500" />
                {searchQuery.trim() ? `Search Results (${filteredEmployees.length}):` : 'Quick Pick:'}
              </span>

              {candidatesToShow.map((e) => {
                const sub = allSubmissions.find((s) => s.employeeId === e.id)
                const isSelected = selectedEmpId === e.id
                const isSub = sub?.status === 'submitted'
                const isRev = sub?.status === 'reviewed'
                const candSector = getEmployeeCategory(e)

                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedEmpId(e.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                        : isSub
                        ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200'
                        : isRev
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
                        : 'bg-background hover:bg-muted text-muted-foreground border-border'
                    }`}
                  >
                    <span>
                      {e.first_name} {e.last_name}
                    </span>
                    <span
                      className={`text-[9.5px] px-1 py-0.1 rounded font-bold uppercase tracking-wider ${
                        candSector === 'IT'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                      }`}
                    >
                      {candSector === 'IT' ? 'IT' : 'Non-IT'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-indigo-800 text-white'
                          : isSub
                          ? 'bg-blue-200 text-blue-900'
                          : isRev
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {sub ? `${sub.totalGoalsReached}/14` : (e.employee_code || 'EMP')}
                    </span>
                  </button>
                )
              })}

              {candidatesToShow.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-1">
                  No candidates match "{searchQuery}". Try searching by ID or first name.
                </p>
              )}

              {!searchQuery && filterStatus === 'all' && allEmployees.length > candidatesToShow.length && (
                <span className="text-[11px] text-muted-foreground italic shrink-0 ml-1">
                  +{allEmployees.length - candidatesToShow.length} more (use search bar above)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidate Live Submission Status & Profile Banner */}
      <div className="rounded-2xl border p-4 bg-card shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
              track === 'IT'
                ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
            }`}>
              {activeEmployee?.first_name?.[0] || 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-foreground">
                  {activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : assessment.employeeName}
                </h3>
                <Badge variant="outline" className="font-mono text-[11px] font-bold">
                  {activeEmployee?.employee_code || assessment.employeeCode}
                </Badge>
                {/* Sector Badge */}
                {track === 'IT' ? (
                  <Badge className="bg-blue-600 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs">
                    <Laptop className="h-3 w-3" /> IT Sector
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-600 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs">
                    <Briefcase className="h-3 w-3" /> Non-IT Sector
                  </Badge>
                )}
                <Badge
                  className={`text-[11px] font-semibold ${
                    assessment.status === 'reviewed'
                      ? 'bg-emerald-600 text-white'
                      : assessment.status === 'submitted'
                      ? 'bg-blue-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {assessment.status === 'reviewed'
                    ? '✓ HR Reviewed & Finalized'
                    : assessment.status === 'submitted'
                    ? '⏱ Submitted for HR Review'
                    : 'Self-Assessment (Draft)'}
                </Badge>
              </div>

              {/* Profile Details: Designation, Department & Email */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="font-medium text-foreground">
                  {(activeEmployee as any)?.designation?.name ||
                    (activeEmployee as any)?.designation?.title ||
                    (track === 'IT' ? 'Software Engineer' : 'Operations Specialist')}
                </span>
                <span>•</span>
                <span>
                  {activeEmployee?.department?.name || (track === 'IT' ? 'Technology' : 'Operations')}
                </span>
                {activeEmployee?.email && (
                  <>
                    <span>•</span>
                    <span className="text-muted-foreground">{activeEmployee.email}</span>
                  </>
                )}
              </div>

              {/* Goals Progress */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <strong className="text-foreground">{metrics.totalGoalsReached} of 14</strong> {track === 'IT' ? 'IT' : 'Non-IT'} goals checked
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <strong className="text-foreground">{metrics.reachedWeight}%</strong> completed weight
                </span>
                {assessment.submittedAt && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      Submitted: {formatDate(assessment.submittedAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick action button for HR to load populated candidate responses for testing */}
          {isReviewer && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleSubmission}
                className="h-8 text-xs gap-1.5 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 shadow-2xs"
                title="Pre-populate this sheet with realistic candidate responses and checked goals"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Load Sample Candidate Submission
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Spreadsheet Header Banner */}
      <div
        className={`rounded-2xl border p-5 shadow-sm text-white ${
          track === 'IT'
            ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 border-blue-900/60'
            : 'bg-gradient-to-r from-teal-950 via-emerald-950 to-slate-900 border-teal-900/60'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-bold tracking-tight">
                {track === 'IT'
                  ? 'IT EMPLOYEE PERFORMANCE ASSESSMENT & REVIEW'
                  : 'NON-IT EMPLOYEE PERFORMANCE ASSESSMENT & REVIEW'}
              </h2>
            </div>
            <p className="text-xs text-blue-200/80 mt-1">
              {track === 'IT'
                ? 'Success Factors, Review Questions, Measurements & Development Planning'
                : 'Non-IT | Digital Markets | Analytics | Operations | Finance | Sales | HR | Business Functions'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isReviewer ? (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs py-1 px-3">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> HR Reviewer Portal
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs py-1 px-3">
                <UserCheck className="h-3.5 w-3.5 mr-1.5 text-blue-300" /> Candidate Portal
              </Badge>
            )}
          </div>
        </div>

        {/* Meta Header Information Box */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Candidate / Employee</span>
            <span className="font-semibold text-white mt-0.5 block truncate">
              {activeEmployee ? `${activeEmployee.first_name} ${activeEmployee.last_name}` : assessment.employeeName}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Employee ID</span>
            <span className="font-semibold text-white mt-0.5 block truncate">
              {activeEmployee?.employee_code || assessment.employeeCode}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Role / Function</span>
            <span className="font-semibold text-white mt-0.5 block truncate">
              {(activeEmployee as any)?.designation?.name ||
                (activeEmployee as any)?.designation?.title ||
                (track === 'IT' ? 'Software Engineer' : 'Business Functions')}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">
              {track === 'IT' ? 'Department / Project' : 'Department / Business Unit'}
            </span>
            <span className="font-semibold text-white mt-0.5 block truncate">
              {activeEmployee?.department?.name || (track === 'IT' ? 'Software Development' : 'Operations')}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Sector Category</span>
            <span className="font-semibold text-white mt-0.5 block truncate">
              {track === 'IT' ? 'IT Sector (14 Goals)' : 'Non-IT Sector (14 Goals)'}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Review Period</span>
            <span className="font-semibold text-white mt-0.5 block truncate">{period}</span>
          </div>
        </div>
      </div>

      {/* Metrics Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Goals Reached */}
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goals Reached</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-foreground">
                  {metrics.totalGoalsReached} / {metrics.totalGoalsCount}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  ({Math.round((metrics.totalGoalsReached / metrics.totalGoalsCount) * 100)}%)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Checked off by candidate</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Weight Achieved */}
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weight Achieved</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-foreground">{metrics.reachedWeight}%</span>
                <span className="text-xs font-medium text-muted-foreground">of 100%</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Sum of completed goal weights</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 flex items-center justify-center font-bold">
              <Sparkles className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* HR Review Score */}
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-foreground">
                  {metrics.overallScore > 0 ? metrics.overallScore.toFixed(2) : '--'}
                </span>
                <span className="text-xs font-medium text-muted-foreground">/ 5.00</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {metrics.overallPercentage > 0 ? `${metrics.overallPercentage}% Weighted Rating` : 'Awaiting HR ratings'}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 flex items-center justify-center font-bold">
              <Star className="h-6 w-6 fill-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Rating Band */}
        <Card className="border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating Category</p>
              <div className="mt-1">
                <span
                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                    metrics.overallScore >= 4.5
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : metrics.overallScore >= 3.8
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      : metrics.overallScore >= 3.0
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {metrics.performanceBand}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {assessment.status === 'reviewed' ? 'Official HR Grade' : 'Current Progress'}
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 flex items-center justify-center font-bold">
              <Award className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interactive Table */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar max-h-[75vh]">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            <thead className="sticky top-0 z-10 bg-slate-900 shadow-xs">
              <tr className="bg-slate-900 text-white font-semibold border-b border-slate-800 text-[11px] align-middle">
                <th className="p-3 w-12 text-center shrink-0">No.</th>
                <th className="p-3 w-44 min-w-[170px]">Success Factor / KPI</th>
                <th className="p-3 w-64 min-w-[220px]">Assessment Question</th>
                <th className="p-3 w-20 text-center shrink-0">Weight %</th>
                <th className="p-3 w-48 min-w-[180px] whitespace-normal">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Target Standard</span>
                    <span className="text-[9px] font-normal text-slate-400 leading-tight">(Expected Benchmark)</span>
                  </div>
                </th>
                <th className="p-3 w-44 min-w-[170px]">Measurement / Evidence</th>
                <th className="p-3 w-36 min-w-[140px] text-center border-x border-slate-800 whitespace-normal">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-white">Goal Reached</span>
                    <span className="text-[9px] font-normal text-blue-300 leading-tight">(Employee Checkbox)</span>
                  </div>
                </th>
                <th className="p-3 w-72 min-w-[280px] whitespace-normal">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Employee Comment & Evidence</span>
                    <span className="text-[9px] font-normal text-slate-400 leading-tight">(Self-Assessment Notes)</span>
                  </div>
                </th>
                <th className="p-3 w-56 min-w-[220px] whitespace-normal">
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">Reviewer Comment (HR)</span>
                    <span className="text-[9px] font-normal text-indigo-300 leading-tight">(HR Evaluation)</span>
                  </div>
                </th>
                <th className="p-3 w-36 min-w-[130px] text-center border-l border-slate-800 whitespace-normal">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-white">Reviewer Rating</span>
                    <span className="text-[9px] font-normal text-indigo-300 leading-tight">(1-5 Stars)</span>
                  </div>
                </th>
                <th className="p-3 w-28 min-w-[110px] text-center whitespace-normal">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-white">Weighted Score</span>
                    <span className="text-[9px] font-normal text-indigo-200 leading-tight">(Rating × Weight)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assessment.items.map((item) => {
                const isReached = item.goalReached
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors align-top ${
                      isReached ? 'bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20' : 'hover:bg-muted/40'
                    }`}
                  >
                    {/* No. */}
                    <td className="p-3 w-12 text-center font-bold text-muted-foreground">{item.id}</td>

                    {/* Success Factor / KPI */}
                    <td className="p-3 w-44 min-w-[170px] font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        <span>{item.successFactor}</span>
                      </div>
                    </td>

                    {/* Assessment Question */}
                    <td className="p-3 w-64 min-w-[220px] text-muted-foreground leading-relaxed">{item.assessmentQuestion}</td>

                    {/* Weight % */}
                    <td className="p-3 w-20 text-center">
                      <Badge variant="outline" className="font-bold text-blue-600 bg-blue-50 border-blue-200">
                        {item.weight}%
                      </Badge>
                    </td>

                    {/* Target Standard */}
                    <td className="p-3 w-48 min-w-[180px] text-foreground/90 font-medium leading-relaxed">{item.targetStandard}</td>

                    {/* Measurement / Evidence */}
                    <td className="p-3 w-44 min-w-[170px] text-muted-foreground text-[11px] leading-relaxed">{item.measurementEvidence}</td>

                    {/* Goal Reached Checkbox */}
                    <td className="p-3 w-36 min-w-[140px] text-center border-x border-border">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        {item.goalReached ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              Checked
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                              Goal Reached
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Pending
                            </span>
                            <span className="text-[9px] text-muted-foreground">Not Checked</span>
                          </div>
                        )}

                        <label className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 mt-0.5">
                          <input
                            type="checkbox"
                            checked={item.goalReached}
                            onChange={() => handleToggleGoalReached(item.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                          />
                          <span className="text-[9px] text-muted-foreground">Toggle</span>
                        </label>
                      </div>
                    </td>

                    {/* Employee Comment & Evidence */}
                    <td className="p-3 w-72 min-w-[280px] space-y-2">
                      {item.employeeComment ? (
                        <div className="rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-2.5 text-[11px] shadow-2xs">
                          <div className="flex items-center justify-between text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              Candidate Note:
                            </span>
                            <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 lowercase bg-blue-100 dark:bg-blue-900 px-1.5 py-0.2 rounded">
                              submitted
                            </span>
                          </div>
                          <p className="text-foreground leading-relaxed font-medium">
                            {item.employeeComment}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-muted/40 border border-dashed border-border p-2 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                          <Info className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <span>No candidate comment provided yet</span>
                        </div>
                      )}

                      {item.evidenceSource && (
                        <div className="flex items-center gap-1.5 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 shadow-2xs">
                          <Paperclip className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span className="font-semibold text-muted-foreground text-[10px] shrink-0">Evidence:</span>
                          {item.evidenceSource.startsWith('http://') || item.evidenceSource.startsWith('https://') ? (
                            <a
                              href={item.evidenceSource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium truncate flex items-center gap-1 max-w-[200px]"
                            >
                              {item.evidenceSource} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                            </a>
                          ) : (
                            <span className="font-mono text-foreground font-medium truncate max-w-[220px]" title={item.evidenceSource}>
                              {item.evidenceSource}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Expandable editor so candidate or HR can amend notes */}
                      <details className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer">
                        <summary className="hover:underline flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                          ✏ Edit / add comment or evidence
                        </summary>
                        <div className="space-y-1.5 mt-1.5 pt-1.5 border-t">
                          <Textarea
                            value={item.employeeComment || ''}
                            onChange={(e) => handleUpdateItemField(item.id, 'employeeComment', e.target.value)}
                            placeholder="Employee notes / deliverables achieved..."
                            rows={2}
                            className="text-[11px] resize-none h-14"
                          />
                          <Input
                            value={item.evidenceSource || ''}
                            onChange={(e) => handleUpdateItemField(item.id, 'evidenceSource', e.target.value)}
                            placeholder="Evidence / PR / Jira link / Document"
                            className="h-7 text-[11px]"
                          />
                        </div>
                      </details>
                    </td>

                    {/* Reviewer Comment (HR) */}
                    <td className="p-3 w-56 min-w-[220px]">
                      {isReviewer ? (
                        <Textarea
                          value={item.reviewerComment || ''}
                          onChange={(e) => handleUpdateItemField(item.id, 'reviewerComment', e.target.value)}
                          placeholder="HR Reviewer feedback / observation..."
                          rows={2}
                          className="text-[11px] resize-none h-14 bg-white dark:bg-card"
                        />
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          {item.reviewerComment || 'Pending HR review'}
                        </p>
                      )}
                    </td>

                    {/* Reviewer Rating (1-5) */}
                    <td className="p-3 w-36 min-w-[130px] text-center border-l border-border">
                      {isReviewer ? (
                        <div className="flex flex-col items-center gap-1">
                          <Select
                            value={item.reviewerRating ? String(item.reviewerRating) : undefined}
                            onValueChange={(val) => handleUpdateReviewerRating(item.id, Number(val))}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs font-bold text-center bg-white dark:bg-card">
                              <SelectValue placeholder="Rating" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">⭐⭐⭐⭐⭐ 5 - Outstanding</SelectItem>
                              <SelectItem value="4">⭐⭐⭐⭐ 4 - Exceeds</SelectItem>
                              <SelectItem value="3">⭐⭐⭐ 3 - Meets</SelectItem>
                              <SelectItem value="2">⭐⭐ 2 - Needs Imp.</SelectItem>
                              <SelectItem value="1">⭐ 1 - Unsatisfactory</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.reviewerRating && (
                            <span className="text-[10px] font-semibold text-indigo-600">
                              {item.reviewerRating} / 5 Stars
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          {item.reviewerRating ? (
                            <span className="font-bold text-sm text-indigo-600 flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                              {item.reviewerRating}/5
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Pending HR</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Weighted Score */}
                    <td className="p-3 w-28 min-w-[110px] text-center font-bold text-indigo-700 dark:text-indigo-300">
                      {item.weightedScore !== undefined && item.weightedScore > 0 ? (
                        <span>{item.weightedScore.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground/60">0.00</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900 font-bold text-xs border-t-2 border-slate-300 dark:border-slate-800">
                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-muted-foreground">
                  Total Assessment Summary:
                </td>
                <td className="p-3 text-center text-blue-600">100%</td>
                <td colSpan={2} className="p-3 text-muted-foreground">
                  {metrics.totalGoalsReached} of 14 Goals Reached ({metrics.reachedWeight}% completed)
                </td>
                <td className="p-3 text-center text-blue-700 font-bold">
                  {metrics.totalGoalsReached} / 14
                </td>
                <td colSpan={2} className="p-3 text-right font-bold text-foreground">
                  Final Weighted Overall Rating:
                </td>
                <td colSpan={2} className="p-3 text-center text-indigo-700 dark:text-indigo-300 text-sm">
                  {metrics.overallScore > 0 ? (
                    <span className="font-bold">
                      {metrics.overallScore.toFixed(2)} / 5.00 ({metrics.overallPercentage}%)
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Awaiting Ratings</span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* HR Overall Feedback Section (Visible to HR/Reviewer & completed reviews) */}
      {(isReviewer || assessment.status === 'reviewed') && (
        <Card className="border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              HR Reviewer Final Summary & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isReviewer ? (
              <Textarea
                value={reviewerGeneralFeedback}
                onChange={(e) => setReviewerGeneralFeedback(e.target.value)}
                placeholder="Overall performance summary, promotion / increment recommendations, development plan, key highlights..."
                rows={3}
                className="text-xs bg-white dark:bg-card"
              />
            ) : (
              <p className="text-xs text-foreground bg-white dark:bg-card p-3 rounded-lg border leading-relaxed">
                {assessment.reviewerFeedback || 'No overall feedback recorded yet.'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card border shadow-md">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            {assessment.status === 'reviewed'
              ? 'This assessment has been reviewed and finalized by HR.'
              : assessment.status === 'submitted'
              ? `Submitted by ${activeEmployee?.first_name || 'Candidate'}. HR Reviewer can grade individual goals and submit final rating.`
              : 'Draft status. Candidate can check completed goals and submit to HR.'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSaving} className="text-xs">
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          {/* Candidate Submit Button */}
          {(!isReviewer || assessment.status === 'draft') && (
            <Button
              size="sm"
              onClick={handleSubmitCandidateAssessment}
              disabled={isSubmitting}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {isSubmitting ? 'Submitting...' : 'Submit Goals to HR'}
            </Button>
          )}

          {/* HR / Reviewer Grade Submission Button */}
          {isReviewer && (
            <Button
              size="sm"
              onClick={handleSubmitReviewerRatings}
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Award className="h-4 w-4 mr-1.5" />
              {isSubmitting ? 'Saving Review...' : 'Finalize & Submit HR Review'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

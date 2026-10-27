import { useState, useEffect, useMemo } from 'react'
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
  User,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-context'
import { useEmployees } from '@/hooks/use-queries'
import {
  TrackType,
  AssessmentItem,
  EmployeeAssessment,
  getEmployeeAssessment,
  saveAssessmentDraft,
  submitAssessmentForReview,
  submitReviewerGrading,
  calculateAssessmentMetrics,
} from '@/lib/api/performanceAssessment'

const REVIEW_PERIODS = ['Q4 2026', 'Q3 2026', 'Q2 2026', 'Q1 2026', 'Annual 2026']

export function PerformanceAssessmentSheet() {
  const { user, employee: currentEmployee, isAdmin, isHR, isManager } = useAuth()
  const { data: allEmployees = [] } = useEmployees()

  const isReviewer = Boolean(isAdmin || isHR || isManager)

  // Track selection: IT or NON_IT
  const [track, setTrack] = useState<TrackType>('IT')
  const [period, setPeriod] = useState<string>('Q4 2026')

  // Selected employee for review (for HR/Managers)
  const defaultEmpId = currentEmployee?.id || user?.employee_id || allEmployees[0]?.id || 'emp-self'
  const [selectedEmpId, setSelectedEmpId] = useState<string>(defaultEmpId)

  // Active employee object
  const activeEmployee = useMemo(() => {
    return allEmployees.find((e) => e.id === selectedEmpId) || currentEmployee || null
  }, [allEmployees, selectedEmpId, currentEmployee])

  // Automatically detect track from employee department if available
  useEffect(() => {
    if (activeEmployee?.department?.name) {
      const dept = activeEmployee.department.name.toLowerCase()
      if (dept.includes('tech') || dept.includes('eng') || dept.includes('it') || dept.includes('software')) {
        setTrack('IT')
      } else if (
        dept.includes('sales') ||
        dept.includes('hr') ||
        dept.includes('marketing') ||
        dept.includes('finance') ||
        dept.includes('ops') ||
        dept.includes('operation')
      ) {
        setTrack('NON_IT')
      }
    }
  }, [activeEmployee])

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

  // Refresh assessment when employee, track, or period changes
  useEffect(() => {
    const loaded = getEmployeeAssessment(
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
    setAssessment(loaded)
    setReviewerGeneralFeedback(loaded.reviewerFeedback || '')
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
            // If checking and no self rating set, default to 3 or 4
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
      toast.success('HR Ratings & Performance Review have been finalized and recorded!')
    } catch (err: any) {
      toast.error('Failed to submit review: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
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
      toast.info('Assessment sheet reset to default.')
    }
  }

  const metrics = useMemo(() => calculateAssessmentMetrics(assessment.items), [assessment.items])

  return (
    <div className="space-y-6">
      {/* Top Navigation & Track Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-4 rounded-2xl border shadow-xs">
        {/* Track Selection Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTrack('IT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              track === 'IT'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Laptop className="h-4 w-4" />
            <span>IT Employee Assessment</span>
            <Badge variant="outline" className={`ml-1 text-[10px] ${track === 'IT' ? 'border-white/40 text-white' : ''}`}>
              14 Goals
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTrack('NON_IT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              track === 'NON_IT'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Non-IT Employee Assessment</span>
            <Badge variant="outline" className={`ml-1 text-[10px] ${track === 'NON_IT' ? 'border-white/40 text-white' : ''}`}>
              14 Goals
            </Badge>
          </button>
        </div>

        {/* Period & Employee Pickers */}
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

          {/* HR / Reviewer Employee Selector */}
          {isReviewer && (
            <div className="flex items-center gap-1.5 text-xs">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
                <SelectTrigger className="h-9 min-w-[170px] text-xs font-medium">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {allEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({e.employee_code || 'EMP'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleResetSheet} className="h-9 text-xs gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* Spreadsheet Header Banner (Replicating exact excel design from user screenshot) */}
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
              <Badge
                className={`text-[11px] font-semibold ${
                  assessment.status === 'reviewed'
                    ? 'bg-emerald-500 text-white'
                    : assessment.status === 'submitted'
                    ? 'bg-blue-500 text-white'
                    : 'bg-amber-500/80 text-white'
                }`}
              >
                {assessment.status === 'reviewed'
                  ? '✓ HR Reviewed & Graded'
                  : assessment.status === 'submitted'
                  ? '⏱ Submitted for HR Review'
                  : '✏ Candidate Self-Assessment (Draft)'}
              </Badge>
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
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> HR Reviewer Mode
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs py-1 px-3">
                <UserCheck className="h-3.5 w-3.5 mr-1.5 text-blue-300" /> Candidate Mode
              </Badge>
            )}
          </div>
        </div>

        {/* Meta Header Information Box */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Employee Name</span>
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
              {(activeEmployee as any)?.designation?.title ||
                (track === 'IT' ? 'Developer / Tester / Lead / Manager' : 'Business Functions')}
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
            <span className="text-white/60 block text-[10px] font-semibold uppercase tracking-wider">Reviewer</span>
            <span className="font-semibold text-white mt-0.5 block truncate">
              {assessment.reviewerName || 'HR Management / Manager'}
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

      {/* Candidate Instructions Notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sm">How to use this Performance Assessment Sheet:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-xs text-blue-900/90 dark:text-blue-200/90">
            <li>
              <strong>Candidate Step:</strong> Review each of the 14 goals/KPIs below. Check the{' '}
              <span className="font-semibold text-blue-700 dark:text-blue-300">"Goal Reached" checkbox</span> for every goal
              you have accomplished, provide brief comments/evidence, and click{' '}
              <strong>"Submit Goals Assessment to HR"</strong>.
            </li>
            <li>
              <strong>HR / Reviewer Step:</strong> Review the candidate's marked goals and responses. Provide individual{' '}
              <span className="font-semibold text-blue-700 dark:text-blue-300">Reviewer Ratings (1 to 5)</span> and feedback
              comments. The system will compute the final weighted score automatically.
            </li>
          </ul>
        </div>
      </div>

      {/* Main Interactive Table (with scrollbar support) */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar max-h-[75vh]">
          <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold border-b border-slate-800 text-[11px]">
                <th className="p-3 w-10 text-center">No.</th>
                <th className="p-3 min-w-[160px]">Success Factor / KPI</th>
                <th className="p-3 min-w-[220px]">Assessment Question</th>
                <th className="p-3 w-16 text-center">Weight %</th>
                <th className="p-3 min-w-[190px]">Target / Expected Standard</th>
                <th className="p-3 min-w-[180px]">Measurement / Evidence</th>
                <th className="p-3 w-28 text-center bg-blue-950/80 border-x border-blue-800">
                  <div className="flex flex-col items-center">
                    <span>Goal Reached</span>
                    <span className="text-[9px] font-normal text-blue-300">(Candidate Checkbox)</span>
                  </div>
                </th>
                <th className="p-3 min-w-[180px]">Employee Comment & Evidence</th>
                <th className="p-3 min-w-[180px] bg-indigo-950/80">Reviewer Comment (HR)</th>
                <th className="p-3 w-32 text-center bg-indigo-950/80 border-l border-indigo-800">
                  <div className="flex flex-col items-center">
                    <span>Reviewer Rating</span>
                    <span className="text-[9px] font-normal text-indigo-300">(1-5 Stars)</span>
                  </div>
                </th>
                <th className="p-3 w-20 text-center bg-indigo-900">
                  <div className="flex flex-col items-center">
                    <span>Weighted Score</span>
                    <span className="text-[9px] font-normal text-indigo-200">(Rating × Wt)</span>
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
                    className={`transition-colors ${
                      isReached ? 'bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/20' : 'hover:bg-muted/40'
                    }`}
                  >
                    {/* No. */}
                    <td className="p-3 text-center font-bold text-muted-foreground">{item.id}</td>

                    {/* Success Factor / KPI */}
                    <td className="p-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        <span>{item.successFactor}</span>
                      </div>
                    </td>

                    {/* Assessment Question */}
                    <td className="p-3 text-muted-foreground leading-relaxed">{item.assessmentQuestion}</td>

                    {/* Weight % */}
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="font-bold text-blue-600 bg-blue-50 border-blue-200">
                        {item.weight}%
                      </Badge>
                    </td>

                    {/* Target / Expected Standard */}
                    <td className="p-3 text-foreground/90 font-medium">{item.targetStandard}</td>

                    {/* Measurement / Evidence */}
                    <td className="p-3 text-muted-foreground text-[11px]">{item.measurementEvidence}</td>

                    {/* Goal Reached Checkbox */}
                    <td className="p-3 text-center bg-blue-50/30 dark:bg-blue-950/10 border-x border-border">
                      <label className="flex flex-col items-center justify-center gap-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.goalReached}
                          onChange={() => handleToggleGoalReached(item.id)}
                          className="h-5 w-5 rounded-md border-2 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 transition-transform active:scale-90"
                        />
                        <span
                          className={`text-[10px] font-bold ${
                            item.goalReached ? 'text-blue-700 dark:text-blue-400' : 'text-muted-foreground'
                          }`}
                        >
                          {item.goalReached ? '✓ Reached' : 'Pending'}
                        </span>
                      </label>
                    </td>

                    {/* Employee Comment & Evidence */}
                    <td className="p-3 space-y-1.5">
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
                    </td>

                    {/* Reviewer Comment (HR) */}
                    <td className="p-3 bg-indigo-50/20 dark:bg-indigo-950/10">
                      {isReviewer ? (
                        <Textarea
                          value={item.reviewerComment || ''}
                          onChange={(e) => handleUpdateItemField(item.id, 'reviewerComment', e.target.value)}
                          placeholder="HR Reviewer feedback / observation..."
                          rows={2}
                          className="text-[11px] resize-none h-14"
                        />
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          {item.reviewerComment || 'Pending HR review'}
                        </p>
                      )}
                    </td>

                    {/* Reviewer Rating (1-5) */}
                    <td className="p-3 text-center bg-indigo-50/20 dark:bg-indigo-950/10 border-l border-border">
                      {isReviewer ? (
                        <div className="flex flex-col items-center gap-1">
                          <Select
                            value={item.reviewerRating ? String(item.reviewerRating) : undefined}
                            onValueChange={(val) => handleUpdateReviewerRating(item.id, Number(val))}
                          >
                            <SelectTrigger className="h-8 w-24 text-xs font-bold text-center">
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
                    <td className="p-3 text-center bg-indigo-50/40 dark:bg-indigo-950/20 font-bold text-indigo-700 dark:text-indigo-300">
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
              ? 'Submitted by candidate. Reviewer can grade individual goals and submit final rating.'
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

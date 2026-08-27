import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as api from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import type {
  Announcement,
  Attendance,
  Candidate,
  Department,
  Designation,
  Document,
  Employee,
  Holiday,
  Interview,
  JobOpening,
  LeaveRequest,
  Notification,
  Payroll,
  PerformanceGoal,
  PerformanceReview,
  Task,
  MeetingHallBooking,
} from '@/lib/database.types'

function useInvalidate() {
  const qc = useQueryClient()
  const invalidate = (keys: ReadonlyArray<readonly unknown[]>) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }))
  const toastError = (e: unknown) => {
    const msg =
      (e as { message?: string })?.message ||
      (e as { error_description?: string })?.error_description ||
      (e as { details?: string })?.details ||
      (typeof e === 'string' ? e : 'Operation failed')
    console.error('API Error:', e)
    toast.error(msg)
  }
  return { qc, invalidate, toastError }
}

// ---- Employees ----
export function useEmployees(search?: string, departmentId?: string, status?: string) {
  return useQuery({
    queryKey: [...queryKeys.employees, { search, departmentId, status }],
    queryFn: () => api.fetchEmployees({ search, departmentId, status }),
  })
}

export function useEmployee(id?: string) {
  return useQuery({
    queryKey: queryKeys.employee(id ?? ''),
    queryFn: () => api.fetchEmployee(id!),
    enabled: Boolean(id),
  })
}

export function useCreateEmployee() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: (input: api.EmployeeInput) => api.createEmployee(input),
    onSuccess: () => {
      invalidate([queryKeys.employees, queryKeys.employeeStats, queryKeys.dashboardStats])
      toast.success('Employee created')
    },
    onError: toastError,
  })
}

export function useUpdateEmployee(id: string) {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: (patch: Partial<api.EmployeeInput>) => api.updateEmployee(id, patch),
    onSuccess: () => {
      invalidate([queryKeys.employees, queryKeys.employee(id), queryKeys.dashboardStats, queryKeys.attendance, queryKeys.leaveRequests])
      toast.success('Employee updated')
    },
    onError: toastError,
  })
}

export function useDeleteEmployee() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.deleteEmployee(id),
    onSuccess: () => {
      invalidate([queryKeys.employees, queryKeys.employeeStats, queryKeys.dashboardStats, queryKeys.payroll, queryKeys.attendance])
      toast.success('Employee deleted & login blocked')
    },
    onError: toastError,
  })
}

export function useDeleteEmployeeByIdOrCode() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: (idOrCode: string) => api.deleteEmployeeByIdOrCode(idOrCode),
    onSuccess: (emp) => {
      invalidate([queryKeys.employees, queryKeys.employeeStats, queryKeys.dashboardStats, queryKeys.payroll, queryKeys.attendance])
      toast.success(`Employee ${emp.first_name} ${emp.last_name} (${emp.employee_code ?? emp.id}) deleted & login blocked!`)
    },
    onError: toastError,
  })
}

// ---- Departments & Designations ----
export function useDepartments() {
  return useQuery({ queryKey: queryKeys.departments, queryFn: api.fetchDepartments })
}
export function useDesignations() {
  return useQuery({ queryKey: queryKeys.designations, queryFn: api.fetchDesignations })
}
export function useCreateDepartment() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createDepartment,
    onSuccess: () => { invalidate([queryKeys.departments]); toast.success('Department created') },
    onError: toastError,
  })
}
export function useUpdateDepartment() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ name: string; code: string; description: string; head_id: string }> }) => api.updateDepartment(id, input),
    onSuccess: () => { invalidate([queryKeys.departments]); toast.success('Department updated') },
    onError: toastError,
  })
}
export function useDeleteDepartment() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteDepartment,
    onSuccess: () => { invalidate([queryKeys.departments]); toast.success('Department deleted') },
    onError: toastError,
  })
}
export function useCreateDesignation() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createDesignation,
    onSuccess: () => { invalidate([queryKeys.designations]); toast.success('Designation created') },
    onError: toastError,
  })
}
export function useUpdateDesignation() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<{ name: string; department_id: string; level: number }> }) => api.updateDesignation(id, input),
    onSuccess: () => { invalidate([queryKeys.designations]); toast.success('Designation updated') },
    onError: toastError,
  })
}
export function useDeleteDesignation() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteDesignation,
    onSuccess: () => { invalidate([queryKeys.designations]); toast.success('Designation deleted') },
    onError: toastError,
  })
}

// ---- Attendance ----
export function useTodayAttendance(employeeId?: string) {
  return useQuery({
    queryKey: queryKeys.todayAttendance(employeeId),
    queryFn: () => api.fetchTodayAttendance(employeeId),
  })
}
export function useAttendanceMonth(employeeId: string, month: string) {
  return useQuery({
    queryKey: queryKeys.attendanceMonth(employeeId, month),
    queryFn: () => api.fetchAttendanceMonth(employeeId, month),
  })
}
export function useAttendanceLog(options?: { month?: string; employeeId?: string; status?: string }) {
  return useQuery({
    queryKey: [...queryKeys.attendance, options],
    queryFn: () => api.fetchAttendanceLog(options),
  })
}
export function useCheckIn() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.checkIn,
    onSuccess: () => {
      invalidate([queryKeys.attendance, queryKeys.dashboardStats])
      toast.success('Checked in')
    },
    onError: toastError,
  })
}
export function useCheckOut() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.checkOut,
    onSuccess: () => {
      invalidate([queryKeys.attendance, queryKeys.dashboardStats])
      toast.success('Checked out')
    },
    onError: toastError,
  })
}
export function useSetBreak() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ employeeId, action }: { employeeId: string; action: 'in' | 'out' }) => api.setBreak(employeeId, action),
    onSuccess: () => {
      invalidate([queryKeys.attendance])
      toast.success('Break updated')
    },
    onError: toastError,
  })
}

// ---- Leave ----
export function useLeaveTypes() {
  return useQuery({ queryKey: queryKeys.leaveTypes, queryFn: api.fetchLeaveTypes })
}
export function useLeaveRequests(options?: { status?: string; employeeId?: string }) {
  return useQuery({ queryKey: [...queryKeys.leaveRequests, options], queryFn: () => api.fetchLeaveRequests(options) })
}
export function useLeaveBalances(employeeId: string, year: number) {
  return useQuery({
    queryKey: queryKeys.leaveBalances(employeeId, year),
    queryFn: () => api.fetchLeaveBalances(employeeId, year),
    enabled: Boolean(employeeId),
  })
}
export function useApplyLeave() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.applyLeave,
    onSuccess: () => { invalidate([queryKeys.leaveRequests]); toast.success('Leave applied') },
    onError: toastError,
  })
}
export function useReviewLeave() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: 'approved' | 'rejected'; comment?: string }) => api.reviewLeave(id, status, comment),
    onSuccess: () => {
      invalidate([queryKeys.leaveRequests, queryKeys.leaveBalances('', new Date().getFullYear()), queryKeys.dashboardStats])
      toast.success('Leave updated')
    },
    onError: toastError,
  })
}
export function useCancelLeave() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.cancelLeave,
    onSuccess: () => { invalidate([queryKeys.leaveRequests]); toast.success('Leave cancelled') },
    onError: toastError,
  })
}

// ---- Payroll ----
export function usePayrollProfiles() {
  return useQuery({ queryKey: queryKeys.payrollProfiles, queryFn: api.fetchPayrollProfiles })
}
export function usePayroll(period?: string) {
  return useQuery({ queryKey: queryKeys.payrollPeriod(period ?? ''), queryFn: () => api.fetchPayroll(period) })
}
export function useGeneratePayroll() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: (period: string) => api.generatePayroll(period),
    onSuccess: () => {
      invalidate([queryKeys.payroll])
      toast.success('Payroll generated')
    },
    onError: toastError,
  })
}
export function useUpdatePayrollStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'generated' | 'paid' }) => api.updatePayrollStatus(id, status),
    onSuccess: () => { invalidate([queryKeys.payroll]); toast.success('Payroll updated') },
    onError: toastError,
  })
}

// ---- Documents ----
export function useDocuments(employeeId?: string) {
  return useQuery({
    queryKey: employeeId ? queryKeys.documentsFor(employeeId) : queryKeys.documents,
    queryFn: () => api.fetchDocuments(employeeId),
  })
}
export function useUploadDocument() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.uploadDocument,
    onSuccess: () => { invalidate([queryKeys.documents]); toast.success('Document uploaded') },
    onError: toastError,
  })
}
export function useDeleteDocument() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteDocument,
    onSuccess: () => { invalidate([queryKeys.documents]); toast.success('Document deleted') },
    onError: toastError,
  })
}

// ---- Tasks ----
export function useTasks(options?: { status?: string; assigneeId?: string }) {
  return useQuery({ queryKey: [...queryKeys.tasks, options], queryFn: () => api.fetchTasks(options) })
}
export function useCreateTask() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => { invalidate([queryKeys.tasks]); toast.success('Task created') },
    onError: toastError,
  })
}
export function useUpdateTaskStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateTaskStatus(id, status),
    onSuccess: () => { invalidate([queryKeys.tasks]); toast.success('Task updated') },
    onError: toastError,
  })
}
export function useDeleteTask() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: () => { invalidate([queryKeys.tasks]); toast.success('Task deleted') },
    onError: toastError,
  })
}

// ---- Announcements ----
export function useAnnouncements() {
  return useQuery({ queryKey: queryKeys.announcements, queryFn: api.fetchAnnouncements })
}
export function useCreateAnnouncement() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createAnnouncement,
    onSuccess: () => { invalidate([queryKeys.announcements]); toast.success('Announcement published') },
    onError: toastError,
  })
}
export function useDeleteAnnouncement() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteAnnouncement,
    onSuccess: () => { invalidate([queryKeys.announcements]); toast.success('Announcement deleted') },
    onError: toastError,
  })
}

// ---- Holidays ----
export function useHolidays(year?: number) {
  return useQuery({ queryKey: [...queryKeys.holidays, year], queryFn: () => api.fetchHolidays(year) })
}
export function useCreateHoliday() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createHoliday,
    onSuccess: () => { invalidate([queryKeys.holidays]); toast.success('Holiday added') },
    onError: toastError,
  })
}
export function useDeleteHoliday() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteHoliday,
    onSuccess: () => { invalidate([queryKeys.holidays]); toast.success('Holiday deleted') },
    onError: toastError,
  })
}

// ---- Performance ----
export function usePerformanceGoals(employeeId?: string) {
  return useQuery({ queryKey: [...queryKeys.performanceGoals, employeeId], queryFn: () => api.fetchPerformanceGoals(employeeId) })
}
export function useCreateGoal() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createGoal,
    onSuccess: () => { invalidate([queryKeys.performanceGoals]); toast.success('Goal created') },
    onError: toastError,
  })
}
export function useUpdateGoalStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateGoalStatus(id, status),
    onSuccess: () => { invalidate([queryKeys.performanceGoals]); toast.success('Goal updated') },
    onError: toastError,
  })
}
export function usePerformanceReviews(employeeId?: string) {
  return useQuery({ queryKey: [...queryKeys.performanceReviews, employeeId], queryFn: () => api.fetchPerformanceReviews(employeeId) })
}
export function useCreateReview() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createReview,
    onSuccess: () => { invalidate([queryKeys.performanceReviews]); toast.success('Review submitted') },
    onError: toastError,
  })
}

// ---- Recruitment ----
export function useJobOpenings(options?: { status?: string }) {
  return useQuery({ queryKey: [...queryKeys.jobOpenings, options], queryFn: () => api.fetchJobOpenings(options) })
}
export function useCreateJobOpening() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createJobOpening,
    onSuccess: () => { invalidate([queryKeys.jobOpenings]); toast.success('Job opening created') },
    onError: toastError,
  })
}
export function useUpdateJobOpening() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<JobOpening> }) => api.updateJobOpening(id, patch),
    onSuccess: () => { invalidate([queryKeys.jobOpenings]); toast.success('Job opening updated') },
    onError: toastError,
  })
}
export function useDeleteJobOpening() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteJobOpening,
    onSuccess: () => { invalidate([queryKeys.jobOpenings]); toast.success('Job opening deleted') },
    onError: toastError,
  })
}
export function useCandidates(jobOpeningId?: string) {
  return useQuery<Candidate[]>({
    queryKey: [...queryKeys.candidates, jobOpeningId] as const,
    queryFn: () => api.fetchCandidates(jobOpeningId),
  })
}
export function useCreateCandidate() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createCandidate,
    onSuccess: () => { invalidate([queryKeys.candidates]); toast.success('Candidate added') },
    onError: toastError,
  })
}
export function useUpdateCandidateStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateCandidateStatus(id, status),
    onSuccess: () => { invalidate([queryKeys.candidates, queryKeys.employees, queryKeys.dashboardStats]); toast.success('Candidate updated') },
    onError: toastError,
  })
}
export function useDeleteCandidate() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteCandidate,
    onSuccess: () => { invalidate([queryKeys.candidates]); toast.success('Candidate deleted') },
    onError: toastError,
  })
}
export function useInterviews() {
  return useQuery({ queryKey: queryKeys.interviews, queryFn: api.fetchInterviews })
}
export function useCreateInterview() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createInterview,
    onSuccess: () => { invalidate([queryKeys.interviews]); toast.success('Interview scheduled') },
    onError: toastError,
  })
}
export function useUpdateInterviewStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status, feedback, rating, metrics }: { id: string; status: string; feedback?: string; rating?: number; metrics?: Record<string, number> }) =>
      api.updateInterviewStatus(id, status, feedback, rating, metrics),
    onSuccess: () => { invalidate([queryKeys.interviews, queryKeys.candidates]); toast.success('Interview feedback & status saved') },
    onError: toastError,
  })
}
export function useOffers() {
  return useQuery({ queryKey: queryKeys.offers, queryFn: api.fetchOffers })
}
export function useCreateOffer() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createOffer,
    onSuccess: () => { invalidate([queryKeys.offers]); toast.success('Offer created') },
    onError: toastError,
  })
}
export function useUpdateOfferStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.updateOfferStatus(id, status),
    onSuccess: () => { invalidate([queryKeys.offers, queryKeys.candidates]); toast.success('Offer updated') },
    onError: toastError,
  })
}

// ---- Notifications ----
export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications, queryFn: () => api.fetchNotifications(30) })
}
export function useMarkNotificationRead() {
  const { invalidate } = useInvalidate()
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => invalidate([queryKeys.notifications]),
  })
}
export function useMarkAllNotificationsRead() {
  const { invalidate } = useInvalidate()
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => invalidate([queryKeys.notifications]),
  })
}

// ---- Dashboard ----
export function useDashboardStats() {
  return useQuery({ queryKey: queryKeys.dashboardStats, queryFn: api.fetchDashboardStats })
}

// ---- Meeting Hall ----
export function useMeetingHallBookings() {
  return useQuery({ queryKey: queryKeys.meetingHallBookings, queryFn: api.fetchMeetingHallBookings })
}
export function useCreateMeetingHallBooking() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.createMeetingHallBooking,
    onSuccess: (booking) => {
      invalidate([queryKeys.meetingHallBookings, queryKeys.dashboardStats])
      if (booking.status === 'Approved') {
        toast.success('Meeting Hall booking confirmed!')
      } else {
        toast.success('Meeting Hall request submitted to Admin / Management for approval!')
      }
    },
    onError: toastError,
  })
}
export function useUpdateMeetingHallBookingStatus() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: 'Approved' | 'Rejected'; comment?: string }) =>
      api.updateMeetingHallBookingStatus(id, status, comment),
    onSuccess: (booking) => {
      invalidate([queryKeys.meetingHallBookings, queryKeys.dashboardStats])
      toast.success(`Meeting Hall request ${booking.status === 'Approved' ? 'Approved ✓' : 'Rejected ✕'}`)
    },
    onError: toastError,
  })
}
export function useDeleteMeetingHallBooking() {
  const { invalidate, toastError } = useInvalidate()
  return useMutation({
    mutationFn: api.deleteMeetingHallBooking,
    onSuccess: () => {
      invalidate([queryKeys.meetingHallBookings, queryKeys.dashboardStats])
      toast.success('Meeting booking removed')
    },
    onError: toastError,
  })
}

// ---- Audit Logs ----
export function useAuditLogs() {
  return useQuery({ queryKey: queryKeys.auditLogs, queryFn: api.fetchAuditLogs })
}

export type { Employee, Department, Designation, Attendance, LeaveRequest, Payroll, Document, Task, Announcement, Notification, Holiday, PerformanceGoal, PerformanceReview, JobOpening, Candidate, Interview, MeetingHallBooking }


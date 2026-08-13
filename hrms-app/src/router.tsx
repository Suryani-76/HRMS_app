import { lazy, Suspense } from 'react'
import { createBrowserRouter, Route, createRoutesFromElements } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PageSkeleton } from '@/components/shared/skeletons'
import { LoginPage } from '@/features/auth/login-page'
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page'
import { ResetPasswordPage } from '@/features/auth/reset-password-page'

function safeLazy<T extends React.ComponentType<any>>(importFn: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await importFn()
    } catch (error) {
      // Automatically refresh the page if a chunk is missing (e.g. after a new deployment update)
      const key = 'chunk_reload_' + window.location.pathname
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      throw error
    }
  })
}

const DashboardPage = safeLazy(() => import('@/pages/dashboard-page'))
const EmployeesPage = safeLazy(() => import('@/pages/employees-page'))
const EmployeeDetailPage = safeLazy(() => import('@/pages/employee-detail-page'))
const DepartmentsPage = safeLazy(() => import('@/pages/departments-page'))
const AttendancePage = safeLazy(() => import('@/pages/attendance-page'))
const LeavePage = safeLazy(() => import('@/pages/leave-page'))
const PayrollPage = safeLazy(() => import('@/pages/payroll-page'))
const DocumentsPage = safeLazy(() => import('@/pages/documents-page'))
const TasksPage = safeLazy(() => import('@/pages/tasks-page'))
const AnnouncementsPage = safeLazy(() => import('@/pages/announcements-page'))
const HolidaysPage = safeLazy(() => import('@/pages/holidays-page'))
const PerformancePage = safeLazy(() => import('@/pages/performance-page'))
const RecruitmentPage = safeLazy(() => import('@/pages/recruitment-page'))
const ReportsPage = safeLazy(() => import('@/pages/reports-page'))
const AuditLogsPage = safeLazy(() => import('@/pages/audit-logs-page'))
const NotificationsPage = safeLazy(() => import('@/pages/notifications-page'))
const ProfilePage = safeLazy(() => import('@/pages/profile-page'))
const SettingsPage = safeLazy(() => import('@/pages/settings-page'))
const PayslipsPage = safeLazy(() => import('@/pages/payslips-page'))
const CareersPage = safeLazy(() => import('@/pages/careers-page'))
const CandidatePortalPage = safeLazy(() => import('@/pages/candidate-portal'))
const InsuranceEnrollmentPage = safeLazy(() => import('@/pages/insurance-enrollment-page'))
const AssetsPage = safeLazy(() => import('@/pages/assets-page'))
const MeetingHallPage = safeLazy(() => import('@/pages/meeting-hall-page'))
const IncentivesDashboardPage = safeLazy(() => import('@/pages/incentives-dashboard-page'))
const NotFoundPage = safeLazy(() => import('@/pages/not-found-page'))

function withSuspense(node: React.ReactNode) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-start justify-center pt-16">
          <PageSkeleton />
        </div>
      }
    >
      {node}
    </Suspense>
  )
}

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/careers" element={withSuspense(<CareersPage />)} />
      <Route path="/candidate-portal" element={withSuspense(<CandidatePortalPage />)} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={withSuspense(<DashboardPage />)} />
          <Route path="employees" element={withSuspense(<EmployeesPage />)} />
          <Route path="employees/:id" element={withSuspense(<EmployeeDetailPage />)} />
          <Route path="departments" element={withSuspense(<DepartmentsPage />)} />
          <Route path="attendance" element={withSuspense(<AttendancePage />)} />
          <Route path="leave" element={withSuspense(<LeavePage />)} />
          <Route path="payroll" element={withSuspense(<PayrollPage />)} />
          <Route path="payslips" element={withSuspense(<PayslipsPage />)} />
          <Route path="documents" element={withSuspense(<DocumentsPage />)} />
          <Route path="tasks" element={withSuspense(<TasksPage />)} />
          <Route path="announcements" element={withSuspense(<AnnouncementsPage />)} />
          <Route path="holidays" element={withSuspense(<HolidaysPage />)} />
          <Route path="performance" element={withSuspense(<PerformancePage />)} />
          <Route path="recruitment" element={withSuspense(<RecruitmentPage />)} />
          <Route path="reports" element={withSuspense(<ReportsPage />)} />
          <Route path="notifications" element={withSuspense(<NotificationsPage />)} />
          <Route path="profile" element={withSuspense(<ProfilePage />)} />
          <Route path="settings" element={withSuspense(<SettingsPage />)} />
          <Route path="insurance-enrollment" element={withSuspense(<InsuranceEnrollmentPage />)} />
          <Route path="assets" element={withSuspense(<AssetsPage />)} />
          <Route path="meeting-hall" element={withSuspense(<MeetingHallPage />)} />
          <Route path="incentives" element={withSuspense(<IncentivesDashboardPage />)} />
          <Route
            path="audit-logs"
            element={<ProtectedRoute adminOnly>{withSuspense(<AuditLogsPage />)}</ProtectedRoute>}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
  { basename: import.meta.env.BASE_URL }
)

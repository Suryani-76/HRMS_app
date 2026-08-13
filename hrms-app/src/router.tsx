import { lazy, Suspense } from 'react'
import { createBrowserRouter, Route, createRoutesFromElements } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { PageSkeleton } from '@/components/shared/skeletons'
import { LoginPage } from '@/features/auth/login-page'
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page'
import { ResetPasswordPage } from '@/features/auth/reset-password-page'

const DashboardPage = lazy(() => import('@/pages/dashboard-page'))
const EmployeesPage = lazy(() => import('@/pages/employees-page'))
const EmployeeDetailPage = lazy(() => import('@/pages/employee-detail-page'))
const DepartmentsPage = lazy(() => import('@/pages/departments-page'))
const AttendancePage = lazy(() => import('@/pages/attendance-page'))
const LeavePage = lazy(() => import('@/pages/leave-page'))
const PayrollPage = lazy(() => import('@/pages/payroll-page'))
const DocumentsPage = lazy(() => import('@/pages/documents-page'))
const TasksPage = lazy(() => import('@/pages/tasks-page'))
const AnnouncementsPage = lazy(() => import('@/pages/announcements-page'))
const HolidaysPage = lazy(() => import('@/pages/holidays-page'))
const PerformancePage = lazy(() => import('@/pages/performance-page'))
const RecruitmentPage = lazy(() => import('@/pages/recruitment-page'))
const ReportsPage = lazy(() => import('@/pages/reports-page'))
const AuditLogsPage = lazy(() => import('@/pages/audit-logs-page'))
const NotificationsPage = lazy(() => import('@/pages/notifications-page'))
const ProfilePage = lazy(() => import('@/pages/profile-page'))
const SettingsPage = lazy(() => import('@/pages/settings-page'))
const PayslipsPage = lazy(() => import('@/pages/payslips-page'))
const CareersPage = lazy(() => import('@/pages/careers-page'))
const CandidatePortalPage = lazy(() => import('@/pages/candidate-portal'))
const InsuranceEnrollmentPage = lazy(() => import('@/pages/insurance-enrollment-page'))
const AssetsPage = lazy(() => import('@/pages/assets-page'))
const MeetingHallPage = lazy(() => import('@/pages/meeting-hall-page'))
const IncentivesDashboardPage = lazy(() => import('@/pages/incentives-dashboard-page'))
const NotFoundPage = lazy(() => import('@/pages/not-found-page'))

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

import { createBrowserRouter, Route, createRoutesFromElements } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { LoginPage } from '@/features/auth/login-page'
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page'
import { ResetPasswordPage } from '@/features/auth/reset-password-page'

import DashboardPage from '@/pages/dashboard-page'
import EmployeesPage from '@/pages/employees-page'
import EmployeeFilterPage from '@/pages/employee-filter-page'
import EmployeeDetailPage from '@/pages/employee-detail-page'
import DepartmentsPage from '@/pages/departments-page'
import AttendancePage from '@/pages/attendance-page'
import LeavePage from '@/pages/leave-page'
import PayrollPage from '@/pages/payroll-page'
import DocumentsPage from '@/pages/documents-page'
import TasksPage from '@/pages/tasks-page'
import AnnouncementsPage from '@/pages/announcements-page'
import HolidaysPage from '@/pages/holidays-page'
import PerformancePage from '@/pages/performance-page'
import RecruitmentPage from '@/pages/recruitment-page'
import ReportsPage from '@/pages/reports-page'
import AuditLogsPage from '@/pages/audit-logs-page'
import NotificationsPage from '@/pages/notifications-page'
import ProfilePage from '@/pages/profile-page'
import SettingsPage from '@/pages/settings-page'
import PayslipsPage from '@/pages/payslips-page'
import CareersPage from '@/pages/careers-page'
import CandidatePortalPage from '@/pages/candidate-portal'
import InsuranceEnrollmentPage from '@/pages/insurance-enrollment-page'
import AssetsPage from '@/pages/assets-page'
import MeetingHallPage from '@/pages/meeting-hall-page'
import IncentivesDashboardPage from '@/pages/incentives-dashboard-page'
import NotFoundPage from '@/pages/not-found-page'

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/candidate-portal" element={<CandidatePortalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="employees/filter" element={<EmployeeFilterPage />} />
          <Route path="employees/:id" element={<EmployeeDetailPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="payslips" element={<PayslipsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="holidays" element={<HolidaysPage />} />
          <Route path="performance" element={<PerformancePage />} />
          <Route path="recruitment" element={<RecruitmentPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="insurance-enrollment" element={<InsuranceEnrollmentPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="meeting-hall" element={<MeetingHallPage />} />
          <Route path="incentives" element={<IncentivesDashboardPage />} />
          <Route
            path="audit-logs"
            element={<ProtectedRoute adminOnly><AuditLogsPage /></ProtectedRoute>}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
  { basename: import.meta.env.BASE_URL }
)

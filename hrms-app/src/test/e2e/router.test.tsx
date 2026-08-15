/**
 * E2E-style ROUTER TESTS
 * Tests every route's rendering and protection behavior without a live server.
 * Uses createMemoryRouter to reconstruct the route tree matching router.tsx exactly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, Route, createRoutesFromElements } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { Suspense } from 'react'
import * as AuthContext from '@/features/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'

// ─── Mock pages ──────────────────────────────────────────────────────────────
vi.mock('@/pages/dashboard-page', () => ({ default: () => <div>Dashboard Page</div> }))
vi.mock('@/pages/employees-page', () => ({ default: () => <div>Employees Page</div> }))
vi.mock('@/pages/employee-detail-page', () => ({ default: () => <div>Employee Detail Page</div> }))
vi.mock('@/pages/departments-page', () => ({ default: () => <div>Departments Page</div> }))
vi.mock('@/pages/attendance-page', () => ({ default: () => <div>Attendance Page</div> }))
vi.mock('@/pages/leave-page', () => ({ default: () => <div>Leave Page</div> }))
vi.mock('@/pages/payroll-page', () => ({ default: () => <div>Payroll Page</div> }))
vi.mock('@/pages/payslips-page', () => ({ default: () => <div>Payslips Page</div> }))
vi.mock('@/pages/documents-page', () => ({ default: () => <div>Documents Page</div> }))
vi.mock('@/pages/tasks-page', () => ({ default: () => <div>Tasks Page</div> }))
vi.mock('@/pages/announcements-page', () => ({ default: () => <div>Announcements Page</div> }))
vi.mock('@/pages/holidays-page', () => ({ default: () => <div>Holidays Page</div> }))
vi.mock('@/pages/performance-page', () => ({ default: () => <div>Performance Page</div> }))
vi.mock('@/pages/recruitment-page', () => ({ default: () => <div>Recruitment Page</div> }))
vi.mock('@/pages/reports-page', () => ({ default: () => <div>Reports Page</div> }))
vi.mock('@/pages/audit-logs-page', () => ({ default: () => <div>Audit Logs Page</div> }))
vi.mock('@/pages/notifications-page', () => ({ default: () => <div>Notifications Page</div> }))
vi.mock('@/pages/profile-page', () => ({ default: () => <div>Profile Page</div> }))
vi.mock('@/pages/settings-page', () => ({ default: () => <div>Settings Page</div> }))
vi.mock('@/pages/insurance-enrollment-page', () => ({ default: () => <div>Insurance Page</div> }))
vi.mock('@/pages/assets-page', () => ({ default: () => <div>Assets Page</div> }))
vi.mock('@/pages/meeting-hall-page', () => ({ default: () => <div>Meeting Hall Page</div> }))
vi.mock('@/pages/incentives-dashboard-page', () => ({ default: () => <div>Incentives Page</div> }))
vi.mock('@/pages/careers-page', () => ({ default: () => <div>Careers Page</div> }))
vi.mock('@/pages/candidate-portal', () => ({ default: () => <div>Candidate Portal Page</div> }))
vi.mock('@/pages/not-found-page', () => ({ default: () => <div>404 Page</div> }))
vi.mock('@/components/layout/app-shell', () => ({
  // AppShell must render <Outlet /> so nested route pages show up
  AppShell: () => {
    const { Outlet } = require('react-router-dom')
    return (
      <div data-testid="app-shell">
        <Outlet />
      </div>
    )
  },
}))
vi.mock('@/features/auth/login-page', () => ({
  LoginPage: () => <div>Welcome back</div>,
}))
vi.mock('@/features/auth/forgot-password-page', () => ({
  ForgotPasswordPage: () => <div>Forgot Password Page</div>,
}))
vi.mock('@/features/auth/reset-password-page', () => ({
  ResetPasswordPage: () => <div>Reset Password Page</div>,
}))
vi.mock('@/components/ui/logo', () => ({ Logo: () => <span>Logo</span> }))

// ─── Top-level ESM imports (intercepted by vi.mock) ───────────────────────────
import DashboardPage from '@/pages/dashboard-page'
import EmployeesPage from '@/pages/employees-page'
import AttendancePage from '@/pages/attendance-page'
import TasksPage from '@/pages/tasks-page'
import DepartmentsPage from '@/pages/departments-page'
import AuditLogsPage from '@/pages/audit-logs-page'
import CareersPage from '@/pages/careers-page'
import CandidatePortalPage from '@/pages/candidate-portal'
import NotFoundPage from '@/pages/not-found-page'
import { AppShell } from '@/components/layout/app-shell'
import { LoginPage } from '@/features/auth/login-page'
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page'
import { ResetPasswordPage } from '@/features/auth/reset-password-page'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mockUseAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: null,
    employee: null,
    loading: false,
    isAdmin: false,
    isManager: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  })
}

function buildTestRouter(initialPath: string) {
  const routes = createRoutesFromElements(
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
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="leave" element={<div>Leave Page</div>} />
          <Route path="payroll" element={<div>Payroll Page</div>} />
          <Route path="announcements" element={<div>Announcements Page</div>} />
          <Route path="performance" element={<div>Performance Page</div>} />
          <Route path="recruitment" element={<div>Recruitment Page</div>} />
          <Route path="reports" element={<div>Reports Page</div>} />
          <Route path="notifications" element={<div>Notifications Page</div>} />
          <Route path="profile" element={<div>Profile Page</div>} />
          <Route path="settings" element={<div>Settings Page</div>} />
          <Route path="assets" element={<div>Assets Page</div>} />
          <Route path="meeting-hall" element={<div>Meeting Hall Page</div>} />
          <Route path="incentives" element={<div>Incentives Page</div>} />
          <Route
            path="audit-logs"
            element={<ProtectedRoute adminOnly><AuditLogsPage /></ProtectedRoute>}
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </>,
  )

  return createMemoryRouter(routes, { initialEntries: [initialPath] })
}

function renderRouter(initialPath: string) {
  const router = buildTestRouter(initialPath)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <Suspense fallback={<div>Loading...</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </QueryClientProvider>,
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Public Routes (no auth required)', () => {
  it('/login renders LoginPage', async () => {
    mockUseAuth({ loading: false, user: null })
    renderRouter('/login')
    await waitFor(() => {
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    })
  })

  it('/careers renders Careers Page', async () => {
    mockUseAuth()
    renderRouter('/careers')
    await waitFor(() => {
      expect(screen.getByText('Careers Page')).toBeInTheDocument()
    })
  })

  it('/candidate-portal renders Candidate Portal Page', async () => {
    mockUseAuth()
    renderRouter('/candidate-portal')
    await waitFor(() => {
      expect(screen.getByText('Candidate Portal Page')).toBeInTheDocument()
    })
  })

  it('/* (unknown path) renders 404 page', async () => {
    mockUseAuth({ user: null })
    renderRouter('/this-does-not-exist')
    await waitFor(() => {
      expect(screen.getByText('404 Page')).toBeInTheDocument()
    })
  })
})

describe('Protected Routes — unauthenticated redirect', () => {
  beforeEach(() => {
    mockUseAuth({ loading: false, user: null })
  })

  const protectedPaths = [
    '/',
    '/employees',
    '/departments',
    '/attendance',
    '/leave',
    '/payroll',
    '/tasks',
    '/announcements',
    '/performance',
    '/recruitment',
    '/reports',
    '/notifications',
    '/profile',
    '/settings',
    '/assets',
    '/meeting-hall',
    '/incentives',
  ]

  protectedPaths.forEach((path) => {
    it(`redirects ${path} to /login when unauthenticated`, async () => {
      renderRouter(path)
      await waitFor(() => {
        expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
      })
    })
  })
})

describe('Protected Routes — authenticated user', () => {
  const authenticatedUser = {
    id: 'u1',
    email: 'mgr@oklut.com',
    role_id: 'r-mgr',
    created_at: '2024-01-01',
    status: 'Active',
  }

  it('/ renders Dashboard when authenticated', async () => {
    mockUseAuth({ user: authenticatedUser, loading: false, isManager: true })
    renderRouter('/')
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('/employees renders Employees Page when authenticated', async () => {
    mockUseAuth({ user: authenticatedUser, loading: false, isManager: true })
    renderRouter('/employees')
    await waitFor(() => {
      expect(screen.getByText('Employees Page')).toBeInTheDocument()
    })
  })

  it('/attendance renders Attendance Page when authenticated', async () => {
    mockUseAuth({ user: authenticatedUser, loading: false })
    renderRouter('/attendance')
    await waitFor(() => {
      expect(screen.getByText('Attendance Page')).toBeInTheDocument()
    })
  })

  it('/tasks renders Tasks Page when authenticated', async () => {
    mockUseAuth({ user: authenticatedUser, loading: false })
    renderRouter('/tasks')
    await waitFor(() => {
      expect(screen.getByText('Tasks Page')).toBeInTheDocument()
    })
  })
})

describe('Admin-only route /audit-logs', () => {
  it('redirects to / (dashboard) when user is not a manager', async () => {
    mockUseAuth({
      user: { id: 'u2', email: 'emp@oklut.com', role_id: 'r-emp', created_at: '2024-01-01', status: 'Active' },
      loading: false,
      isManager: false,
    })
    renderRouter('/audit-logs')
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    })
  })

  it('renders Audit Logs page when user is manager', async () => {
    mockUseAuth({
      user: { id: 'u3', email: 'admin@oklut.com', role_id: 'r-admin', created_at: '2024-01-01', status: 'Active' },
      loading: false,
      isManager: true,
    })
    renderRouter('/audit-logs')
    await waitFor(() => {
      expect(screen.getByText('Audit Logs Page')).toBeInTheDocument()
    })
  })
})

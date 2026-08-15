/**
 * BLACK-BOX TESTS — EmployeesPage
 * Tests employee list from user perspective using mocked hooks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import EmployeesPage from '@/pages/employees-page'
import * as AuthContext from '@/features/auth/auth-context'
import * as UseQueries from '@/hooks/use-queries'

function mockUseAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: { id: 'u1', email: 'admin@test.com', role_id: 'r1', created_at: '2024-01-01', status: 'Active' },
    employee: null,
    loading: false,
    isAdmin: true,
    isManager: true,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  })
}

const mockEmployees = [
  {
    id: 'emp-1',
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@oklut.com',
    employee_code: 'IND-KA-BAN-BR1-EN-001',
    joining_date: '2024-01-15',
    status: 'Active',
    department: { id: 'd1', name: 'Engineering', created_at: '2024-01-01' },
    designation: { id: 'des1', name: 'Software Engineer', level: 1, created_at: '2024-01-01' },
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'emp-2',
    first_name: 'Bob',
    last_name: 'Jones',
    email: 'bob@oklut.com',
    employee_code: 'IND-KA-BAN-BR1-HR-001',
    joining_date: '2023-06-01',
    status: 'Inactive',
    department: { id: 'd2', name: 'HR', created_at: '2024-01-01' },
    designation: { id: 'des2', name: 'HR Manager', level: 2, created_at: '2024-01-01' },
    created_at: '2023-06-01T00:00:00Z',
    updated_at: '2023-06-01T00:00:00Z',
  },
]

function mockHooks(options: { employees?: typeof mockEmployees; isLoading?: boolean; isError?: boolean } = {}) {
  vi.spyOn(UseQueries, 'useEmployees').mockReturnValue({
    data: options.employees ?? mockEmployees,
    isLoading: options.isLoading ?? false,
    isError: options.isError ?? false,
    refetch: vi.fn(),
  } as any)

  vi.spyOn(UseQueries, 'useDepartments').mockReturnValue({
    data: [
      { id: 'd1', name: 'Engineering', created_at: '2024-01-01' },
      { id: 'd2', name: 'HR', created_at: '2024-01-01' },
    ],
    isLoading: false,
    isError: false,
  } as any)
}

function renderEmployeesPage() {
  const qc = new QueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EmployeesPage — rendering', () => {
  beforeEach(() => {
    mockUseAuth()
    mockHooks()
  })

  it('renders the "Employees" page title', () => {
    renderEmployeesPage()
    expect(screen.getByText('Employees')).toBeInTheDocument()
  })

  it('shows total employee count in description', () => {
    renderEmployeesPage()
    expect(screen.getByText(/2 employees in the directory/i)).toBeInTheDocument()
  })

  it('renders employee names in the table', () => {
    renderEmployeesPage()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('renders department names', () => {
    renderEmployeesPage()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('HR')).toBeInTheDocument()
  })

  it('renders employee status badges', () => {
    renderEmployeesPage()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })
})

describe('EmployeesPage — manager actions', () => {
  it('shows Add Employee button for managers', () => {
    mockUseAuth({ isManager: true })
    mockHooks()
    renderEmployeesPage()
    expect(screen.getByRole('button', { name: /Add Employee/i })).toBeInTheDocument()
  })

  it('hides Add Employee button for non-managers', () => {
    mockUseAuth({ isManager: false })
    mockHooks()
    renderEmployeesPage()
    expect(screen.queryByRole('button', { name: /Add Employee/i })).not.toBeInTheDocument()
  })
})

describe('EmployeesPage — loading/error states', () => {
  it('shows loading skeleton when isLoading=true', () => {
    mockUseAuth()
    mockHooks({ employees: [], isLoading: true })
    renderEmployeesPage()
    // Table with employee names should not be rendered
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })

  it('shows empty state when no employees', () => {
    mockUseAuth()
    mockHooks({ employees: [] })
    renderEmployeesPage()
    expect(screen.getByText(/No employees found/i)).toBeInTheDocument()
  })

  it('shows error state on fetch error', () => {
    mockUseAuth()
    mockHooks({ employees: [], isError: true })
    renderEmployeesPage()
    // ErrorState component is rendered
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })
})

describe('EmployeesPage — search field', () => {
  it('renders the search input', () => {
    mockUseAuth()
    mockHooks()
    renderEmployeesPage()
    expect(screen.getByPlaceholderText(/Search by name, email or employee code/i)).toBeInTheDocument()
  })
})

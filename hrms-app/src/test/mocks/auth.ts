import { vi } from 'vitest'

// Re-export a factory so each test can customize values
export function makeAuthState(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    employee: null,
    loading: false,
    isAdmin: false,
    isManager: false,
    login: vi.fn().mockResolvedValue({ error: null }),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

export const mockAdminUser = {
  id: 'user-admin-1',
  email: 'admin@oklut.com',
  role_id: 'role-admin',
  status: 'Active',
  created_at: '2024-01-01T00:00:00Z',
  role: { id: 'role-admin', name: 'Admin', created_at: '2024-01-01T00:00:00Z' },
  employee: null,
}

export const mockManagerUser = {
  id: 'user-mgr-1',
  email: 'manager@oklut.com',
  role_id: 'role-mgr',
  status: 'Active',
  created_at: '2024-01-01T00:00:00Z',
  role: { id: 'role-mgr', name: 'Manager', created_at: '2024-01-01T00:00:00Z' },
  employee: null,
}

export const mockRegularUser = {
  id: 'user-emp-1',
  email: 'employee@oklut.com',
  role_id: 'role-emp',
  status: 'Active',
  created_at: '2024-01-01T00:00:00Z',
  role: { id: 'role-emp', name: 'Employee', created_at: '2024-01-01T00:00:00Z' },
  employee: null,
}

export const mockEmployee = {
  id: 'emp-1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@oklut.com',
  joining_date: '2024-01-15',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

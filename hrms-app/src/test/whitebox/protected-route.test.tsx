/**
 * WHITE-BOX TESTS — ProtectedRoute (protected-route.tsx)
 * Tests every branch: loading, unauthenticated, authenticated, adminOnly
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import React from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import * as AuthContext from '@/features/auth/auth-context'

function mockUseAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>>) {
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

function renderProtectedRoute(
  props: { adminOnly?: boolean } = {},
  childText = 'Protected Content',
) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/" element={<div>Home Page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute {...props}>
              <div>{childText}</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute — loading state', () => {
  it('shows a skeleton/loading element when loading=true', () => {
    mockUseAuth({ loading: true, user: null })
    renderProtectedRoute()
    // No redirect should happen; loader is rendered
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

describe('ProtectedRoute — unauthenticated', () => {
  it('redirects to /login when user is null', () => {
    mockUseAuth({ loading: false, user: null })
    renderProtectedRoute()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
})

describe('ProtectedRoute — authenticated', () => {
  it('renders children when user is present', () => {
    mockUseAuth({
      loading: false,
      user: { id: 'u1', email: 'a@b.com', role_id: 'r1', created_at: '2024-01-01', status: 'Active' },
    })
    renderProtectedRoute()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })
})

describe('ProtectedRoute — adminOnly', () => {
  it('redirects to / when adminOnly=true and user is not manager', () => {
    mockUseAuth({
      loading: false,
      isManager: false,
      user: { id: 'u2', email: 'emp@b.com', role_id: 'r-emp', created_at: '2024-01-01', status: 'Active' },
    })
    renderProtectedRoute({ adminOnly: true })
    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when adminOnly=true and user isManager', () => {
    mockUseAuth({
      loading: false,
      isManager: true,
      user: { id: 'u3', email: 'mgr@b.com', role_id: 'r-mgr', created_at: '2024-01-01', status: 'Active' },
    })
    renderProtectedRoute({ adminOnly: true })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders children for admin user with adminOnly=true', () => {
    mockUseAuth({
      loading: false,
      isAdmin: true,
      isManager: true,
      user: { id: 'u4', email: 'admin@b.com', role_id: 'r-admin', created_at: '2024-01-01', status: 'Active' },
    })
    renderProtectedRoute({ adminOnly: true })
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})

describe('ProtectedRoute — no children (Outlet mode)', () => {
  it('renders without crashing when no children provided (Outlet rendered)', () => {
    mockUseAuth({
      loading: false,
      user: { id: 'u5', email: 'x@b.com', role_id: 'r1', created_at: '2024-01-01', status: 'Active' },
    })
    // No children = Outlet mode, won't error
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Outlet Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Outlet Content')).toBeInTheDocument()
  })
})

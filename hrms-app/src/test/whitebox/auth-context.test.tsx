/**
 * WHITE-BOX TESTS — Auth Context (auth-context.tsx)
 * Tests internal login logic, error handling branches, and state management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'

// Helper component to expose auth context values
function AuthConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="user">{auth.user ? auth.user.email : 'null'}</span>
      <span data-testid="is-admin">{String(auth.isAdmin)}</span>
      <span data-testid="is-manager">{String(auth.isManager)}</span>
      <button data-testid="login-btn" onClick={() => auth.login('test@test.com', 'password')}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
    </div>
  )
}

function renderWithAuthProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  )
}

describe('AuthProvider — rendering', () => {
  it('renders children without crashing', async () => {
    renderWithAuthProvider()
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })
  })

  it('starts with loading=false after session resolves (no session)', async () => {
    renderWithAuthProvider()
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
  })

  it('shows user as null when not authenticated', async () => {
    renderWithAuthProvider()
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null')
    })
  })

  it('isAdmin is false when not authenticated', async () => {
    renderWithAuthProvider()
    await waitFor(() => {
      expect(screen.getByTestId('is-admin').textContent).toBe('false')
    })
  })
})

describe('AuthProvider — login()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { error: null } on successful login', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ data: {}, error: null })
    vi.mocked(supabase.auth.signInWithPassword).mockImplementation(mockSignIn)

    let loginResult: { error: string | null } = { error: 'not called' }
    function LoginTester() {
      const { login } = useAuth()
      return (
        <button
          onClick={async () => {
            loginResult = await login('test@test.com', 'pass')
          }}
        >
          Login
        </button>
      )
    }
    render(
      <AuthProvider>
        <LoginTester />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument())
    await act(async () => {
      screen.getByText('Login').click()
    })
    await waitFor(() => {
      expect(loginResult.error).toBeNull()
    })
  })

  it('returns human-readable error for invalid credentials', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 } as any,
    })

    let result: { error: string | null } = { error: null }
    function LoginTester() {
      const { login } = useAuth()
      return (
        <button
          onClick={async () => {
            result = await login('wrong@test.com', 'wrongpass')
          }}
        >
          Login
        </button>
      )
    }
    render(
      <AuthProvider>
        <LoginTester />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument())
    await act(async () => {
      screen.getByText('Login').click()
    })
    await waitFor(() => {
      expect(result.error).toContain('Invalid email or password')
    })
  })

  it('returns network error message when fetch fails', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Failed to fetch', name: 'FetchError', status: 0 } as any,
    })

    let result: { error: string | null } = { error: null }
    function LoginTester() {
      const { login } = useAuth()
      return (
        <button
          onClick={async () => {
            result = await login('a@b.com', 'pass')
          }}
        >
          Login
        </button>
      )
    }
    render(
      <AuthProvider>
        <LoginTester />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument())
    await act(async () => {
      screen.getByText('Login').click()
    })
    await waitFor(() => {
      expect(result.error).toContain('Network error')
    })
  })

  it('returns connectivity error when error message is empty JSON "{}"', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: '{}', name: 'AuthError', status: 0 } as any,
    })

    let result: { error: string | null } = { error: null }
    function LoginTester() {
      const { login } = useAuth()
      return (
        <button
          onClick={async () => {
            result = await login('a@b.com', 'pass')
          }}
        >
          Login
        </button>
      )
    }
    render(
      <AuthProvider>
        <LoginTester />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument())
    await act(async () => {
      screen.getByText('Login').click()
    })
    await waitFor(() => {
      expect(result.error).toContain('Cannot connect')
    })
  })

  it('catches thrown exceptions and returns Connection error', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockRejectedValue(
      new Error('network timeout'),
    )

    let result: { error: string | null } = { error: null }
    function LoginTester() {
      const { login } = useAuth()
      return (
        <button
          onClick={async () => {
            result = await login('a@b.com', 'pass')
          }}
        >
          Login
        </button>
      )
    }
    render(
      <AuthProvider>
        <LoginTester />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument())
    await act(async () => {
      screen.getByText('Login').click()
    })
    await waitFor(() => {
      expect(result.error).toContain('Connection error')
    })
  })
})

describe('useAuth hook', () => {
  it('returns default context when used outside provider', () => {
    function Naked() {
      const { loading, user } = useAuth()
      return <span data-testid="data">{`${loading}|${user}`}</span>
    }
    render(<Naked />)
    // Default context has loading: true, user: null
    expect(screen.getByTestId('data').textContent).toContain('null')
  })
})

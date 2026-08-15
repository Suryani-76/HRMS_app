/**
 * BLACK-BOX TESTS — LoginPage
 * Tests the login form from a user's perspective (behavior, not implementation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { LoginPage } from '@/features/auth/login-page'
import * as AuthContext from '@/features/auth/auth-context'

// Mock Logo to avoid file URL issues in test environment
vi.mock('@/components/ui/logo', () => ({
  Logo: () => <div data-testid="logo">OKLUT Logo</div>,
}))

function mockUseAuth(overrides: Partial<ReturnType<typeof AuthContext.useAuth>> = {}) {
  vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
    user: null,
    employee: null,
    loading: false,
    isAdmin: false,
    isManager: false,
    login: vi.fn().mockResolvedValue({ error: null }),
    logout: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  })
}

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage — rendering', () => {
  beforeEach(() => {
    mockUseAuth()
    localStorage.clear()
  })

  it('renders the "Welcome back" heading', () => {
    renderLoginPage()
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
  })

  it('renders an email input field', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('you@oklut.com')).toBeInTheDocument()
  })

  it('renders a password input field', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
  })

  it('renders a Sign in button', () => {
    renderLoginPage()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders Forgot password link', () => {
    renderLoginPage()
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
  })

  it('renders "Remember me" checkbox', () => {
    renderLoginPage()
    expect(screen.getByText('Remember me')).toBeInTheDocument()
  })

  it('renders "View Open Positions" link', () => {
    renderLoginPage()
    expect(screen.getByText('View Open Positions')).toBeInTheDocument()
  })

  it('renders "Powered by Oklut Technologies" branding', () => {
    renderLoginPage()
    expect(screen.getByText(/Powered by Oklut Technologies/i)).toBeInTheDocument()
  })

  it('renders the Logo component', () => {
    renderLoginPage()
    expect(screen.getAllByTestId('logo').length).toBeGreaterThan(0)
  })
})

describe('LoginPage — password visibility toggle', () => {
  beforeEach(() => {
    mockUseAuth()
    localStorage.clear()
  })

  it('starts with password hidden (type=password)', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password')
  })

  it('shows password when eye button is clicked', async () => {
    renderLoginPage()
    const toggleBtn = screen.getByLabelText('Show password')
    await userEvent.click(toggleBtn)
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text')
  })

  it('hides password again on second click', async () => {
    renderLoginPage()
    const toggleBtn = screen.getByLabelText('Show password')
    await userEvent.click(toggleBtn)
    const hideBtn = screen.getByLabelText('Hide password')
    await userEvent.click(hideBtn)
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password')
  })
})

describe('LoginPage — form submission', () => {
  beforeEach(() => {
    mockUseAuth()
    localStorage.clear()
  })

  it('calls login() with correct email and password on submit', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: null })
    mockUseAuth({ login: mockLogin })
    renderLoginPage()

    await userEvent.type(screen.getByPlaceholderText('you@oklut.com'), 'admin@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123')
    })
  })

  it('shows error message when login returns an error', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: 'Invalid email or password. Please try again.' })
    mockUseAuth({ login: mockLogin })
    renderLoginPage()

    await userEvent.type(screen.getByPlaceholderText('you@oklut.com'), 'wrong@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password. Please try again.')).toBeInTheDocument()
    })
  })

  it('disables Sign In button while submitting', async () => {
    // Use a login that never resolves to test disabled state
    const mockLogin = vi.fn().mockImplementation(() => new Promise(() => {}))
    mockUseAuth({ login: mockLogin })
    renderLoginPage()

    await userEvent.type(screen.getByPlaceholderText('you@oklut.com'), 'a@b.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass')

    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
    })
  })

  it('saves email to localStorage when "Remember me" is checked', async () => {
    const mockLogin = vi.fn().mockResolvedValue({ error: null })
    mockUseAuth({ login: mockLogin })
    renderLoginPage()

    await userEvent.type(screen.getByPlaceholderText('you@oklut.com'), 'remember@test.com')
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'pass')
    // checkbox is checked by default
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(localStorage.getItem('hrms_remember_email')).toBe('remember@test.com')
    })
  })

  it('email input has type "email"', () => {
    renderLoginPage()
    const emailInput = screen.getByPlaceholderText('you@oklut.com')
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('email input has required attribute', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('you@oklut.com')).toHaveAttribute('required')
  })

  it('password input has required attribute', () => {
    renderLoginPage()
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('required')
  })
})

describe('LoginPage — loading state', () => {
  it('shows spinner when loading=true (no form)', () => {
    mockUseAuth({ loading: true })
    renderLoginPage()
    // No form rendered; spinner shown instead
    expect(screen.queryByPlaceholderText('you@oklut.com')).not.toBeInTheDocument()
  })
})

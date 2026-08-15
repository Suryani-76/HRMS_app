/**
 * BLACK-BOX TESTS — NotFoundPage
 * Tests 404 page from user perspective.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import NotFoundPage from '@/pages/not-found-page'

function renderNotFoundPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  )
}

describe('NotFoundPage', () => {
  it('renders the 404 heading', () => {
    renderNotFoundPage()
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
  })

  it("renders descriptive message about the missing page", () => {
    renderNotFoundPage()
    expect(screen.getByText(/The page you're looking for doesn't exist/i)).toBeInTheDocument()
  })

  it('renders "Back to dashboard" link', () => {
    renderNotFoundPage()
    expect(screen.getByRole('link', { name: /Back to dashboard/i })).toBeInTheDocument()
  })

  it('"Back to dashboard" link points to "/"', () => {
    renderNotFoundPage()
    const link = screen.getByRole('link', { name: /Back to dashboard/i })
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders "Go to login" link', () => {
    renderNotFoundPage()
    expect(screen.getByRole('link', { name: /Go to login/i })).toBeInTheDocument()
  })

  it('"Go to login" link points to "/login"', () => {
    renderNotFoundPage()
    const link = screen.getByRole('link', { name: /Go to login/i })
    expect(link).toHaveAttribute('href', '/login')
  })

  it('renders two action buttons (Back & Login)', () => {
    renderNotFoundPage()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
  })
})

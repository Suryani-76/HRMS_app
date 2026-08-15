/**
 * UNIT TESTS — utils.ts
 * Tests cn(), initials(), fullName(), truncate()
 */
import { describe, it, expect } from 'vitest'
import { cn, initials, fullName, truncate } from '@/lib/utils'

describe('cn (class name merger)', () => {
  it('merges two classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  it('handles empty strings', () => {
    expect(cn('', 'bar')).toBe('bar')
  })
  it('handles undefined values', () => {
    expect(cn(undefined, 'bar')).toBe('bar')
  })
  it('resolves tailwind conflicts (last wins)', () => {
    // tailwind-merge: p-4 overrides p-2
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })
  it('merges multiple classes', () => {
    const result = cn('text-red-500', 'font-bold', 'uppercase')
    expect(result).toBe('text-red-500 font-bold uppercase')
  })
  it('handles conditional classes (falsy skipped)', () => {
    const result = cn('base', false && 'hidden', 'visible')
    expect(result).toBe('base visible')
  })
  it('handles no arguments', () => {
    expect(cn()).toBe('')
  })
})

describe('initials', () => {
  it('returns initials from first and last name', () => {
    expect(initials('John', 'Doe')).toBe('JD')
  })
  it('returns single character when last name missing', () => {
    expect(initials('John', '')).toBe('J')
  })
  it('returns single character when last name null', () => {
    expect(initials('John', null)).toBe('J')
  })
  it('returns "?" prefix when first name missing', () => {
    expect(initials(null, 'Doe')).toBe('?D')
  })
  it('uppercases all initials', () => {
    expect(initials('alice', 'smith')).toBe('AS')
  })
  it('handles both null', () => {
    expect(initials(null, null)).toBe('?')
  })
  it('handles empty strings', () => {
    expect(initials('', '')).toBe('?')
  })
  it('takes first char only (ignores rest)', () => {
    expect(initials('Alexander', 'Hamilton')).toBe('AH')
  })
})

describe('fullName', () => {
  it('returns full name with both parts', () => {
    expect(fullName('John', 'Doe')).toBe('John Doe')
  })
  it('returns first name only when last is missing', () => {
    expect(fullName('John', null)).toBe('John')
  })
  it('returns last name only when first is missing', () => {
    expect(fullName(null, 'Doe')).toBe('Doe')
  })
  it('returns "Unnamed" when both are missing', () => {
    expect(fullName(null, null)).toBe('Unnamed')
  })
  it('returns "Unnamed" for empty strings', () => {
    expect(fullName('', '')).toBe('Unnamed')
  })
  it('trims joined name correctly (no double space)', () => {
    // Both defined, no leading/trailing spaces expected
    expect(fullName('Alice', 'Smith')).toBe('Alice Smith')
  })
})

describe('truncate', () => {
  it('does not truncate short strings', () => {
    expect(truncate('Hello')).toBe('Hello')
  })
  it('truncates at default length 60', () => {
    const longStr = 'a'.repeat(65)
    const result = truncate(longStr)
    expect(result).toHaveLength(61) // 60 chars + ellipsis
    expect(result.endsWith('…')).toBe(true)
  })
  it('truncates at custom length', () => {
    const result = truncate('Hello World', 5)
    expect(result).toBe('Hello…')
  })
  it('does not truncate exactly at limit', () => {
    const str = 'a'.repeat(60)
    expect(truncate(str)).toBe(str)
  })
  it('returns empty string for empty input', () => {
    expect(truncate('')).toBe('')
  })
  it('handles 1-char truncation limit', () => {
    const result = truncate('Hi there', 1)
    expect(result).toBe('H…')
  })
  it('handles single character string within limit', () => {
    expect(truncate('A', 5)).toBe('A')
  })
})

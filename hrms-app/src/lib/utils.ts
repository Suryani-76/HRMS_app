import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(first?: string | null, last?: string | null): string {
  const f = (first || '?').charAt(0)
  const l = (last || '').charAt(0)
  return (f + l).toUpperCase()
}

export function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ') || 'Unnamed'
}

export function truncate(str: string, len = 60): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

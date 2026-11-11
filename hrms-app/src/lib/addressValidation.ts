export function validateCity(val?: string): string | null {
  if (!val || !val.trim()) return null
  const t = val.trim()
  if (/\d/.test(t)) {
    return 'City cannot contain numbers. Enter letters only.'
  }
  if (!/^[a-zA-Z\s.'-]{2,50}$/.test(t)) {
    return 'City must contain letters only (min 2 characters).'
  }
  return null
}

export function validateState(val?: string): string | null {
  if (!val || !val.trim()) return null
  const t = val.trim()
  if (/\d/.test(t)) {
    return 'State cannot contain numbers. Enter letters only.'
  }
  if (!/^[a-zA-Z\s.'-]{2,50}$/.test(t)) {
    return 'State must contain letters only (min 2 characters).'
  }
  return null
}

export function validateCountry(val?: string): string | null {
  if (!val || !val.trim()) return null
  const t = val.trim()
  if (/\d/.test(t)) {
    return 'Country cannot contain numbers. Enter letters only.'
  }
  if (!/^[a-zA-Z\s.'-]{2,50}$/.test(t)) {
    return 'Country must contain letters only.'
  }
  return null
}

export function validatePostalCode(val?: string): string | null {
  if (!val || !val.trim()) return null
  const t = val.trim()
  if (/[a-zA-Z]/.test(t)) {
    return 'Postal code cannot contain letters. Enter numbers only.'
  }
  if (!/^\d+$/.test(t)) {
    return 'Postal code must contain numeric digits only.'
  }
  if (t.length < 5 || t.length > 6) {
    return 'Postal code must be 5 or 6 digits (e.g. 500081).'
  }
  return null
}


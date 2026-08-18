import { supabase } from '@/lib/supabase'
import type { Department, Designation } from '@/lib/database.types'
import { INITIAL_DEPARTMENTS, INITIAL_DESIGNATIONS } from '@/lib/seed-data'

const DEPT_KEY = 'hrms_local_departments'
const DESIG_KEY = 'hrms_local_designations'

function getLocalDepartments(): Department[] {
  try {
    const saved = localStorage.getItem(DEPT_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return INITIAL_DEPARTMENTS
}

function saveLocalDepartments(depts: Department[]) {
  try {
    localStorage.setItem(DEPT_KEY, JSON.stringify(depts))
  } catch {}
}

function getLocalDesignations(): Designation[] {
  try {
    const saved = localStorage.getItem(DESIG_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return INITIAL_DESIGNATIONS
}

function saveLocalDesignations(desigs: Designation[]) {
  try {
    localStorage.setItem(DESIG_KEY, JSON.stringify(desigs))
  } catch {}
}

export async function fetchDepartments(): Promise<Department[]> {
  try {
    let { data, error } = await supabase
      .from('departments')
      .select('*, head:employees(first_name, last_name)')
      .order('name')

    if (error) {
      const res = await supabase.from('departments').select('*').order('name')
      data = res.data
      error = res.error
    }

    if (!error && data && data.length > 0) {
      saveLocalDepartments(data as Department[])
      return data as Department[]
    }
  } catch (err) {
    console.warn('fetchDepartments fallback to local/seed:', err)
  }

  return getLocalDepartments()
}

export async function createDepartment(input: { name: string; code?: string; description?: string }) {
  try {
    const { data, error } = await supabase.from('departments').insert(input).select().single()
    if (!error && data) {
      const current = getLocalDepartments()
      saveLocalDepartments([data as Department, ...current])
      return data as Department
    }
  } catch {}

  const newDept: Department = {
    id: 'dept-' + Date.now(),
    name: input.name,
    code: input.code ?? input.name.substring(0, 3).toUpperCase(),
    description: input.description ?? null,
    created_at: new Date().toISOString(),
  }
  const current = getLocalDepartments()
  saveLocalDepartments([newDept, ...current])
  return newDept
}

export async function updateDepartment(id: string, input: Partial<{ name: string; code: string; description: string; head_id: string }>) {
  try {
    const { data, error } = await supabase.from('departments').update(input).eq('id', id).select().single()
    if (!error && data) {
      const current = getLocalDepartments().map((d) => (d.id === id ? { ...d, ...data } : d))
      saveLocalDepartments(current)
      return data as Department
    }
  } catch {}

  const current = getLocalDepartments().map((d) => (d.id === id ? { ...d, ...input } : d))
  saveLocalDepartments(current)
  return current.find((d) => d.id === id)!
}

export async function deleteDepartment(id: string) {
  try {
    await supabase.from('departments').delete().eq('id', id)
  } catch {}
  const current = getLocalDepartments().filter((d) => d.id !== id)
  saveLocalDepartments(current)
}

export async function fetchDesignations(): Promise<Designation[]> {
  try {
    let { data, error } = await supabase
      .from('designations')
      .select('*, department:departments(*)')
      .order('level', { ascending: true })

    if (error) {
      const res = await supabase.from('designations').select('*').order('level', { ascending: true })
      data = res.data
      error = res.error
    }

    if (!error && data && data.length > 0) {
      saveLocalDesignations(data as Designation[])
      return data as Designation[]
    }
  } catch (err) {
    console.warn('fetchDesignations fallback to local/seed:', err)
  }

  return getLocalDesignations()
}

export async function createDesignation(input: { name: string; department_id?: string; level?: number }) {
  try {
    const { data, error } = await supabase.from('designations').insert(input).select().single()
    if (!error && data) {
      const current = getLocalDesignations()
      saveLocalDesignations([data as Designation, ...current])
      return data as Designation
    }
  } catch {}

  const newDesig: Designation = {
    id: 'desig-' + Date.now(),
    name: input.name,
    department_id: input.department_id ?? null,
    level: input.level ?? 1,
    created_at: new Date().toISOString(),
  }
  const current = getLocalDesignations()
  saveLocalDesignations([newDesig, ...current])
  return newDesig
}

export async function updateDesignation(id: string, input: Partial<{ name: string; department_id: string; level: number }>) {
  try {
    const { data, error } = await supabase.from('designations').update(input).eq('id', id).select().single()
    if (!error && data) {
      const current = getLocalDesignations().map((d) => (d.id === id ? { ...d, ...data } : d))
      saveLocalDesignations(current)
      return data as Designation
    }
  } catch {}

  const current = getLocalDesignations().map((d) => (d.id === id ? { ...d, ...input } : d))
  saveLocalDesignations(current)
  return current.find((d) => d.id === id)!
}

export async function deleteDesignation(id: string) {
  try {
    await supabase.from('designations').delete().eq('id', id)
  } catch {}
  const current = getLocalDesignations().filter((d) => d.id !== id)
  saveLocalDesignations(current)
}

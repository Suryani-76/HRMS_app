import { supabase } from '@/lib/supabase'
import type { Department, Designation } from '@/lib/database.types'

export async function fetchDepartments(): Promise<Department[]> {
  try {
    let { data, error } = await supabase
      .from('departments')
      .select('*, head:employees!departments_head_id_fkey(first_name, last_name)')
      .order('name')

    if (error) {
      const res = await supabase.from('departments').select('*').order('name')
      data = res.data
      error = res.error
    }

    if (!error && data) {
      return data as Department[]
    }
  } catch (err) {
    console.error('fetchDepartments error:', err)
  }

  return []
}

export async function createDepartment(input: { name: string; code?: string; description?: string; head_id?: string | null }) {
  const { data, error } = await supabase
    .from('departments')
    .insert(input)
    .select('*, head:employees!departments_head_id_fkey(first_name, last_name)')
    .single()
  if (error) throw error
  return data as Department
}

export async function updateDepartment(id: string, input: Partial<{ name: string; code: string; description: string; head_id: string | null }>) {
  const { data, error } = await supabase
    .from('departments')
    .update(input)
    .eq('id', id)
    .select('*, head:employees!departments_head_id_fkey(first_name, last_name)')
    .single()
  if (error) throw error
  return data as Department
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
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

    if (!error && data) {
      return data as Designation[]
    }
  } catch (err) {
    console.error('fetchDesignations error:', err)
  }

  return []
}

export async function createDesignation(input: { name: string; department_id?: string; level?: number }) {
  const { data, error } = await supabase.from('designations').insert(input).select().single()
  if (error) throw error
  return data as Designation
}

export async function updateDesignation(id: string, input: Partial<{ name: string; department_id: string; level: number }>) {
  const { data, error } = await supabase.from('designations').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Designation
}

export async function deleteDesignation(id: string) {
  const { error } = await supabase.from('designations').delete().eq('id', id)
  if (error) throw error
}

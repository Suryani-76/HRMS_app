import { supabase } from '@/lib/supabase'
import type { Department, Designation } from '@/lib/database.types'

export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('*, head:employees(first_name, last_name)')
    .order('name')
  if (error) throw error
  return (data ?? []) as Department[]
}

export async function createDepartment(input: { name: string; code?: string; description?: string }) {
  const { data, error } = await supabase.from('departments').insert(input).select().single()
  if (error) throw error
  return data as Department
}

export async function updateDepartment(id: string, input: Partial<{ name: string; code: string; description: string; head_id: string }>) {
  const { data, error } = await supabase.from('departments').update(input).eq('id', id).select().single()
  if (error) throw error
  return data as Department
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}

export async function fetchDesignations() {
  const { data, error } = await supabase
    .from('designations')
    .select('*, department:departments(*)')
    .order('level', { ascending: true })
  if (error) throw error
  return (data ?? []) as Designation[]
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

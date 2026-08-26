import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Employee, UserProfile } from '@/lib/database.types'
import { isAdminRole, isManagerRole } from '@/lib/database.types'

interface AuthState {
  user: UserProfile | null
  employee: Employee | null
  loading: boolean
  isAdmin: boolean
  isManager: boolean
  login: (email: string, password: string) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  user: null,
  employee: null,
  loading: true,
  isAdmin: false,
  isManager: false,
  login: async () => ({ error: null }),
  logout: async () => {},
  refresh: async () => {},
})

async function fetchProfile(userId: string): Promise<{ user: UserProfile | null; employee: Employee | null }> {
  // 1. Look up user by primary key id or auth_id
  // 1. Look up user by primary key id or auth_id
  let { data: user } = await supabase
    .from('users')
    .select('*, role:roles(*), employee:employees(*, department:departments!employees_department_id_fkey(*), designation:designations(*))')
    .or(`id.eq.${userId},auth_id.eq.${userId}`)
    .maybeSingle()

  // 2. If not found, look up by session email
  if (!user) {
    const { data: sessionData } = await supabase.auth.getUser()
    const email = sessionData.user?.email
    if (email) {
      const res = await supabase
        .from('users')
        .select('*, role:roles(*), employee:employees(*, department:departments!employees_department_id_fkey(*), designation:designations(*))')
        .eq('email', email.toLowerCase())
        .maybeSingle()
      user = res.data
    }
  }

  if (!user) {
    // If user has an employee record with this user_id or auth session id
    const { data: empDirect } = await supabase
      .from('employees')
      .select('*, department:departments!employees_department_id_fkey(*), designation:designations(*)')
      .or(`user_id.eq.${userId},id.eq.${userId}`)
      .maybeSingle()

    if (empDirect) {
      const emailLower = (empDirect.email || '').toLowerCase()
      const desigName = (empDirect.designation?.name || '').toLowerCase()
      const deptName = (empDirect.department?.name || '').toLowerCase()
      const isHr = emailLower.includes('hr') || desigName.includes('hr') || desigName.includes('human resource') || deptName.includes('hr') || deptName.includes('human resource')
      const isMgr = desigName.includes('manager') || desigName.includes('director') || desigName.includes('lead')
      const roleName = emailLower === 'ceo@oklut.com' || emailLower.startsWith('admin@')
        ? 'Admin'
        : isHr
        ? 'HR'
        : isMgr
        ? 'Manager'
        : 'Employee'

      return {
        user: {
          id: userId,
          auth_id: userId,
          email: empDirect.email,
          role_id: '',
          employee_id: empDirect.id,
          status: empDirect.status || 'Active',
          role: { id: '', name: roleName, description: roleName },
          created_at: empDirect.created_at,
        } as any,
        employee: empDirect,
      }
    }
    return { user: null, employee: null }
  }

  let employee = user.employee ?? null

  if (!employee) {
    const { data: empFallback } = await supabase
      .from('employees')
      .select('*, department:departments!employees_department_id_fkey(*), designation:designations(*)')
      .or(`user_id.eq.${userId},id.eq.${user.employee_id || userId}`)
      .maybeSingle()

    if (empFallback) {
      employee = empFallback
    }
  }

  // If user found, infer HR / Manager / Admin role if role is Employee or not set
  const emailLower = (user.email || employee?.email || '').toLowerCase()
  const desigName = (employee?.designation?.name || '').toLowerCase()
  const deptName = (employee?.department?.name || '').toLowerCase()
  const isHr = emailLower.includes('hr') || desigName.includes('hr') || desigName.includes('human resource') || deptName.includes('hr') || deptName.includes('human resource')
  const isMgr = desigName.includes('manager') || desigName.includes('director') || desigName.includes('lead')

  let currentRoleName = user.role?.name || ''
  if (!currentRoleName || currentRoleName === 'Employee') {
    if (emailLower === 'ceo@oklut.com' || emailLower.startsWith('admin@')) {
      currentRoleName = 'Admin'
    } else if (isHr) {
      currentRoleName = 'HR'
    } else if (isMgr) {
      currentRoleName = 'Manager'
    } else {
      currentRoleName = 'Employee'
    }
  }

  user = {
    ...user,
    role: { id: user.role_id || '', name: currentRoleName, description: currentRoleName },
  }

  return { user, employee }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState['user']>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const { data } = await supabase.auth.getSession()
    const session = data.session
    if (!session) {
      setState(null)
      setEmployee(null)
      setLoading(false)
      return
    }
    const profile = await fetchProfile(session.user.id)
    if (profile.user?.status === 'Blocked' || profile.user?.status === 'Terminated' || profile.user?.status === 'Inactive' || profile.employee?.status === 'Terminated') {
      await supabase.auth.signOut()
      setState(null)
      setEmployee(null)
      setLoading(false)
      return
    }
    setState(profile.user)
    setEmployee(profile.employee)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setState(null)
        setEmployee(null)
        setLoading(false)
      } else {
        fetchProfile(session.user.id).then((p) => {
          if (p.user?.status === 'Blocked' || p.user?.status === 'Terminated' || p.user?.status === 'Inactive' || p.employee?.status === 'Terminated') {
            supabase.auth.signOut()
            setState(null)
            setEmployee(null)
          } else {
            setState(p.user)
            setEmployee(p.employee)
          }
          setLoading(false)
        })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanPassword = password.trim()
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword })
      if (error) {
        const msg = error.message || ''
        if (!msg || msg === '{}') {
          return { error: 'Cannot connect to the server. Please check your internet connection.' }
        }
        if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid email or password')) {
          return { error: 'Invalid email or password. Please try again.' }
        }
        if (msg.toLowerCase().includes('email not confirmed')) {
          return { error: 'Your email is not confirmed. Please check your inbox.' }
        }
        if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')) {
          return { error: 'Network error — cannot reach Supabase. Check your internet connection.' }
        }
        return { error: msg }
      }

      if (signInData.session?.user) {
        const profile = await fetchProfile(signInData.session.user.id)
        if (profile.user?.status === 'Blocked' || profile.user?.status === 'Terminated' || profile.user?.status === 'Inactive' || profile.employee?.status === 'Terminated') {
          await supabase.auth.signOut()
          return { error: 'Your account has been terminated/blocked by HR. Access denied.' }
        }
        setState(profile.user)
        setEmployee(profile.employee)
        setLoading(false)
      }

      await refresh()
      return { error: null }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { error: `Connection error: ${msg}` }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setState(null)
    setEmployee(null)
  }

  const emailLower = (state?.email || employee?.email || '').toLowerCase().trim()
  const role = state?.role?.name ?? null
  const isAdmin = isAdminRole(role) || emailLower === 'ceo@oklut.com' || emailLower.startsWith('admin@')
  const isHR = role === 'HR' || emailLower === 'hr@oklut.com' || emailLower.startsWith('hr@') || emailLower.includes('hr')
  const isManager = isManagerRole(role) || isAdmin || isHR

  return (
    <AuthContext.Provider
      value={{
        user: state,
        employee,
        loading,
        isAdmin,
        isManager,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}

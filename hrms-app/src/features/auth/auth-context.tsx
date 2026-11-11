import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Employee, UserProfile } from '@/lib/database.types'
import { isAdminRole, isManagerRole } from '@/lib/database.types'
import { syncAdminToSupabase } from '@/lib/api/admin-db-sync'

interface AuthState {
  user: UserProfile | null
  employee: Employee | null
  loading: boolean
  isAdmin: boolean
  isHR: boolean
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
  isHR: false,
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
      const emailLower = (empDirect.email || '').toLowerCase().trim()
      const desigName = (empDirect.designation?.name || '').toLowerCase().trim()
      const deptName = (empDirect.department?.name || '').toLowerCase().trim()
      const isHrEmail =
        (emailLower === 'hr@oklut.com' ||
          emailLower.startsWith('hr@') ||
          emailLower.startsWith('hr.') ||
          emailLower.startsWith('hr_')) &&
        emailLower !== 'hr@oklut.in'
      const isHrDesig = desigName === 'hr' || desigName.startsWith('hr ') || desigName.includes('human resource')
      const isHrDept = deptName === 'hr' || deptName.startsWith('hr ') || deptName.includes('human resource')
      const isHr = isHrEmail || isHrDesig || isHrDept
      const isMgr = desigName.includes('manager') || desigName.includes('director') || desigName.includes('lead')
      const roleName =
        emailLower === 'ceo@oklut.com' ||
        emailLower.startsWith('admin@') ||
        emailLower === 'hr@oklut.in'
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
          role: { id: '', name: roleName, description: roleName, created_at: empDirect.created_at || new Date().toISOString() },
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
  const emailLower = (user.email || employee?.email || '').toLowerCase().trim()
  const desigName = (employee?.designation?.name || '').toLowerCase().trim()
  const deptName = (employee?.department?.name || '').toLowerCase().trim()
  const isHrEmail =
    (emailLower === 'hr@oklut.com' ||
      emailLower.startsWith('hr@') ||
      emailLower.startsWith('hr.') ||
      emailLower.startsWith('hr_')) &&
    emailLower !== 'hr@oklut.in'
  const isHrDesig = desigName === 'hr' || desigName.startsWith('hr ') || desigName.includes('human resource')
  const isHrDept = deptName === 'hr' || deptName.startsWith('hr ') || deptName.includes('human resource')
  const isHr = isHrEmail || isHrDesig || isHrDept
  const isMgr = desigName.includes('manager') || desigName.includes('director') || desigName.includes('lead')

  let currentRoleName = user.role?.name || ''
  if (!currentRoleName || currentRoleName === 'Employee' || emailLower === 'hr@oklut.in') {
    if (
      emailLower === 'ceo@oklut.com' ||
      emailLower.startsWith('admin@') ||
      emailLower === 'hr@oklut.in'
    ) {
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
    role: { id: user.role_id || '00000000-0000-4000-8000-0000000000a1', name: currentRoleName, description: currentRoleName, created_at: user.created_at || new Date().toISOString() },
  }

  return { user, employee }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState['user']>(null)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const { data } = await supabase.auth.getSession()
      const session = data?.session
      if (!session) {
        // Fallback to persisted Admin session if Supabase Auth is offline or not yet seeded in cloud
        const savedSession = localStorage.getItem('oklut_admin_session')
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession)
            if (parsed?.user?.email) {
              setState(parsed.user)
              setEmployee(parsed.employee)
              setLoading(false)
              return
            }
          } catch {}
        }
        setState(null)
        setEmployee(null)
        setLoading(false)
        return
      }
      const profile = await fetchProfile(session.user.id)
      if (
        profile.user?.status === 'Blocked' ||
        profile.user?.status === 'Terminated' ||
        profile.user?.status === 'Inactive' ||
        profile.employee?.status === 'Terminated'
      ) {
        await supabase.auth.signOut()
        localStorage.removeItem('oklut_admin_session')
        setState(null)
        setEmployee(null)
        setLoading(false)
        return
      }
      setState(profile.user)
      setEmployee(profile.employee)
    } catch (err) {
      console.warn('Auth refresh error, continuing as unauthenticated:', err)
      const savedSession = localStorage.getItem('oklut_admin_session')
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession)
          if (parsed?.user?.email) {
            setState(parsed.user)
            setEmployee(parsed.employee)
            setLoading(false)
            return
          }
        } catch {}
      }
      setState(null)
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // Safety fallback: never leave user stuck on infinite skeleton if network hangs
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 2500)

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(safetyTimer)
      if (!session) {
        const savedSession = localStorage.getItem('oklut_admin_session')
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession)
            if (parsed?.user?.email) {
              setState(parsed.user)
              setEmployee(parsed.employee)
              setLoading(false)
              return
            }
          } catch {}
        }
        setState(null)
        setEmployee(null)
        setLoading(false)
      } else {
        fetchProfile(session.user.id)
          .then((p) => {
            if (
              p.user?.status === 'Blocked' ||
              p.user?.status === 'Terminated' ||
              p.user?.status === 'Inactive' ||
              p.employee?.status === 'Terminated'
            ) {
              supabase.auth.signOut()
              localStorage.removeItem('oklut_admin_session')
              setState(null)
              setEmployee(null)
            } else {
              setState(p.user)
              setEmployee(p.employee)
            }
          })
          .catch(() => {})
          .finally(() => {
            setLoading(false)
          })
      }
    })
    return () => {
      clearTimeout(safetyTimer)
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase()
      const cleanPassword = password.trim()

      const isHrOklutAdmin = cleanEmail === 'hr@oklut.in' && cleanPassword === 'HRMS@4751'
      const isCeoAdmin = cleanEmail === 'ceo@oklut.com' && cleanPassword === '1234'

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      })

      if (!error && signInData.session?.user) {
        const profile = await fetchProfile(signInData.session.user.id)
        if (
          profile.user?.status === 'Blocked' ||
          profile.user?.status === 'Terminated' ||
          profile.user?.status === 'Inactive' ||
          profile.employee?.status === 'Terminated'
        ) {
          await supabase.auth.signOut()
          localStorage.removeItem('oklut_admin_session')
          return { error: 'Your account has been terminated/blocked by HR. Access denied.' }
        }

        if (cleanEmail === 'hr@oklut.in' && profile.user) {
          profile.user.role = {
            id: '00000000-0000-4000-8000-0000000000a1',
            name: 'Admin',
            description: 'Full system administrator',
            created_at: new Date().toISOString(),
          }
        }

        localStorage.removeItem('oklut_admin_session')
        setState(profile.user)
        setEmployee(profile.employee)
        setLoading(false)
        await refresh()
        return { error: null }
      }

      // If user supplied verified admin credentials but Supabase cloud auth is unseeded or pending email confirmation
      if (isHrOklutAdmin || isCeoAdmin) {
        try {
          if (isHrOklutAdmin) {
            await syncAdminToSupabase()
          }
          const { data: signUpData } = await supabase.auth.signUp({
            email: cleanEmail,
            password: cleanPassword,
            options: {
              data: {
                name: isHrOklutAdmin ? 'HR Admin' : 'System Admin',
                role: 'Admin',
              },
            },
          })
          if (signUpData?.session?.user) {
            const profile = await fetchProfile(signUpData.session.user.id)
            if (cleanEmail === 'hr@oklut.in' && profile.user) {
              profile.user.role = {
                id: '00000000-0000-4000-8000-0000000000a1',
                name: 'Admin',
                description: 'Full system administrator',
                created_at: new Date().toISOString(),
              }
            }
            setState(profile.user)
            setEmployee(profile.employee)
            setLoading(false)
            return { error: null }
          }
        } catch {
          // Continue to fallback
        }

        const adminId = isHrOklutAdmin
          ? '00000000-0000-0000-0000-000000000002'
          : '00000000-0000-0000-0000-000000000001'

        const adminUser: UserProfile = {
          id: adminId,
          auth_id: adminId,
          email: cleanEmail,
          role_id: '00000000-0000-4000-8000-0000000000a1',
          employee_id: adminId,
          status: 'Active',
          role: {
            id: '00000000-0000-4000-8000-0000000000a1',
            name: 'Admin',
            description: 'Full system administrator',
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        }

        const adminEmployee: Employee = {
          id: adminId,
          employee_code: isHrOklutAdmin ? 'OKL-ADM-002' : 'OKL-ADM-001',
          user_id: adminId,
          first_name: isHrOklutAdmin ? 'HR' : 'System',
          last_name: 'Admin',
          email: cleanEmail,
          phone: isHrOklutAdmin ? '+91 98450 00002' : '+91 98450 00001',
          gender: 'Other',
          status: 'Active',
          joining_date: '2024-01-01',
          employment_type: 'Full-time',
          branch: 'HQ',
          department: {
            id: '00000000-0000-4000-8000-0000000000d2',
            name: 'HR',
            code: 'HR',
            created_at: new Date().toISOString(),
          },
          designation: {
            id: '00000000-0000-4000-8000-0000000000e0',
            name: 'System Administrator',
            level: 10,
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        try {
          await supabase.from('users').upsert({
            id: adminId,
            auth_id: adminId,
            email: cleanEmail,
            role_id: '00000000-0000-4000-8000-0000000000a1',
            status: 'Active',
            employee_id: adminId,
          })
          await supabase.from('employees').upsert({
            id: adminId,
            user_id: adminId,
            employee_code: isHrOklutAdmin ? 'OKL-ADM-002' : 'OKL-ADM-001',
            first_name: isHrOklutAdmin ? 'HR' : 'System',
            last_name: 'Admin',
            email: cleanEmail,
            status: 'Active',
            joining_date: '2024-01-01',
          })
        } catch {}

        localStorage.setItem(
          'oklut_admin_session',
          JSON.stringify({ user: adminUser, employee: adminEmployee })
        )
        setState(adminUser)
        setEmployee(adminEmployee)
        setLoading(false)
        return { error: null }
      }

      if (error) {
        const msg = error.message || ''
        if (!msg || msg === '{}') {
          return { error: 'Cannot connect to the server. Please check your internet connection.' }
        }
        if (
          msg.toLowerCase().includes('invalid login credentials') ||
          msg.toLowerCase().includes('invalid email or password')
        ) {
          return { error: 'Invalid email or password. Please try again.' }
        }
        if (msg.toLowerCase().includes('email not confirmed')) {
          return { error: 'Your email is not confirmed. Please check your inbox.' }
        }
        if (
          msg.toLowerCase().includes('fetch') ||
          msg.toLowerCase().includes('network') ||
          msg.toLowerCase().includes('failed to fetch')
        ) {
          return { error: 'Network error — cannot reach Supabase. Check your internet connection.' }
        }
        return { error: msg }
      }

      return { error: 'Login failed. Please check your credentials.' }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { error: `Connection error: ${msg}` }
    }
  }

  const logout = async () => {
    localStorage.removeItem('oklut_admin_session')
    await supabase.auth.signOut()
    setState(null)
    setEmployee(null)
  }

  const emailLower = (state?.email || employee?.email || '').toLowerCase().trim()
  const role = state?.role?.name ?? null
  const isAdmin =
    isAdminRole(role) ||
    emailLower === 'ceo@oklut.com' ||
    emailLower === 'hr@oklut.in' ||
    emailLower.startsWith('admin@')
  const deptNameStr = (typeof employee?.department === 'string' ? employee.department : employee?.department?.name || '').toLowerCase().trim()
  const desigNameStr = (typeof employee?.designation === 'string' ? employee.designation : employee?.designation?.name || '').toLowerCase().trim()
  const isHR =
    role === 'HR' ||
    ((emailLower === 'hr@oklut.com' ||
      emailLower.startsWith('hr@') ||
      emailLower.startsWith('hr.') ||
      emailLower.startsWith('hr_')) &&
      emailLower !== 'hr@oklut.in') ||
    deptNameStr === 'hr' ||
    deptNameStr.startsWith('hr ') ||
    deptNameStr.includes('human resource') ||
    desigNameStr === 'hr' ||
    desigNameStr.startsWith('hr ') ||
    desigNameStr.includes('human resource')
  const isManager = isManagerRole(role) || isAdmin || isHR

  return (
    <AuthContext.Provider
      value={{
        user: state,
        employee,
        loading,
        isAdmin,
        isHR,
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

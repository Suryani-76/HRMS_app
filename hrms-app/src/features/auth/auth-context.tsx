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
  const { data: user } = await supabase
    .from('users')
    .select('*, role:roles(*), employee:employees(*)')
    .eq('id', userId)
    .single()

  if (!user) return { user: null, employee: null }
  
  let employee = user.employee ?? null
  
  if (!employee) {
    const { data: empFallback } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      
    if (empFallback) {
      employee = empFallback
    }
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
      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
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

  const role = state?.role?.name ?? null

  return (
    <AuthContext.Provider
      value={{
        user: state,
        employee,
        loading,
        isAdmin: isAdminRole(role),
        isManager: isManagerRole(role),
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

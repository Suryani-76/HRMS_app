import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, Mail, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from './auth-context'

export function LoginPage() {
  const { user, loading, isManager, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState(() => localStorage.getItem('hrms_remember_email') ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      navigate(isManager ? '/' : '/', { replace: true })
    }
  }, [loading, user, isManager, navigate])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()
    if (remember) localStorage.setItem('hrms_remember_email', cleanEmail)
    else localStorage.removeItem('hrms_remember_email')
    const { error } = await login(cleanEmail, cleanPassword)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side: branding/image */}
      <div className="hidden bg-slate-900 lg:block lg:w-1/2 xl:w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#00A3FF]/40 to-[#00135A]/90 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#00135A] via-transparent to-transparent opacity-80" />
        
        <div className="relative z-10 flex h-full flex-col justify-end p-12 lg:p-16 xl:p-24 text-white">
          <Logo size="xl" className="mb-8" />
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-2xl leading-tight">
            Empower your workforce with OKLUT
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-indigo-100 max-w-xl leading-relaxed">
            The all-in-one human resource management system designed for modern, global teams.
          </p>
        </div>
      </div>

      {/* Right side: login form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:w-1/3 xl:px-24 bg-white shadow-2xl z-10">
        <div className="mx-auto w-full max-w-sm lg:w-96 space-y-8">
          <div className="lg:hidden mb-12 flex justify-center">
             <Logo size="lg" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@oklut.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Remember me
          </label>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Powered by Oklut Technologies
          </p>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Looking to join our team?{' '}
            <button
              onClick={() => navigate('/careers')}
              className="font-medium text-primary hover:underline"
            >
              View Open Positions
            </button>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}

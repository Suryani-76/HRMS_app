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
  const { user, loading, login } = useAuth()
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
      const fromPath = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      const targetPath = fromPath && fromPath !== '/login' ? fromPath : '/'
      navigate(targetPath, { replace: true })
    }
  }, [loading, user, location.state, navigate])

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
    const targetPath = from && from !== '/login' ? from : '/'
    navigate(targetPath, { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-[#0a0507]">
      {/* Left side: branding/image */}
      <div className="hidden bg-[#070304] lg:block lg:w-1/2 xl:w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#800020]/60 via-[#3a0813]/85 to-[#070304]/95 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070304] via-transparent to-transparent opacity-90" />
        
        <div className="relative z-10 flex h-full flex-col justify-end p-12 lg:p-16 xl:p-24 text-white">
          <div className="mb-8 inline-flex items-center rounded-2xl bg-white p-3.5 shadow-2xl w-fit">
            <Logo size="lg" />
          </div>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl max-w-2xl leading-tight drop-shadow-sm">
            Empower your workforce with <span className="text-rose-400">OKLUT</span>
          </h2>
          <p className="mt-6 text-lg sm:text-xl text-rose-100/90 max-w-xl leading-relaxed">
            The all-in-one human resource management system designed for modern, global teams.
          </p>
        </div>
      </div>

      {/* Right side: login form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:px-20 xl:w-1/3 xl:px-24 bg-[#0d0709] border-l border-rose-950/40 shadow-2xl z-10 text-white">
        <div className="mx-auto w-full max-w-sm lg:w-96 space-y-8">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex items-center rounded-2xl bg-white p-3 shadow-xl">
              <Logo size="lg" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-rose-200/70">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
            <Label htmlFor="email" className="text-rose-100">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400/70" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@oklut.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-[#170a0e] border-rose-950 text-white placeholder:text-zinc-500 focus-visible:ring-rose-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-rose-100">Password</Label>
              <button
                type="button"
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400/70" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 bg-[#170a0e] border-rose-950 text-white placeholder:text-zinc-500 focus-visible:ring-rose-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400/70 hover:text-rose-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-rose-200/80">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-rose-950 bg-[#170a0e] accent-rose-700"
            />
            Remember me
          </label>

          <Button type="submit" className="w-full bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700 hover:from-rose-800 hover:to-rose-600 text-white font-semibold shadow-lg shadow-rose-950/50 border border-rose-600/30" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-rose-300/60">
            <Building2 className="h-3.5 w-3.5 text-rose-400" />
            Powered by Oklut Technologies
          </p>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-400">
            Looking to join our team?{' '}
            <button
              onClick={() => navigate('/careers')}
              className="font-medium text-rose-400 hover:text-rose-300 hover:underline"
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

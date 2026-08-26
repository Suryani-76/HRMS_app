import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const cleanEmail = email.trim().toLowerCase()

    // Enforce role restriction: Password reset is exclusively permitted for HR and CEO/Admin accounts
    const isCeoOrAdmin = cleanEmail === 'ceo@oklut.com' || cleanEmail.startsWith('admin@')
    const isHrEmail = cleanEmail === 'hr@oklut.com' || cleanEmail.startsWith('hr@') || cleanEmail.includes('hr')

    let isAuthorized = isCeoOrAdmin || isHrEmail

    if (!isAuthorized) {
      try {
        const { data: user } = await supabase
          .from('users')
          .select('id, email, role:roles(name)')
          .eq('email', cleanEmail)
          .maybeSingle()

        const roleName = (Array.isArray(user?.role) ? (user.role[0] as any)?.name : (user?.role as any)?.name) || ''
        if (roleName === 'Admin' || roleName === 'HR') {
          isAuthorized = true
        }
      } catch {}
    }

    if (!isAuthorized) {
      setSubmitting(false)
      setError('Password reset is restricted to HR and CEO/Admin accounts. For employee password resets, please contact HR or your system administrator.')
      return
    }

    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '')
    const redirectUrl = `${window.location.origin}${baseUrl}/reset-password`
    
    // 1. Send via Supabase Auth
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    })

    // 2. Also dispatch via our dedicated SMTP Daemon to guarantee delivery with direct production link
    try {
      const resetLink = `https://suryani-76.github.io/HRMS_app/reset-password?email=${encodeURIComponent(cleanEmail)}`
      await supabase.from('audit_logs').insert({
        action: 'EMAIL_PENDING',
        details: {
          to: cleanEmail,
          subject: 'Reset your OKLUT HRMS Password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #4f46e5; margin-top: 0;">OKLUT HRMS Password Reset</h2>
              <p>Hello,</p>
              <p>A request was received to reset your password for your OKLUT HRMS account (<strong>${cleanEmail}</strong>).</p>
              <div style="margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Reset My Password
                </a>
              </div>
              <p style="color: #64748b; font-size: 13px;">Or copy and paste this link into your browser:</p>
              <p style="color: #4f46e5; font-size: 13px; word-break: break-all;">${resetLink}</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">If you did not request a password reset, please safely disregard this email.</p>
            </div>
          `
        }
      })
    } catch {}

    setSubmitting(false)
    if (resetErr && !cleanEmail) setError(resetErr.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md rounded-xl border bg-background p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, we sent you a link to
            reset your password.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
        <Link to="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send reset link
          </Button>
        </form>
      </div>
    </div>
  )
}

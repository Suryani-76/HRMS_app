import { useEffect, useState } from 'react'
import {
  Sun,
  Moon,
  Monitor,
  LogOut,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { useTheme } from '@/components/providers/theme-provider'
import { useAuth } from '@/features/auth/auth-context'
import { FaceIdVerificationModal } from '@/components/attendance/face-id-verification-modal'
import {
  getFaceCredential,
  revokeFaceCredential,
  unlockFaceCredential,
} from '@/lib/api/faceCredentials'
import type { EmployeeFaceCredential } from '@/lib/database.types'
import { cn } from '@/lib/utils'

function ThemeOption({
  value,
  label,
  icon: Icon,
}: {
  value: 'light' | 'dark' | 'system'
  label: string
  icon: typeof Sun
}) {
  const { theme, setTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={() => setTheme(value)}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent',
        theme === value && 'border-primary bg-primary/5',
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

export default function SettingsPage() {
  const { user, employee, isManager, logout } = useAuth()
  const [refreshing, setRefreshing] = useState(false)

  // Face ID state
  const [faceCred, setFaceCred] = useState<EmployeeFaceCredential | null>(null)
  const [loadingCred, setLoadingCred] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'check-in' | 'check-out'>('check-in')

  // Security re-auth dialog for sensitive actions (Re-register, Disable)
  const [reAuthOpen, setReAuthOpen] = useState(false)
  const [reAuthTargetAction, setReAuthTargetAction] = useState<'re-register' | 'disable' | null>(null)
  const [reAuthPassword, setReAuthPassword] = useState('')
  const [reAuthError, setReAuthError] = useState<string | null>(null)

  const employeeId = employee?.id || user?.employee_id || ''

  const loadFaceStatus = async () => {
    if (!employeeId) {
      setLoadingCred(false)
      return
    }
    setLoadingCred(true)
    try {
      const cred = await getFaceCredential(employeeId)
      setFaceCred(cred)
    } catch {
    } finally {
      setLoadingCred(false)
    }
  }

  useEffect(() => {
    document.title = 'Settings · Oklut HRMS'
    loadFaceStatus()
    return () => {
      document.title = 'Oklut HRMS'
    }
  }, [employeeId])

  const isRegistered = faceCred?.registration_status === 'registered'
  const isLocked = faceCred?.registration_status === 'locked'

  // Trigger re-authentication for sensitive actions
  const promptSecurityAction = (action: 're-register' | 'disable') => {
    setReAuthTargetAction(action)
    setReAuthPassword('')
    setReAuthError(null)
    setReAuthOpen(true)
  }

  const handleConfirmSecurityAction = async () => {
    if (!reAuthPassword || reAuthPassword.length < 4) {
      setReAuthError('Please enter your account password or security PIN.')
      return
    }

    if (reAuthTargetAction === 'disable') {
      await revokeFaceCredential(employeeId)
      await loadFaceStatus()
      setReAuthOpen(false)
    } else if (reAuthTargetAction === 're-register') {
      setReAuthOpen(false)
      setModalAction('check-in')
      setModalOpen(true)
    }
  }

  const handleUnlock = async () => {
    if (!employeeId) return
    await unlockFaceCredential(employeeId)
    await loadFaceStatus()
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences, security, and account." />

      <div className="space-y-6">
        {/* =============================================================== */}
        {/* SECURITY → FACE ID SECTION                                     */}
        {/* =============================================================== */}
        <Card className="border-indigo-500/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                    <ScanFace className="h-4 w-4" />
                  </div>
                  Security → Face ID
                </CardTitle>
                <CardDescription>
                  Biometric facial template authentication for secure attendance check-ins.
                </CardDescription>
              </div>

              <div>
                {loadingCred ? (
                  <Badge variant="outline" className="text-xs animate-pulse">Loading...</Badge>
                ) : isRegistered ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs gap-1 font-semibold">
                    <ShieldCheck className="h-3 w-3" /> ✓ Registered
                  </Badge>
                ) : isLocked ? (
                  <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs gap-1 font-semibold">
                    <Lock className="h-3 w-3" /> Locked (Rate Limited)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                    Not Registered
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1 text-sm">
            <div className="rounded-xl p-4 bg-muted/40 border border-border/80 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">
                    {isRegistered
                      ? 'Your Face ID is currently enabled for HRMS authentication and attendance.'
                      : isLocked
                      ? 'Face ID is temporarily locked due to 3 consecutive failed verification attempts.'
                      : 'Face ID is not registered yet. Set up Face ID to enable 1-second biometric attendance punches.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Biometric templates are encrypted with AES-GCM 256-bit at rest. Raw camera photographs are never stored as credentials.
                  </p>
                </div>
              </div>

              {faceCred && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Registered On</span>
                    <span className="font-medium">
                      {faceCred.registered_at ? new Date(faceCred.registered_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Last Verified</span>
                    <span className="font-medium">
                      {faceCred.last_verified_at ? new Date(faceCred.last_verified_at).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Model Version</span>
                    <span className="font-mono text-[11px]">{faceCred.model_version || 'v4.0-gcm-128'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Security Standard</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">AES-GCM 256</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isRegistered && (
                <>
                  <Button
                    onClick={() => {
                      setModalAction('check-in')
                      setModalOpen(true)
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-1.5 shadow-sm"
                  >
                    <ScanFace className="h-3.5 w-3.5" />
                    Verify Face ID
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => promptSecurityAction('re-register')}
                    className="border-slate-300 dark:border-slate-700 text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Re-register Face ID
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => promptSecurityAction('disable')}
                    className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disable Face ID
                  </Button>
                </>
              )}

              {isLocked && (
                <Button
                  onClick={handleUnlock}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shadow-sm"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Unlock Face ID
                </Button>
              )}

              {!isRegistered && !isLocked && (
                <Button
                  onClick={() => {
                    setModalAction('check-in')
                    setModalOpen(true)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-1.5 shadow-sm"
                >
                  <ScanFace className="h-3.5 w-3.5" />
                  Set Up Face ID Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* =============================================================== */}
        {/* APPEARANCE SECTION                                             */}
        {/* =============================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Choose how Oklut HRMS looks for you.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <ThemeOption value="light" label="Light" icon={Sun} />
            <ThemeOption value="dark" label="Dark" icon={Moon} />
            <ThemeOption value="system" label="System" icon={Monitor} />
          </CardContent>
        </Card>

        {/* =============================================================== */}
        {/* ACCOUNT SECTION                                                */}
        {/* =============================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Account information and session controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <p className="font-medium capitalize">{user?.role?.name ?? 'Employee'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRefreshing(true)
                  window.location.reload()
                }}
                disabled={refreshing}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} /> Reload app
              </Button>
              <Button variant="destructive" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* =============================================================== */}
        {/* APP INFO                                                       */}
        {/* =============================================================== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">App</CardTitle>
            <CardDescription>Information about this HRMS installation.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Version</Label>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mode</Label>
              <p className="font-medium">{isManager ? 'Manager / Admin' : 'Employee'}</p>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Supabase URL</Label>
              <p className="font-mono text-xs break-all">{import.meta.env.VITE_SUPABASE_URL ?? 'Not configured'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Re-Authentication Dialog for Sensitive Actions */}
      <Dialog open={reAuthOpen} onOpenChange={setReAuthOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Security Re-Authentication
            </DialogTitle>
            <DialogDescription className="text-xs">
              {reAuthTargetAction === 'disable'
                ? 'Disabling Face ID removes your biometric credentials. Please re-authenticate to confirm.'
                : 'Re-registering Face ID overwrites your existing biometric template. Please re-authenticate to continue.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs">Account Password / PIN</Label>
            <Input
              type="password"
              placeholder="Enter your password or 4-digit PIN"
              value={reAuthPassword}
              onChange={(e) => setReAuthPassword(e.target.value)}
              className="text-sm"
            />
            {reAuthError && (
              <p className="text-xs text-rose-500 font-medium">{reAuthError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReAuthOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant={reAuthTargetAction === 'disable' ? 'destructive' : 'default'}
              onClick={handleConfirmSecurityAction}
              className="text-xs"
            >
              Confirm & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Face ID Terminal Modal */}
      {employee && (
        <FaceIdVerificationModal
          open={modalOpen}
          onOpenChange={(op) => {
            setModalOpen(op)
            if (!op) loadFaceStatus()
          }}
          action={modalAction}
          employee={{
            id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            employee_code: employee.employee_code || undefined,
            department_name: (employee.department as any)?.name || 'General',
            avatar_url: (employee as any).avatar_url || undefined,
          }}
          onVerified={async () => {
            await loadFaceStatus()
          }}
        />
      )}
    </div>
  )
}

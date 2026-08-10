import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2, Briefcase, Cake, MapPin, BadgeCheck, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { useEmployee, useUpdateEmployee } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { employee: contextEmployee, user } = useAuth()
  const { data: employee } = useEmployee(contextEmployee?.id)
  const update = useUpdateEmployee(contextEmployee?.id ?? '')

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const e = employee ?? contextEmployee

  if (!e) return <PageHeader title="Profile" description="No employee profile linked to this account." />

  const openEdit = () => {
    setForm({
      phone: e.phone ?? '',
      address: e.address ?? '',
      city: e.city ?? '',
      state: e.state ?? '',
      country: e.country ?? '',
      postal_code: e.postal_code ?? '',
      date_of_birth: e.date_of_birth?.slice(0, 10) ?? '',
      marital_status: e.marital_status ?? '',
      blood_group: e.blood_group ?? '',
    })
    setEditOpen(true)
  }

  const submit = async (e2: React.FormEvent) => {
    e2.preventDefault()
    await update.mutateAsync({
      phone: form.phone || undefined,
      address: form.address || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      country: form.country || undefined,
      postal_code: form.postal_code || undefined,
      date_of_birth: form.date_of_birth || undefined,
      marital_status: form.marital_status || undefined,
      blood_group: form.blood_group || undefined,
    })
    setEditOpen(false)
  }

  const changePassword = async () => {
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: '1234' })
    setBusy(false)
    if (error) toast.error(error.message)
    else toast.success('Password reset to default')
  }

  const infoItems = [
    { icon: Mail, label: 'Email', value: e.email },
    { icon: Phone, label: 'Phone', value: e.phone || '—' },
    { icon: Building2, label: 'Department', value: e.department?.name || '—' },
    { icon: Briefcase, label: 'Designation', value: e.designation?.name || '—' },
    { icon: CalendarDays, label: 'Joined', value: formatDate(e.joining_date) },
    { icon: Cake, label: 'Date of birth', value: formatDate(e.date_of_birth) },
    { icon: MapPin, label: 'Location', value: [e.city, e.state, e.country].filter(Boolean).join(', ') || '—' },
    { icon: BadgeCheck, label: 'Employment type', value: e.employment_type || '—' },
  ]

  return (
    <div>
      <PageHeader title="My Profile" description="Your personal and employment information." actions={<Button onClick={openEdit}>Edit Profile</Button>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="mb-3 h-20 w-20">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initials(e.first_name, e.last_name)}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{e.first_name} {e.last_name}</h2>
            <p className="text-sm text-muted-foreground">{e.employee_code ?? 'No code'}</p>
            <div className="mt-3 flex gap-2">
              <Badge variant="success">{e.status ?? 'Active'}</Badge>
              <Badge variant="secondary">{e.employment_type ?? 'Full-time'}</Badge>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Account: {user?.email}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setBusy(true); changePassword() }} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset password to default
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {infoItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Date of birth</Label><Input type="date" value={form.date_of_birth ?? ''} onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Marital status</Label><Input value={form.marital_status ?? ''} onChange={(e) => setForm((f) => ({ ...f, marital_status: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Blood group</Label><Input value={form.blood_group ?? ''} onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))} /></div>
              <div className="space-y-2 col-span-2"><Label>Address</Label><Input value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={form.city ?? ''} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></div>
              <div className="space-y-2"><Label>State</Label><Input value={form.state ?? ''} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={form.country ?? ''} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Postal code</Label><Input value={form.postal_code ?? ''} onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

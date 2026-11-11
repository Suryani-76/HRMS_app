import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Mail, Phone, Building2, Briefcase, Cake, MapPin, BadgeCheck, CalendarDays, PhoneCall, Home, CheckSquare, Square, Hash, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { useEmployee, useUpdateEmployee } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { initials, cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { validateCity, validateState, validateCountry, validatePostalCode } from '@/lib/addressValidation'

const RELATIONSHIPS = ['Father', 'Mother', 'Spouse', 'Guardian', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend', 'Other']

export default function ProfilePage() {
  const { employee: contextEmployee, user } = useAuth()
  const { data: employee } = useEmployee(contextEmployee?.id)
  const update = useUpdateEmployee(contextEmployee?.id ?? '')

  const [editOpen, setEditOpen] = useState(false)
  const [sameAsCurrent, setSameAsCurrent] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const e = employee ?? contextEmployee

  if (!e) return <PageHeader title="Profile" description="No employee profile linked to this account." />

  const openEdit = () => {
    const curAddr = e.current_address || e.address || ''
    const curCity = e.current_city || e.city || ''
    const curState = e.current_state || e.state || ''
    const curCountry = e.current_country || e.country || 'India'
    const curZip = e.current_postal_code || e.postal_code || ''

    const permAddr = e.permanent_address || curAddr
    const permCity = e.permanent_city || curCity
    const permState = e.permanent_state || curState
    const permCountry = e.permanent_country || curCountry
    const permZip = e.permanent_postal_code || curZip

    const isSame =
      curAddr !== '' &&
      curAddr === permAddr &&
      curCity === permCity &&
      curState === permState &&
      curZip === permZip

    setSameAsCurrent(isSame)

    const initialErrors: Record<string, string> = {}
    const cErr = validateCity(curCity)
    if (cErr) initialErrors.current_city = cErr
    const sErr = validateState(curState)
    if (sErr) initialErrors.current_state = sErr
    const cntErr = validateCountry(curCountry)
    if (cntErr) initialErrors.current_country = cntErr
    const zErr = validatePostalCode(curZip)
    if (zErr) initialErrors.current_postal_code = zErr

    if (!isSame) {
      const pcErr = validateCity(permCity)
      if (pcErr) initialErrors.permanent_city = pcErr
      const psErr = validateState(permState)
      if (psErr) initialErrors.permanent_state = psErr
      const pcntErr = validateCountry(permCountry)
      if (pcntErr) initialErrors.permanent_country = pcntErr
      const pzErr = validatePostalCode(permZip)
      if (pzErr) initialErrors.permanent_postal_code = pzErr
    }
    setErrors(initialErrors)

    setForm({
      employee_code: e.employee_code ?? '',
      phone: e.phone ?? '',
      date_of_birth: e.date_of_birth?.slice(0, 10) ?? '',
      marital_status: e.marital_status ?? '',
      blood_group: e.blood_group ?? '',
      emergency_contact_name: e.emergency_contact_name || e.guardian_name || '',
      emergency_contact_relation: e.emergency_contact_relation || e.guardian_relation || '',
      emergency_contact_phone: e.emergency_contact_phone || employee?.emergency_contact || e.guardian_phone || '',
      current_address: curAddr,
      current_city: curCity,
      current_state: curState,
      current_country: curCountry,
      current_postal_code: curZip,
      permanent_address: permAddr,
      permanent_city: permCity,
      permanent_state: permState,
      permanent_country: permCountry,
      permanent_postal_code: permZip,
    })
    setEditOpen(true)
  }

  const validateField = (key: string, value: string): string | null => {
    if (key === 'current_city' || key === 'permanent_city') return validateCity(value)
    if (key === 'current_state' || key === 'permanent_state') return validateState(value)
    if (key === 'current_country' || key === 'permanent_country') return validateCountry(value)
    if (key === 'current_postal_code' || key === 'permanent_postal_code') return validatePostalCode(value)
    return null
  }

  const handleBlur = (key: string, value: string) => {
    const err = validateField(key, value)
    setErrors((prev) => {
      const next = { ...prev }
      if (err) next[key] = err
      else delete next[key]
      return next
    })
  }

  const setField = (key: string, value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (sameAsCurrent) {
        if (key === 'current_address') next.permanent_address = value
        if (key === 'current_city') next.permanent_city = value
        if (key === 'current_state') next.permanent_state = value
        if (key === 'current_country') next.permanent_country = value
        if (key === 'current_postal_code') next.permanent_postal_code = value
      }
      return next
    })

    const err = validateField(key, value)
    setErrors((prev) => {
      const next = { ...prev }
      if (err) next[key] = err
      else delete next[key]

      if (sameAsCurrent) {
        if (key === 'current_city') {
          if (err) next.permanent_city = err
          else delete next.permanent_city
        }
        if (key === 'current_state') {
          if (err) next.permanent_state = err
          else delete next.permanent_state
        }
        if (key === 'current_country') {
          if (err) next.permanent_country = err
          else delete next.permanent_country
        }
        if (key === 'current_postal_code') {
          if (err) next.permanent_postal_code = err
          else delete next.permanent_postal_code
        }
      }
      return next
    })
  }

  const handleToggleSameAddress = (checked: boolean) => {
    setSameAsCurrent(checked)
    if (checked) {
      setForm((f) => ({
        ...f,
        permanent_address: f.current_address || '',
        permanent_city: f.current_city || '',
        permanent_state: f.current_state || '',
        permanent_country: f.current_country || 'India',
        permanent_postal_code: f.current_postal_code || '',
      }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next.permanent_city
        delete next.permanent_state
        delete next.permanent_country
        delete next.permanent_postal_code
        if (prev.current_city) next.permanent_city = prev.current_city
        if (prev.current_state) next.permanent_state = prev.current_state
        if (prev.current_country) next.permanent_country = prev.current_country
        if (prev.current_postal_code) next.permanent_postal_code = prev.current_postal_code
        return next
      })
    }
  }

  const submit = async (e2: React.FormEvent) => {
    e2.preventDefault()

    const newErrors: Record<string, string> = {}
    const curCityErr = validateCity(form.current_city)
    if (curCityErr) newErrors.current_city = curCityErr

    const curStateErr = validateState(form.current_state)
    if (curStateErr) newErrors.current_state = curStateErr

    const curCountryErr = validateCountry(form.current_country)
    if (curCountryErr) newErrors.current_country = curCountryErr

    const curZipErr = validatePostalCode(form.current_postal_code)
    if (curZipErr) newErrors.current_postal_code = curZipErr

    if (!sameAsCurrent) {
      const permCityErr = validateCity(form.permanent_city)
      if (permCityErr) newErrors.permanent_city = permCityErr

      const permStateErr = validateState(form.permanent_state)
      if (permStateErr) newErrors.permanent_state = permStateErr

      const permCountryErr = validateCountry(form.permanent_country)
      if (permCountryErr) newErrors.permanent_country = permCountryErr

      const permZipErr = validatePostalCode(form.permanent_postal_code)
      if (permZipErr) newErrors.permanent_postal_code = permZipErr
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      const firstError = Object.values(newErrors)[0]
      toast.error(`Validation Error: ${firstError}`)
      return
    }

    await update.mutateAsync({
      employee_code: form.employee_code?.trim() || undefined,
      phone: form.phone || undefined,
      date_of_birth: form.date_of_birth || undefined,
      marital_status: form.marital_status || undefined,
      blood_group: form.blood_group || undefined,
      emergency_contact_name: form.emergency_contact_name || undefined,
      emergency_contact_relation: form.emergency_contact_relation || undefined,
      emergency_contact_phone: form.emergency_contact_phone || undefined,
      emergency_contact: form.emergency_contact_phone || undefined,
      guardian_name: form.emergency_contact_name || undefined,
      guardian_relation: form.emergency_contact_relation || undefined,
      guardian_phone: form.emergency_contact_phone || undefined,
      current_address: form.current_address || undefined,
      current_city: form.current_city || undefined,
      current_state: form.current_state || undefined,
      current_country: form.current_country || undefined,
      current_postal_code: form.current_postal_code || undefined,
      address: form.current_address || undefined,
      city: form.current_city || undefined,
      state: form.current_state || undefined,
      country: form.current_country || undefined,
      postal_code: form.current_postal_code || undefined,
      permanent_address: (sameAsCurrent ? form.current_address : form.permanent_address) || undefined,
      permanent_city: (sameAsCurrent ? form.current_city : form.permanent_city) || undefined,
      permanent_state: (sameAsCurrent ? form.current_state : form.permanent_state) || undefined,
      permanent_country: (sameAsCurrent ? form.current_country : form.permanent_country) || undefined,
      permanent_postal_code: (sameAsCurrent ? form.current_postal_code : form.permanent_postal_code) || undefined,
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

  const curAddressStr = [
    e.current_address || e.address,
    e.current_city || e.city,
    e.current_state || e.state,
    e.current_postal_code || e.postal_code,
    e.current_country || e.country,
  ].filter(Boolean).join(', ')

  const permAddressStr = [
    e.permanent_address || e.current_address || e.address,
    e.permanent_city || e.current_city || e.city,
    e.permanent_state || e.current_state || e.state,
    e.permanent_postal_code || e.current_postal_code || e.postal_code,
    e.permanent_country || e.current_country || e.country,
  ].filter(Boolean).join(', ')

  const emergencyName = e.emergency_contact_name || e.guardian_name || '—'
  const emergencyRel = e.emergency_contact_relation || e.guardian_relation || ''
  const emergencyPhone = e.emergency_contact_phone || e.emergency_contact || e.guardian_phone || '—'

  const infoItems = [
    { icon: Hash, label: 'Employee ID', value: e.employee_code || '—' },
    { icon: Mail, label: 'Email', value: e.email },
    { icon: Phone, label: 'Personal Phone', value: e.phone || '—' },
    { icon: Building2, label: 'Department', value: e.department?.name || '—' },
    { icon: Briefcase, label: 'Designation', value: e.designation?.name || '—' },
    { icon: CalendarDays, label: 'Joined', value: formatDate(e.joining_date) },
    { icon: Cake, label: 'Date of birth', value: formatDate(e.date_of_birth) },
    { icon: BadgeCheck, label: 'Employment type', value: e.employment_type || '—' },
    { icon: MapPin, label: 'Branch', value: e.branch || 'Main Branch (HQ)' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your personal, emergency contact, and employment information."
        actions={<Button onClick={openEdit}>Edit Profile</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar className="mb-3 h-20 w-20">
              <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                {initials(e.first_name, e.last_name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{e.first_name} {e.last_name}</h2>
            <p className="text-sm text-muted-foreground">{e.employee_code ?? 'No code'}</p>
            <div className="mt-3 flex gap-2">
              <Badge variant="success">{e.status ?? 'Active'}</Badge>
              <Badge variant="secondary">{e.employment_type ?? 'Full-time'}</Badge>
              {e.blood_group && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                  {e.blood_group}
                </Badge>
              )}
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

      {/* Guardian / Emergency Contact & Addresses Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Emergency / Guardian Contact */}
        <Card className="border-amber-200 bg-amber-50/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-900">
              <PhoneCall className="h-4 w-4 text-amber-600" /> Guardian / Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Contact Person</p>
              <p className="font-medium text-slate-900">
                {emergencyName} {emergencyRel && <span className="text-xs text-amber-700 font-normal">({emergencyRel})</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Emergency Phone</p>
              {emergencyPhone !== '—' ? (
                <a href={`tel:${emergencyPhone}`} className="font-semibold text-indigo-600 hover:underline">
                  {emergencyPhone}
                </a>
              ) : (
                <p className="text-muted-foreground text-sm">—</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
              <Home className="h-4 w-4 text-blue-600" /> Current Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {curAddressStr || 'No current address provided.'}
            </p>
          </CardContent>
        </Card>

        {/* Permanent Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-emerald-900">
              <MapPin className="h-4 w-4 text-emerald-600" /> Permanent Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-800 leading-relaxed">
              {permAddressStr || 'No permanent address provided.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
              <h4 className="text-sm font-semibold text-slate-900">Personal Info</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="prof_employee_code">Employee ID / Code</Label>
                  <Input
                    id="prof_employee_code"
                    value={form.employee_code ?? ''}
                    onChange={(e) => setField('employee_code', e.target.value)}
                    placeholder="e.g. OKL-ENG-2026-001 or EMP-001"
                    className="font-mono bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Personal Phone <span className="text-xs text-muted-foreground font-normal">(10 digits)</span></Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={form.phone ?? ''}
                    onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className="space-y-2"><Label>Date of birth</Label><Input type="date" value={form.date_of_birth ?? ''} onChange={(e) => setField('date_of_birth', e.target.value)} /></div>
                <div className="space-y-2"><Label>Marital status</Label><Input value={form.marital_status ?? ''} onChange={(e) => setField('marital_status', e.target.value)} /></div>
                <div className="space-y-2"><Label>Blood group</Label><Input value={form.blood_group ?? ''} onChange={(e) => setField('blood_group', e.target.value)} /></div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/30 p-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-900">
                <PhoneCall className="h-4 w-4 text-amber-600" /> Guardian / Emergency Contact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-900 block truncate">Contact Name</Label>
                  <Input
                    value={form.emergency_contact_name ?? ''}
                    onChange={(e) => setField('emergency_contact_name', e.target.value)}
                    placeholder="Guardian / Contact Name"
                    className="h-10 bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-900 block truncate">Relationship</Label>
                  <Select value={form.emergency_contact_relation || undefined} onValueChange={(v) => setField('emergency_contact_relation', v)}>
                    <SelectTrigger className="h-10 bg-white"><SelectValue placeholder="Select relation" /></SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-900 flex items-center justify-between">
                    <span>Emergency Phone</span>
                    <span className="text-xs text-muted-foreground font-normal">(10 digits)</span>
                  </Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={form.emergency_contact_phone ?? ''}
                    onChange={(e) => setField('emergency_contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876500000"
                    className="h-10 bg-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <Home className="h-4 w-4 text-blue-600" /> Current Address
              </h4>
              <div className="space-y-2">
                <Label htmlFor="prof_cur_addr">Street Address</Label>
                <Textarea
                  id="prof_cur_addr"
                  value={form.current_address ?? ''}
                  onChange={(e) => setField('current_address', e.target.value)}
                  rows={2}
                  placeholder="House/Flat No., Building, Street, Area"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prof_cur_city" className={cn(errors.current_city && 'text-red-600 font-semibold')}>City</Label>
                  <Input
                    id="prof_cur_city"
                    value={form.current_city ?? ''}
                    onChange={(e) => setField('current_city', e.target.value)}
                    onBlur={(e) => handleBlur('current_city', e.target.value)}
                    placeholder="e.g. Hyderabad"
                    className={cn(
                      'h-10 transition-colors',
                      errors.current_city
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {errors.current_city && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.current_city}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof_cur_state" className={cn(errors.current_state && 'text-red-600 font-semibold')}>State</Label>
                  <Input
                    id="prof_cur_state"
                    value={form.current_state ?? ''}
                    onChange={(e) => setField('current_state', e.target.value)}
                    onBlur={(e) => handleBlur('current_state', e.target.value)}
                    placeholder="e.g. Telangana"
                    className={cn(
                      'h-10 transition-colors',
                      errors.current_state
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {errors.current_state && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.current_state}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof_cur_country" className={cn(errors.current_country && 'text-red-600 font-semibold')}>Country</Label>
                  <Input
                    id="prof_cur_country"
                    value={form.current_country ?? ''}
                    onChange={(e) => setField('current_country', e.target.value)}
                    onBlur={(e) => handleBlur('current_country', e.target.value)}
                    placeholder="India"
                    className={cn(
                      'h-10 transition-colors',
                      errors.current_country
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {errors.current_country && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.current_country}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof_cur_zip" className={cn(errors.current_postal_code && 'text-red-600 font-semibold')}>Postal Code</Label>
                  <Input
                    id="prof_cur_zip"
                    value={form.current_postal_code ?? ''}
                    onChange={(e) => setField('current_postal_code', e.target.value)}
                    onBlur={(e) => handleBlur('current_postal_code', e.target.value)}
                    placeholder="e.g. 500081"
                    className={cn(
                      'h-10 transition-colors',
                      errors.current_postal_code
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {errors.current_postal_code && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.current_postal_code}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Permanent Address */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <MapPin className="h-4 w-4 text-emerald-600" /> Permanent Address
                </h4>
                <button
                  type="button"
                  onClick={() => handleToggleSameAddress(!sameAsCurrent)}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {sameAsCurrent ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4 text-slate-400" />}
                  Same as Current Address
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof_perm_addr">Street Address</Label>
                <Textarea
                  id="prof_perm_addr"
                  value={form.permanent_address ?? ''}
                  onChange={(e) => setField('permanent_address', e.target.value)}
                  rows={2}
                  disabled={sameAsCurrent}
                  placeholder="House/Flat No., Building, Street, Area"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prof_perm_city" className={cn(!sameAsCurrent && errors.permanent_city && 'text-red-600 font-semibold')}>City</Label>
                  <Input
                    id="prof_perm_city"
                    value={form.permanent_city ?? ''}
                    onChange={(e) => setField('permanent_city', e.target.value)}
                    onBlur={(e) => handleBlur('permanent_city', e.target.value)}
                    disabled={sameAsCurrent}
                    placeholder="e.g. Hyderabad"
                    className={cn(
                      'h-10 transition-colors',
                      !sameAsCurrent && errors.permanent_city
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {!sameAsCurrent && errors.permanent_city && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.permanent_city}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof_perm_state" className={cn(!sameAsCurrent && errors.permanent_state && 'text-red-600 font-semibold')}>State</Label>
                  <Input
                    id="prof_perm_state"
                    value={form.permanent_state ?? ''}
                    onChange={(e) => setField('permanent_state', e.target.value)}
                    onBlur={(e) => handleBlur('permanent_state', e.target.value)}
                    disabled={sameAsCurrent}
                    placeholder="e.g. Telangana"
                    className={cn(
                      'h-10 transition-colors',
                      !sameAsCurrent && errors.permanent_state
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {!sameAsCurrent && errors.permanent_state && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.permanent_state}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof_perm_country" className={cn(!sameAsCurrent && errors.permanent_country && 'text-red-600 font-semibold')}>Country</Label>
                  <Input
                    id="prof_perm_country"
                    value={form.permanent_country ?? ''}
                    onChange={(e) => setField('permanent_country', e.target.value)}
                    onBlur={(e) => handleBlur('permanent_country', e.target.value)}
                    disabled={sameAsCurrent}
                    placeholder="India"
                    className={cn(
                      'h-10 transition-colors',
                      !sameAsCurrent && errors.permanent_country
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {!sameAsCurrent && errors.permanent_country && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.permanent_country}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="prof_perm_zip" className={cn(!sameAsCurrent && errors.permanent_postal_code && 'text-red-600 font-semibold')}>Postal Code</Label>
                  <Input
                    id="prof_perm_zip"
                    value={form.permanent_postal_code ?? ''}
                    onChange={(e) => setField('permanent_postal_code', e.target.value)}
                    onBlur={(e) => handleBlur('permanent_postal_code', e.target.value)}
                    disabled={sameAsCurrent}
                    placeholder="e.g. 500081"
                    className={cn(
                      'h-10 transition-colors',
                      !sameAsCurrent && errors.permanent_postal_code
                        ? '!border-red-500 !ring-red-500 !ring-1 !focus-visible:ring-red-500 bg-red-50/20'
                        : 'border-slate-200'
                    )}
                  />
                  {!sameAsCurrent && errors.permanent_postal_code && (
                    <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>{errors.permanent_postal_code}</span>
                    </p>
                  )}
                </div>
              </div>
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


import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/features/auth/auth-context'
import type { InsuranceEnrollment, Employee } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShieldCheck, Users, PhoneCall, Home, MapPin, Building, CreditCard, CheckSquare, Square, Plus, Trash2 } from 'lucide-react'

const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Guardian', 'Other']

export default function InsuranceEnrollmentPage() {
  const { employee, isManager } = useAuth()

  // Admin View State
  const [allEnrollments, setAllEnrollments] = useState<(InsuranceEnrollment & { employee?: Employee })[]>([])

  // Employee View State
  const [enrollment, setEnrollment] = useState<InsuranceEnrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State - Nominee 1 (Primary)
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeDob, setNomineeDob] = useState('')
  const [nomineeShare, setNomineeShare] = useState('100')

  // Form State - Nominee 2 (Secondary / Additional)
  const [hasNominee2, setHasNominee2] = useState(false)
  const [nominee2Name, setNominee2Name] = useState('')
  const [nominee2Relation, setNominee2Relation] = useState('')
  const [nominee2Dob, setNominee2Dob] = useState('')
  const [nominee2Share, setNominee2Share] = useState('0')

  // Emergency Contact
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelation, setEmergencyRelation] = useState('')

  // Addresses
  const [currentAddress, setCurrentAddress] = useState('')
  const [permanentAddress, setPermanentAddress] = useState('')
  const [sameAsCurrent, setSameAsCurrent] = useState(false)

  // Additional & Bank
  const [existingInsurance, setExistingInsurance] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (isManager) {
        try {
          const { data } = await supabase
            .from('insurance_enrollments')
            .select('*, employee:employees(*)')
            .order('created_at', { ascending: false })
          if (data) {
            setAllEnrollments(data as any[])
          }
        } catch (err) {
          console.error('loadAdminEnrollments error:', err)
        }
      }

      if (employee) {
        let foundEnr: InsuranceEnrollment | null = null
        try {
          const { data } = await supabase
            .from('insurance_enrollments')
            .select('*')
            .eq('employee_id', employee.id)
            .maybeSingle()
          if (data) foundEnr = data as InsuranceEnrollment
        } catch (err) {
          console.error('loadEmployeeEnrollment error:', err)
        }

        if (foundEnr) {
          setEnrollment(foundEnr)
          setNomineeName(foundEnr.nominee_name || '')
          setNomineeRelation(foundEnr.nominee_relation || '')
          setNomineeDob(foundEnr.nominee_dob || '')
          setNomineeShare(String(foundEnr.nominee_share ?? '100'))

          if (foundEnr.nominee2_name || (foundEnr.nominee2_share && foundEnr.nominee2_share > 0)) {
            setHasNominee2(true)
            setNominee2Name(foundEnr.nominee2_name || '')
            setNominee2Relation(foundEnr.nominee2_relation || '')
            setNominee2Dob(foundEnr.nominee2_dob || '')
            setNominee2Share(String(foundEnr.nominee2_share || '0'))
          }

          setEmergencyName(foundEnr.emergency_contact_name || '')
          setEmergencyPhone(foundEnr.emergency_contact_phone || '')
          setEmergencyRelation(foundEnr.emergency_contact_relation || '')

          const curAddr = foundEnr.current_address || foundEnr.residential_address || employee.current_address || employee.address || ''
          const permAddr = foundEnr.permanent_address || employee.permanent_address || curAddr

          setCurrentAddress(curAddr)
          setPermanentAddress(permAddr)
          setSameAsCurrent(curAddr !== '' && curAddr === permAddr)

          setExistingInsurance(foundEnr.existing_insurance_details || '')
          setBankAccount(foundEnr.bank_account || '')
          setBankIfsc(foundEnr.bank_ifsc || foundEnr.ifsc_code || '')
          setSignature(foundEnr.declaration_signature || '')
          setAgreed(foundEnr.declaration_signed || false)
        } else {
          // Pre-populate with employee profile defaults
          const curAddr = [
            employee.current_address || employee.address,
            employee.current_city || employee.city,
            employee.current_state || employee.state,
            employee.current_postal_code || employee.postal_code,
          ].filter(Boolean).join(', ')

          const permAddr = [
            employee.permanent_address || employee.current_address || employee.address,
            employee.permanent_city || employee.current_city || employee.city,
            employee.permanent_state || employee.current_state || employee.state,
            employee.permanent_postal_code || employee.current_postal_code || employee.postal_code,
          ].filter(Boolean).join(', ')

          if (curAddr) setCurrentAddress(curAddr)
          if (permAddr) setPermanentAddress(permAddr)
          if (curAddr && curAddr === permAddr) setSameAsCurrent(true)

          if (employee.emergency_contact_name || employee.guardian_name) {
            setEmergencyName(employee.emergency_contact_name || employee.guardian_name || '')
          }
          if (employee.emergency_contact_phone || employee.emergency_contact || employee.guardian_phone) {
            setEmergencyPhone(employee.emergency_contact_phone || employee.emergency_contact || employee.guardian_phone || '')
          }
          if (employee.emergency_contact_relation || employee.guardian_relation) {
            setEmergencyRelation(employee.emergency_contact_relation || employee.guardian_relation || '')
          }
        }
      }
      setLoading(false)
    }
    loadData()
  }, [isManager, employee])

  const handleCurrentAddressChange = (value: string) => {
    setCurrentAddress(value)
    if (sameAsCurrent) {
      setPermanentAddress(value)
    }
  }

  const handleToggleSameAddress = (checked: boolean) => {
    setSameAsCurrent(checked)
    if (checked) {
      setPermanentAddress(currentAddress)
    }
  }

  const handleToggleNominee2 = (enable: boolean) => {
    setHasNominee2(enable)
    if (enable) {
      if (Number(nomineeShare) === 100) {
        setNomineeShare('50')
        setNominee2Share('50')
      }
    } else {
      setNomineeShare('100')
      setNominee2Name('')
      setNominee2Relation('')
      setNominee2Dob('')
      setNominee2Share('0')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee) return

    if (!agreed || !signature) {
      toast.error('You must sign and check the declaration before submitting.')
      return
    }

    const share1 = Number(nomineeShare) || 0
    const share2 = hasNominee2 ? Number(nominee2Share) || 0 : 0

    if (hasNominee2 && share1 + share2 !== 100) {
      toast.error(`Total Nominee Share must equal 100% (currently ${share1 + share2}%).`)
      return
    }

    const cleanAcc = bankAccount.replace(/\D/g, '').slice(0, 18)
    if (cleanAcc.length < 9 || cleanAcc.length > 18) {
      toast.error('Bank Account Number must be between 9 and 18 digits.')
      return
    }

    const cleanIfsc = bankIfsc.toUpperCase().trim().slice(0, 11)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    if (!ifscRegex.test(cleanIfsc)) {
      toast.error('Invalid IFSC Code. Must be exactly 11 characters (4 letters, 5th character "0", followed by 6 letters/digits, e.g. SBIN0001234).')
      return
    }

    setIsSubmitting(true)

    const payload = {
      employee_id: employee.id,
      employer_info: 'OKLUT Corporation',
      policy_info: 'Group Health Insurance - Gold Plan',
      // Nominee 1
      nominee_name: nomineeName,
      nominee_relation: nomineeRelation,
      nominee_dob: nomineeDob || null,
      nominee_share: share1,
      // Nominee 2
      nominee2_name: hasNominee2 ? nominee2Name : null,
      nominee2_relation: hasNominee2 ? nominee2Relation : null,
      nominee2_dob: hasNominee2 && nominee2Dob ? nominee2Dob : null,
      nominee2_share: hasNominee2 ? share2 : null,
      // Emergency Contact
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      emergency_contact_relation: emergencyRelation || null,
      // Addresses
      current_address: currentAddress,
      residential_address: currentAddress,
      permanent_address: sameAsCurrent ? currentAddress : permanentAddress,
      // Bank & Insurance
      existing_insurance_details: existingInsurance,
      bank_account: cleanAcc,
      bank_ifsc: cleanIfsc,
      declaration_signature: signature,
      declaration_signed: true,
      declaration_date: new Date().toISOString().slice(0, 10),
    }

    let savedData: InsuranceEnrollment | null = null

    try {
      if (enrollment) {
        const res = await supabase
          .from('insurance_enrollments')
          .update(payload)
          .eq('id', enrollment.id)
          .select()
          .single()
        if (res.data) savedData = res.data as InsuranceEnrollment
        if (res.error) throw res.error
      } else {
        const res = await supabase.from('insurance_enrollments').insert(payload).select().single()
        if (res.data) savedData = res.data as InsuranceEnrollment
        if (res.error) throw res.error
      }
    } catch (err: any) {
      console.error('Supabase insurance enrollment error:', err)
      toast.error(`Database error: ${err.message || 'Failed to save to Supabase'}`)
      setIsSubmitting(false)
      return
    }

    if (savedData) {
      setEnrollment(savedData)
      toast.success('Insurance nomination submitted successfully to Supabase!')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Enrollment"
        description={isManager ? 'View employee insurance enrollments and nominee details.' : 'Complete your company group health insurance and nominee details.'}
      />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading enrollment information...</div>
      ) : isManager ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" /> Employee Insurance & Nominee Enrollments
            </CardTitle>
            <CardDescription>Records of employee nominee allocations, addresses, and declarations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Primary Nominee</th>
                    <th className="px-4 py-3">Secondary Nominee</th>
                    <th className="px-4 py-3">Current & Permanent Address</th>
                    <th className="px-4 py-3">Emergency Contact</th>
                    <th className="px-4 py-3">Declaration</th>
                  </tr>
                </thead>
                <tbody>
                  {allEnrollments.map((enr) => (
                    <tr key={enr.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {enr.employee?.first_name || 'Staff'} {enr.employee?.last_name || ''}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{enr.nominee_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {enr.nominee_relation} · {enr.nominee_share ?? 100}% share
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {enr.nominee2_name ? (
                          <>
                            <p className="font-semibold text-slate-800">{enr.nominee2_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {enr.nominee2_relation} · {enr.nominee2_share}% share
                            </p>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs text-xs space-y-1">
                        <p className="truncate text-slate-700">
                          <strong>Curr:</strong> {enr.current_address || enr.residential_address || '—'}
                        </p>
                        {enr.permanent_address && (
                          <p className="truncate text-slate-500">
                            <strong>Perm:</strong> {enr.permanent_address}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-slate-800">{enr.emergency_contact_name || '—'}</p>
                        <p className="text-indigo-600 font-mono">{enr.emergency_contact_phone || '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        {enr.declaration_signed ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            Signed ({enr.declaration_date})
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {allEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No insurance enrollment submissions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" /> Group Health Insurance & Nominee Details
            </CardTitle>
            <CardDescription>
              Please provide accurate nominee allocations, emergency contact, and address information for policy records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Employer & Policy Information */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Building className="h-4 w-4 text-indigo-600" /> Employer & Policy Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employer Name</Label>
                    <Input disabled value="OKLUT Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Policy Coverage</Label>
                    <Input disabled value="Group Health Insurance - Gold Plan (₹5,00,000)" />
                  </div>
                </div>
              </div>

              {/* 2. Nominee Details (Nominee 1 & Nominee 2) */}
              <div className="space-y-4 rounded-lg border border-indigo-200 bg-indigo-50/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-indigo-950">
                      <Users className="h-4 w-4 text-indigo-600" /> Nominee Allocations
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Specify the primary and optional secondary beneficiaries for your coverage.
                    </p>
                  </div>
                  {!hasNominee2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleNominee2(true)}
                      className="text-xs h-8 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add 2nd Nominee
                    </Button>
                  )}
                </div>

                {/* Primary Nominee Card */}
                <div className="bg-white p-3.5 rounded-lg border border-indigo-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Primary Nominee (Nominee 1)
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Share: {nomineeShare}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom1_name">Nominee Name *</Label>
                      <Input
                        id="nom1_name"
                        required
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                        placeholder="e.g. Ramesh Sharma"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom1_rel">Relationship *</Label>
                      <Select value={nomineeRelation} onValueChange={setNomineeRelation} required>
                        <SelectTrigger id="nom1_rel">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {RELATIONSHIPS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom1_dob">Date of Birth *</Label>
                      <Input
                        id="nom1_dob"
                        type="date"
                        required
                        value={nomineeDob}
                        onChange={(e) => setNomineeDob(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom1_share">Share % *</Label>
                      <Input
                        id="nom1_share"
                        type="number"
                        required
                        min="1"
                        max="100"
                        value={nomineeShare}
                        onChange={(e) => {
                          const val = e.target.value
                          setNomineeShare(val)
                          if (hasNominee2 && Number(val) <= 100) {
                            setNominee2Share(String(100 - Number(val)))
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Secondary Nominee Card (Nominee 2) */}
                {hasNominee2 && (
                  <div className="bg-white p-3.5 rounded-lg border border-purple-200 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
                        Secondary Nominee (Nominee 2)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          Share: {nominee2Share}%
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleNominee2(false)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Remove Nominee 2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom2_name">Nominee 2 Name *</Label>
                        <Input
                          id="nom2_name"
                          required={hasNominee2}
                          value={nominee2Name}
                          onChange={(e) => setNominee2Name(e.target.value)}
                          placeholder="e.g. Sunita Sharma"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom2_rel">Relationship *</Label>
                        <Select value={nominee2Relation} onValueChange={setNominee2Relation} required={hasNominee2}>
                          <SelectTrigger id="nom2_rel">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom2_dob">Date of Birth</Label>
                        <Input
                          id="nom2_dob"
                          type="date"
                          value={nominee2Dob}
                          onChange={(e) => setNominee2Dob(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nom2_share">Share % *</Label>
                        <Input
                          id="nom2_share"
                          type="number"
                          required={hasNominee2}
                          min="1"
                          max="100"
                          value={nominee2Share}
                          onChange={(e) => {
                            const val = e.target.value
                            setNominee2Share(val)
                            if (Number(val) <= 100) {
                              setNomineeShare(String(100 - Number(val)))
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Emergency Contact */}
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/20 p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-900">
                  <PhoneCall className="h-4 w-4 text-amber-600" /> Emergency Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="em_name">Contact Person Name *</Label>
                    <Input
                      id="em_name"
                      required
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="e.g. Ramesh Sharma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em_rel">Relationship</Label>
                    <Select value={emergencyRelation} onValueChange={setEmergencyRelation}>
                      <SelectTrigger id="em_rel">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="em_phone">Emergency Contact Phone * <span className="text-xs text-muted-foreground font-normal">(10 digits)</span></Label>
                    <Input
                      id="em_phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876500000"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Addresses: Current & Permanent */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <Home className="h-4 w-4 text-blue-600" /> Residential Address Details
                </h3>

                {/* Current Residential Address */}
                <div className="space-y-2">
                  <Label htmlFor="cur_address">Current Residential Address *</Label>
                  <Textarea
                    id="cur_address"
                    required
                    value={currentAddress}
                    onChange={(e) => handleCurrentAddressChange(e.target.value)}
                    rows={2}
                    placeholder="House/Flat No., Building, Street, City, State, PIN"
                  />
                </div>

                {/* Permanent Residential Address */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="perm_address" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Permanent Residential Address *
                    </Label>
                    <button
                      type="button"
                      onClick={() => handleToggleSameAddress(!sameAsCurrent)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {sameAsCurrent ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                      Same as Current Address
                    </button>
                  </div>
                  <Textarea
                    id="perm_address"
                    required
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    rows={2}
                    placeholder="House/Flat No., Building, Street, City, State, PIN"
                    disabled={sameAsCurrent}
                  />
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="exist_ins">Existing Health Insurance (if any)</Label>
                  <Input
                    id="exist_ins"
                    value={existingInsurance}
                    onChange={(e) => setExistingInsurance(e.target.value)}
                    placeholder="Provider name, policy number (Optional)"
                  />
                </div>
              </div>

              {/* 5. Bank Details */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  <CreditCard className="h-4 w-4 text-emerald-600" /> Bank Details for Claims & Reimbursements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_acc">
                      Account Number * <span className="text-xs text-muted-foreground font-normal">(9–18 digits)</span>
                    </Label>
                    <Input
                      id="bank_acc"
                      type="text"
                      inputMode="numeric"
                      required
                      minLength={9}
                      maxLength={18}
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, '').slice(0, 18))}
                      placeholder="e.g. 123456789012"
                    />
                    <p className="text-[11px] text-muted-foreground">9 to 18 digits (most commonly 11–16 digits).</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_ifsc">
                      IFSC Code * <span className="text-xs text-muted-foreground font-normal">(11 characters)</span>
                    </Label>
                    <Input
                      id="bank_ifsc"
                      type="text"
                      required
                      maxLength={11}
                      value={bankIfsc}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                      placeholder="e.g. SBIN0001234"
                    />
                    <p className="text-[11px] text-muted-foreground">4 letters (Bank code) + 0 + 6 branch characters (e.g. SBIN0001234).</p>
                  </div>
                </div>
              </div>

              {/* 6. Declaration & Signature */}
              <div className="pt-2 space-y-4">
                <div className="flex items-start space-x-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={(c) => setAgreed(!!c)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="terms"
                    className="text-xs font-medium leading-relaxed text-slate-700 cursor-pointer"
                  >
                    I hereby declare that the information provided above (including nominee allocations and address details) is true and correct to the best of my knowledge.
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sig">Employee Signature (Type Full Name) *</Label>
                    <Input
                      id="sig"
                      required
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input disabled value={new Date().toLocaleDateString()} />
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto shadow-sm"
                  disabled={isSubmitting || !agreed || !signature}
                >
                  {isSubmitting ? 'Saving Enrollment...' : 'Submit Insurance Details'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


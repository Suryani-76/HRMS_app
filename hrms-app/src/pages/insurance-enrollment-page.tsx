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

export default function InsuranceEnrollmentPage() {
  const { employee, isManager } = useAuth()
  
  // Admin View State
  const [allEnrollments, setAllEnrollments] = useState<(InsuranceEnrollment & { employee: Employee })[]>([])
  
  // Employee View State
  const [enrollment, setEnrollment] = useState<InsuranceEnrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeDob, setNomineeDob] = useState('')
  const [nomineeShare, setNomineeShare] = useState('100')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [residentialAddress, setResidentialAddress] = useState('')
  const [existingInsurance, setExistingInsurance] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [signature, setSignature] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (isManager) {
        const { data } = await supabase.from('insurance_enrollments').select('*, employee:employees(*)').order('created_at', { ascending: false })
        if (data) setAllEnrollments(data as any[])
      }
      
      if (employee) {
        const { data } = await supabase.from('insurance_enrollments').select('*').eq('employee_id', employee.id).maybeSingle()
        if (data) {
          setEnrollment(data as InsuranceEnrollment)
          setNomineeName(data.nominee_name || '')
          setNomineeRelation(data.nominee_relation || '')
          setNomineeDob(data.nominee_dob || '')
          setNomineeShare(String(data.nominee_share || '100'))
          setEmergencyName(data.emergency_contact_name || '')
          setEmergencyPhone(data.emergency_contact_phone || '')
          setResidentialAddress(data.residential_address || '')
          setExistingInsurance(data.existing_insurance_details || '')
          setBankAccount(data.bank_account || '')
          setBankIfsc(data.bank_ifsc || '')
          setSignature(data.declaration_signature || '')
          setAgreed(data.declaration_signed)
        }
      }
      setLoading(false)
    }
    loadData()
  }, [isManager, employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employee || !agreed || !signature) {
      toast.error('You must sign and check the declaration.')
      return
    }
    setIsSubmitting(true)

    const payload = {
      employee_id: employee.id,
      nominee_name: nomineeName,
      nominee_relation: nomineeRelation,
      nominee_dob: nomineeDob || null,
      nominee_share: Number(nomineeShare),
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      residential_address: residentialAddress,
      existing_insurance_details: existingInsurance,
      bank_account: bankAccount,
      bank_ifsc: bankIfsc,
      declaration_signature: signature,
      declaration_signed: true,
      declaration_date: new Date().toISOString().slice(0, 10)
    }

    let error
    if (enrollment) {
      const res = await supabase.from('insurance_enrollments').update(payload).eq('id', enrollment.id).select().single()
      error = res.error
      if (res.data) setEnrollment(res.data as InsuranceEnrollment)
    } else {
      const res = await supabase.from('insurance_enrollments').insert(payload).select().single()
      error = res.error
      if (res.data) setEnrollment(res.data as InsuranceEnrollment)
    }

    setIsSubmitting(false)
    if (error) {
      toast.error('Failed to submit enrollment.')
    } else {
      toast.success('Insurance details submitted successfully.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Insurance Enrollment" 
        description={isManager ? "View employee insurance enrollments." : "Complete your company insurance & nominee details."}
      />

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : isManager ? (
        <Card>
          <CardHeader>
            <CardTitle>All Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Nominee</th>
                    <th className="px-4 py-3">Emergency Contact</th>
                    <th className="px-4 py-3">Declaration Signed</th>
                  </tr>
                </thead>
                <tbody>
                  {allEnrollments.map((enr) => (
                    <tr key={enr.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {enr.employee?.first_name} {enr.employee?.last_name}
                      </td>
                      <td className="px-4 py-3">
                        {enr.nominee_name} ({enr.nominee_relation})
                      </td>
                      <td className="px-4 py-3">
                        {enr.emergency_contact_name} - {enr.emergency_contact_phone}
                      </td>
                      <td className="px-4 py-3">
                        {enr.declaration_signed ? (
                          <span className="text-green-600 font-medium">Yes ({enr.declaration_date})</span>
                        ) : 'No'}
                      </td>
                    </tr>
                  ))}
                  {allEnrollments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground">No enrollments found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Your Insurance Details</CardTitle>
            <CardDescription>Please provide accurate details for your group health insurance coverage.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Employer & Policy Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employer Name</Label>
                    <Input disabled value="OKLUT Corporation" />
                  </div>
                  <div className="space-y-2">
                    <Label>Policy Type</Label>
                    <Input disabled value="Group Health Insurance - Gold Plan" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Nominee Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nominee Name *</Label>
                    <Input required value={nomineeName} onChange={e => setNomineeName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship *</Label>
                    <Select value={nomineeRelation} onValueChange={setNomineeRelation}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input type="date" required value={nomineeDob} onChange={e => setNomineeDob(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Share % *</Label>
                    <Input type="number" required min="1" max="100" value={nomineeShare} onChange={e => setNomineeShare(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contact Name *</Label>
                    <Input required value={emergencyName} onChange={e => setEmergencyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone *</Label>
                    <Input required value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Additional Information</h3>
                <div className="space-y-2">
                  <Label>Current Residential Address *</Label>
                  <Textarea required value={residentialAddress} onChange={e => setResidentialAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Existing Health Insurance (if any)</Label>
                  <Input value={existingInsurance} onChange={e => setExistingInsurance(e.target.value)} placeholder="Provider name, policy number..." />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Number *</Label>
                    <Input required value={bankAccount} onChange={e => setBankAccount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code *</Label>
                    <Input required value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={(c) => setAgreed(!!c)} />
                  <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I declare that the information provided above is true and correct to the best of my knowledge.
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employee Signature (Type Full Name) *</Label>
                    <Input required value={signature} onChange={e => setSignature(e.target.value)} placeholder="e.g. John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input disabled value={new Date().toLocaleDateString()} />
                  </div>
                </div>
                
                <Button type="submit" disabled={isSubmitting || !agreed || !signature}>
                  {isSubmitting ? 'Saving...' : 'Submit Details'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Candidate, Interview, Offer } from '@/lib/database.types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDateTime, formatDate, formatCurrency } from '@/lib/format'
import { StatusPill } from '@/components/shared/status-pill'
import { toast } from 'sonner'

export default function CandidatePortalPage() {
  const [refId, setRefId] = useState('')
  const [email, setEmail] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase
      .from('candidates')
      .select('*, job_opening:job_openings(title)')
      .eq('reference_id', refId)
      .eq('email', email)
      .single()

    if (error || !data) {
      toast.error('Invalid credentials or application not found.')
      setCandidate(null)
    } else {
      setCandidate(data as Candidate)
      // Fetch interviews
      const { data: iData } = await supabase.from('interviews').select('*').eq('candidate_id', data.id).order('scheduled_at')
      if (iData) setInterviews(iData as Interview[])
      
      // Fetch offer
      const { data: oData } = await supabase.from('offers').select('*').eq('candidate_id', data.id).single()
      if (oData) setOffer(oData as Offer)
    }
    setLoading(false)
  }

  const handleOfferResponse = async (response: 'accept' | 'discuss' | 'reject') => {
    if (!offer) return
    const { error } = await supabase
      .from('offers')
      .update({ candidate_response: response, status: response === 'accept' ? 'accepted' : response === 'reject' ? 'rejected' : offer.status })
      .eq('id', offer.id)
      
    if (error) {
      toast.error('Failed to submit response.')
    } else {
      toast.success('Response submitted successfully.')
      setOffer({ ...offer, candidate_response: response, status: response === 'accept' ? 'accepted' : response === 'reject' ? 'rejected' : offer.status })
    }
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Candidate Portal</CardTitle>
            <CardDescription>Track your application status by entering your Reference ID and Email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Reference ID</Label>
                <Input required placeholder="REF-XXXXXX" value={refId} onChange={(e) => setRefId(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking...' : 'View Status'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Application Status</h1>
            <p className="text-muted-foreground">Welcome back, {candidate.name}</p>
          </div>
          <Button variant="outline" onClick={() => setCandidate(null)}>Sign Out</Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Position</div>
                <div className="font-medium">{(candidate as any).job_opening?.title || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Status</div>
                <StatusPill status={candidate.status || 'applied'} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Applied On</div>
                <div>{formatDate(candidate.applied_at)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-sm text-muted-foreground">No interviews scheduled yet.</div>
              ) : (
                <div className="space-y-4">
                  {interviews.map(i => (
                    <div key={i.id} className="p-3 border rounded-lg bg-card">
                      <div className="flex justify-between font-medium">
                        <span>{i.round}</span>
                        <StatusPill status={i.status || 'scheduled'} />
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {formatDateTime(i.scheduled_at)}
                      </div>
                      {i.mode === 'online' && i.meeting_link && i.status === 'scheduled' && (
                        <a href={i.meeting_link} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm block mt-2">
                          Join Meeting
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {offer && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle>Job Offer</CardTitle>
              <CardDescription>Congratulations! You have received an offer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Salary Offered</div>
                  <div className="font-medium text-lg">{formatCurrency(offer.salary_offered || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Expected Joining Date</div>
                  <div className="font-medium text-lg">{formatDate(offer.joining_date || '')}</div>
                </div>
              </div>
              {offer.offer_letter_url && (
                <div>
                  <a href={offer.offer_letter_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                    View Offer Letter Document
                  </a>
                </div>
              )}

              <div className="pt-4 border-t">
                {offer.candidate_response ? (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Your Response</div>
                    <StatusPill status={offer.candidate_response} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Please respond to this offer:</div>
                    <div className="flex gap-3">
                      <Button onClick={() => handleOfferResponse('accept')} className="bg-green-600 hover:bg-green-700">Accept Offer</Button>
                      <Button onClick={() => handleOfferResponse('discuss')} variant="outline">Discuss Terms</Button>
                      <Button onClick={() => handleOfferResponse('reject')} variant="destructive">Decline</Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

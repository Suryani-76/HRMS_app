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
import { CheckCircle2, Clock, Circle, Briefcase, Calendar, FileText, Trophy, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

const PIPELINE_STEPS = [
  { key: 'Applied', label: 'Applied', icon: Briefcase },
  { key: 'Shortlisted', label: 'Shortlisted', icon: CheckCircle2 },
  { key: 'Interview Scheduled', label: 'Interview', icon: Calendar },
  { key: 'Offer Sent', label: 'Offer Sent', icon: FileText },
  { key: 'Hired', label: 'Hired 🎉', icon: Trophy },
]

function getPipelineIndex(status: string) {
  const s = status?.toLowerCase() ?? ''
  if (s.includes('hired') || s.includes('selected')) return 4
  if (s.includes('offer')) return 3
  if (s.includes('interview')) return 2
  if (s.includes('shortlist')) return 1
  return 0
}

export default function CandidatePortalPage() {
  const [tempId, setTempId] = useState('')
  const [email, setEmail] = useState('')
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loading, setLoading] = useState(false)

  const isRejected = candidate?.status?.toLowerCase().includes('reject')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase
      .from('candidates')
      .select('*, job_opening:job_openings(title, department:departments(name))')
      .or(`temp_id.eq.${tempId.trim().toUpperCase()},reference_id.eq.${tempId.trim().toUpperCase()}`)
      .eq('email', email.trim().toLowerCase())
      .single()

    if (error || !data) {
      toast.error('No application found. Please check your Portal ID and Email.')
      setCandidate(null)
    } else {
      setCandidate(data as Candidate)
      const { data: iData } = await supabase
        .from('interviews')
        .select('*')
        .eq('candidate_id', data.id)
        .order('scheduled_at')
      if (iData) setInterviews(iData as Interview[])

      const { data: oData } = await supabase
        .from('offers')
        .select('*')
        .eq('candidate_id', data.id)
        .maybeSingle()
      if (oData) setOffer(oData as Offer)
    }
    setLoading(false)
  }

  const handleOfferResponse = async (response: 'accept' | 'discuss' | 'reject') => {
    if (!offer) return
    const { error } = await supabase
      .from('offers')
      .update({
        candidate_response: response,
        status: response === 'accept' ? 'accepted' : response === 'reject' ? 'rejected' : offer.status,
      })
      .eq('id', offer.id)

    if (error) {
      toast.error('Failed to submit response.')
    } else {
      toast.success('Response submitted successfully.')
      setOffer({ ...offer, candidate_response: response })
    }
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 mb-4">
              <Briefcase className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Candidate Portal</h1>
            <p className="text-slate-500 mt-2">Track your application status in real-time.</p>
          </div>

          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Sign In to Your Application</CardTitle>
              <CardDescription>
                Use the <strong>Portal ID</strong> (e.g. <code>CAND-AB1CD2</code>) and <strong>Email</strong> you applied with.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Portal ID / Reference ID</Label>
                  <Input
                    required
                    placeholder="CAND-AB1CD2 or REF-XXXXXX"
                    value={tempId}
                    onChange={(e) => setTempId(e.target.value.toUpperCase())}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    required
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                  {loading ? 'Checking...' : 'View My Application'}
                </Button>
              </form>
              <p className="text-xs text-muted-foreground text-center mt-4">
                Haven't applied yet?{' '}
                <Link to="/careers" className="text-indigo-600 hover:underline font-medium">
                  View open positions
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const pipelineIdx = getPipelineIndex(candidate.status ?? '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Application Status</h1>
            <p className="text-slate-500 mt-1">
              Welcome back, <strong>{candidate.name}</strong> ·{' '}
              <span className="font-mono text-indigo-600 text-sm">
                {(candidate as any).temp_id || (candidate as any).reference_id}
              </span>
            </p>
          </div>
          <Button variant="outline" onClick={() => { setCandidate(null); setTempId(''); setEmail('') }}>
            Sign Out
          </Button>
        </div>

        {/* Pipeline Timeline */}
        <Card className="shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle>Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isRejected ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                <XCircle className="h-8 w-8 text-red-500 shrink-0" />
                <div>
                  <div className="font-semibold text-red-700">Application Not Selected</div>
                  <div className="text-sm text-red-500 mt-0.5">
                    Thank you for applying. We'll keep your profile for future opportunities.
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                {PIPELINE_STEPS.map((step, idx) => {
                  const isCompleted = idx < pipelineIdx
                  const isCurrent = idx === pipelineIdx
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-indigo-600 text-white'
                            : isCurrent
                            ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isCurrent ? (
                            <Clock className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        <span className={`text-xs font-medium text-center max-w-[64px] leading-tight ${
                          isCurrent ? 'text-indigo-600' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mb-5 mx-1 ${idx < pipelineIdx ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application + Interview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-sm border-0 bg-white">
            <CardHeader><CardTitle>Application Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Position</div>
                <div className="font-semibold">{(candidate as any).job_opening?.title || 'Unknown'}</div>
                {(candidate as any).job_opening?.department?.name && (
                  <div className="text-sm text-muted-foreground">{(candidate as any).job_opening.department.name}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Status</div>
                <StatusPill status={candidate.status || 'Applied'} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Applied On</div>
                <div>{formatDate((candidate as any).applied_at || (candidate as any).created_at)}</div>
              </div>
              {(candidate as any).ats_score && (
                <div>
                  <div className="text-sm text-muted-foreground">ATS Score</div>
                  <div className="font-semibold text-indigo-600">{(candidate as any).ats_score}/100</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0 bg-white">
            <CardHeader><CardTitle>Interview Schedule</CardTitle></CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No interviews scheduled yet. You'll be notified when one is set up.
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((i) => (
                    <div key={i.id} className="p-3 border rounded-xl bg-slate-50">
                      <div className="flex justify-between items-start font-medium">
                        <span>{i.round}</span>
                        <StatusPill status={i.status || 'scheduled'} />
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{formatDateTime(i.scheduled_at)}</div>
                      {i.mode === 'online' && i.meeting_link && i.status === 'scheduled' && (
                        <a href={i.meeting_link} target="_blank" rel="noreferrer"
                          className="inline-block mt-2 text-sm text-indigo-600 hover:underline font-medium">
                          Join Meeting →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offer */}
        {offer && (
          <Card className="shadow-sm border-0 bg-indigo-50 ring-1 ring-indigo-200">
            <CardHeader>
              <CardTitle className="text-indigo-900">🎉 Job Offer Received</CardTitle>
              <CardDescription>Please review and respond to your offer below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Salary Offered</div>
                  <div className="font-bold text-2xl text-indigo-700">{formatCurrency(offer.salary_offered || 0)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Joining Date</div>
                  <div className="font-bold text-lg">{formatDate(offer.joining_date || '')}</div>
                </div>
              </div>
              {offer.offer_letter_url && (
                <a href={offer.offer_letter_url} target="_blank" rel="noreferrer"
                  className="text-indigo-600 hover:underline font-medium text-sm">
                  📄 View Offer Letter Document
                </a>
              )}
              <div className="pt-4 border-t border-indigo-200">
                {offer.candidate_response ? (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Your Response</div>
                    <StatusPill status={offer.candidate_response} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Please respond to this offer:</div>
                    <div className="flex gap-3 flex-wrap">
                      <Button onClick={() => handleOfferResponse('accept')} className="bg-green-600 hover:bg-green-700">
                        ✅ Accept Offer
                      </Button>
                      <Button onClick={() => handleOfferResponse('discuss')} variant="outline">
                        💬 Discuss Terms
                      </Button>
                      <Button onClick={() => handleOfferResponse('reject')} variant="destructive">
                        ❌ Decline
                      </Button>
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

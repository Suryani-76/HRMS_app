import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Briefcase, MapPin, Building, ArrowRight, UploadCloud,
  Heart, Zap, CalendarClock, Globe, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { JobOpening } from '@/lib/database.types'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Logo } from '@/components/ui/logo'

export default function CareersPage() {
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null)
  
  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadJobs() {
      const { data, error } = await supabase
        .from('job_openings')
        .select('*, department:departments(name)')
        .eq('status', 'Open')
        .eq('published', true)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setJobs(data as JobOpening[])
      }
      setLoading(false)
    }
    loadJobs()
  }, [])

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob || !name || !email) return
    setIsSubmitting(true)
    
    // Auto-generate reference_id
    const refId = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase()
    // Simulated ATS score for demo purposes (random 60-100)
    const atsScore = Math.floor(Math.random() * (100 - 60 + 1)) + 60

    const { error } = await supabase.from('candidates').insert({
      job_opening_id: selectedJob.id,
      name,
      email,
      phone,
      resume_url: resumeUrl,
      cover_letter: coverLetter,
      source: `Careers Page (ATS: ${atsScore})`
    })

    setIsSubmitting(false)
    if (error) {
      toast.error('Failed to submit application: ' + error.message)
    } else {
      toast.success(`Application submitted! Your Reference ID is ${refId}`)
      setSelectedJob(null)
      setName('')
      setEmail('')
      setPhone('')
      setResumeUrl('')
      setCoverLetter('')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="lg" />
          <div className="flex items-center gap-4">
            <a href="#jobs" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">View Openings</a>
            <Link to="/login">
              <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-full px-6">
                Employee Login
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-24 pb-32">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-600 opacity-20 blur-[100px]"></div>
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
            <Zap className="h-4 w-4" /> We're hiring across all departments!
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-950 mb-6 leading-tight">
            Build the future <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A3FF] to-[#00135A]">
              with OKLUT.
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed">
            Join a team of passionate creators, engineers, and visionaries. Discover your next career opportunity and help us shape what's next.
          </p>
          <a href="#jobs">
            <Button size="lg" className="rounded-full px-8 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 h-14 text-lg">
              Explore Open Roles <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </a>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why work with us?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">We believe in creating an environment where our team can thrive both personally and professionally.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Work from Anywhere</h3>
              <p className="text-slate-600 leading-relaxed">We are a remote-first company. Work from the comfort of your home or any of our global co-working spaces.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Comprehensive Health</h3>
              <p className="text-slate-600 leading-relaxed">100% covered premium medical, dental, and vision insurance for you and your dependents.</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Continuous Growth</h3>
              <p className="text-slate-600 leading-relaxed">Annual learning stipends, mentorship programs, and clear pathways for career progression.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section id="jobs" className="py-24 bg-slate-50 flex-1">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Open Positions</h2>
              <p className="text-slate-500">Find a role that fits your passion and skills.</p>
            </div>
            <div className="bg-white border rounded-full px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              {jobs.length} roles available
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-slate-500">Loading open positions...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <Briefcase className="mx-auto h-16 w-16 text-slate-300 mb-6" />
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">No open positions</h3>
              <p className="text-slate-500">We're fully staffed right now, but check back soon!</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {jobs.map((job) => {
                // Parse dates from description if present
                const lastDateMatch = job.description?.match(/\[Last Date: (.*?)\]/)
                const lastDate = lastDateMatch ? lastDateMatch[1] : null
                const cleanDesc = job.description?.replace(/\[Last Date: .*?\]\n?/, '').trim()

                return (
                  <div key={job.id} className="group bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{job.title}</h3>
                        {job.requirements?.includes('Fresher') && (
                          <span className="bg-emerald-100 text-emerald-700 text-[11px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Fresher</span>
                        )}
                        {job.requirements?.includes('Experienced') && (
                          <span className="bg-purple-100 text-purple-700 text-[11px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">Experienced</span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 mb-4">
                        <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                          <Building className="h-4 w-4" />
                          {(job as any).department?.name || 'General'}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                          <Briefcase className="h-4 w-4" />
                          {job.employment_type || 'Full-time'}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                        {cleanDesc}
                      </p>

                      <div className="flex flex-wrap items-center gap-6 text-[13px] font-medium text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <CalendarClock className="h-4 w-4" /> Posted: {new Date(job.created_at).toLocaleDateString()}
                        </div>
                        {lastDate && (
                          <div className="flex items-center gap-1.5 text-rose-500/80 bg-rose-50 px-2 py-0.5 rounded-md">
                            <CalendarClock className="h-4 w-4" /> Closing: {new Date(lastDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full md:w-auto mt-4 md:mt-0 md:pl-6 md:border-l border-slate-100">
                      <Button onClick={() => setSelectedJob(job)} size="lg" className="w-full md:w-40 rounded-xl bg-slate-900 hover:bg-indigo-600 transition-colors h-14 text-base">
                        Apply Now
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <Logo size="sm" className="opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all" showText={false} />
          <p>© {new Date().getFullYear()} OKLUT Inc. All rights reserved.</p>
          <div className="flex gap-6 font-medium">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Application Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(o) => !o && setSelectedJob(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-0 shadow-2xl rounded-3xl">
          <div className="bg-indigo-600 px-8 py-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white opacity-10 rounded-full blur-3xl"></div>
            <DialogTitle className="text-3xl font-bold mb-2">Apply for {selectedJob?.title}</DialogTitle>
            <p className="text-indigo-100">Take the next step in your career with us.</p>
          </div>
          
          <form onSubmit={handleApply} className="p-8 space-y-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label className="text-slate-700 font-medium">Full Name <span className="text-rose-500">*</span></Label>
                <Input required value={name} onChange={e => setName(e.target.value)} className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-600" placeholder="Jane Doe" />
              </div>
              <div className="space-y-3">
                <Label className="text-slate-700 font-medium">Email Address <span className="text-rose-500">*</span></Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-600" placeholder="jane@example.com" />
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-12 bg-slate-50 border-slate-200 focus-visible:ring-indigo-600" placeholder="+1 (555) 000-0000" />
            </div>
            
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">Resume / CV</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 hover:bg-slate-100 transition-colors relative group cursor-pointer">
                <Input type="file" accept=".pdf,.doc,.docx" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) setResumeUrl(file.name)
                }} />
                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                  <UploadCloud className="h-8 w-8 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                  <span className="font-medium text-slate-700">{resumeUrl || 'Click to upload or drag and drop'}</span>
                  <span className="text-xs">PDF, DOC, DOCX (Max 5MB)</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">Cover Letter (Optional)</Label>
              <Textarea rows={4} value={coverLetter} onChange={e => setCoverLetter(e.target.value)} className="resize-none bg-slate-50 border-slate-200 focus-visible:ring-indigo-600" placeholder="Tell us why you're a great fit..." />
            </div>
            
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setSelectedJob(null)} className="h-12 px-6 rounded-xl hover:bg-slate-100">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all">
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                {!isSubmitting && <CheckCircle2 className="ml-2 h-5 w-5" />}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

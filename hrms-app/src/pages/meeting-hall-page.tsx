import { useEffect, useState, useMemo } from 'react'
import { format, isWithinInterval, isSameDay } from 'date-fns'
import { Plus, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, Building, Loader2 } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { supabase } from '@/lib/supabase'
import { type MeetingHallBooking } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

export default function MeetingHallPage() {
  const { user, isAdmin } = useAuth()
  const [bookings, setBookings] = useState<MeetingHallBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [submitting, setSubmitting] = useState(false)

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_hall_bookings')
        .select(`
          *,
          requester:employees(id, first_name, last_name, email)
        `)
        .order('start_time', { ascending: true })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      toast.error('Failed to load meeting hall schedule')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()

    // Real-time subscription
    const channel = supabase
      .channel('meeting-hall-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_hall_bookings' },
        () => {
          fetchBookings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Derived state
  const now = new Date()
  
  const currentStatus = useMemo(() => {
    const activeBooking = bookings.find(b => 
      b.status === 'Approved' && 
      isWithinInterval(now, { start: new Date(b.start_time), end: new Date(b.end_time) })
    )
    return activeBooking ? { status: 'Busy', booking: activeBooking } : { status: 'Vacant', booking: null }
  }, [bookings, now])

  const todaysBookings = useMemo(() => {
    return bookings.filter(b => isSameDay(new Date(b.start_time), now) && b.status === 'Approved')
  }, [bookings, now])

  const pendingRequests = useMemo(() => {
    return bookings.filter(b => b.status === 'Pending')
  }, [bookings])

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.employee_id) return toast.error('Employee ID not found')

    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)

    if (start >= end) {
      return toast.error('End time must be after start time')
    }

    // Check for overlap with approved bookings
    const hasOverlap = bookings.some(b => 
      b.status === 'Approved' &&
      isSameDay(new Date(b.start_time), start) &&
      start < new Date(b.end_time) && 
      end > new Date(b.start_time)
    )

    if (hasOverlap) {
      return toast.error('This time slot overlaps with an existing approved booking.')
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('meeting_hall_bookings').insert({
        title,
        description,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        requested_by: user.employee_id,
        status: isAdmin ? 'Approved' : 'Pending',
      })

      if (error) throw error
      
      toast.success(isAdmin ? 'Booking confirmed' : 'Booking request submitted for approval')
      setIsDialogOpen(false)
      setTitle('')
      setDescription('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to book meeting hall')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('meeting_hall_bookings')
        .update({ status })
        .eq('id', id)
        
      if (error) throw error
      toast.success(`Request ${status.toLowerCase()}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update request')
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Meeting Hall</h1>
        <p className="text-muted-foreground mt-1">Book the main conference hall and view its availability.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-2 overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Building className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> Current Status
            </CardTitle>
            <CardDescription>Real-time availability of the meeting hall</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className={`text-5xl font-black uppercase tracking-widest ${currentStatus.status === 'Vacant' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {currentStatus.status}
            </div>
            {currentStatus.status === 'Busy' && currentStatus.booking && (
              <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4">
                <p className="text-lg font-medium text-slate-800">{currentStatus.booking.title}</p>
                <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-4 h-4" />
                  {format(new Date(currentStatus.booking.start_time), 'h:mm a')} - {format(new Date(currentStatus.booking.end_time), 'h:mm a')}
                </p>
                <p className="text-sm font-medium mt-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                  By {currentStatus.booking.requester?.first_name} {currentStatus.booking.requester?.last_name}
                </p>
              </div>
            )}
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-8 shadow-md" size="lg">
                  <Plus className="mr-2 h-5 w-5" />
                  Book Hall
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleBook}>
                  <DialogHeader>
                    <DialogTitle>{isAdmin ? 'Book Meeting Hall' : 'Request Meeting Hall'}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Q3 Planning" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required min={format(now, 'yyyy-MM-dd')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="start">Start Time</Label>
                        <Input id="start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="end">End Time</Label>
                        <Input id="end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="desc">Description (Optional)</Label>
                      <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isAdmin ? 'Confirm Booking' : 'Submit Request'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-500" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysBookings.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No bookings for today.
              </div>
            ) : (
              <div className="space-y-4">
                {todaysBookings.map(booking => (
                  <div key={booking.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <div className="w-1.5 h-10 bg-indigo-500 rounded-full mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{booking.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" /> Pending Requests
            </CardTitle>
            <CardDescription>Review and manage booking requests from employees.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-sm text-slate-500">No pending requests at the moment.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-900">{req.title}</h4>
                      <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">Pending</Badge>
                    </div>
                    <div className="text-sm text-slate-600 space-y-1 mb-4 flex-1">
                      <p><strong>By:</strong> {req.requester?.first_name} {req.requester?.last_name}</p>
                      <p><strong>Date:</strong> {format(new Date(req.start_time), 'MMM d, yyyy')}</p>
                      <p><strong>Time:</strong> {format(new Date(req.start_time), 'h:mm a')} - {format(new Date(req.end_time), 'h:mm a')}</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Button size="sm" className="flex-1" onClick={() => handleUpdateStatus(req.id, 'Approved')}>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleUpdateStatus(req.id, 'Rejected')}>
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

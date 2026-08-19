import { useState, useMemo } from 'react'
import { format, isWithinInterval, isSameDay } from 'date-fns'
import { Plus, Clock, Calendar as CalendarIcon, CheckCircle2, XCircle, AlertCircle, Building, Loader2, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  useMeetingHallBookings,
  useCreateMeetingHallBooking,
  useUpdateMeetingHallBookingStatus,
  useDeleteMeetingHallBooking,
} from '@/hooks/use-queries'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'

export default function MeetingHallPage() {
  const { user, employee, isAdmin, isManager } = useAuth()
  const { data: bookings = [], isLoading } = useMeetingHallBookings()
  const createBooking = useCreateMeetingHallBooking()
  const updateStatus = useUpdateMeetingHallBookingStatus()
  const deleteBooking = useDeleteMeetingHallBooking()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')

  // Derived state
  const now = new Date()

  const currentStatus = useMemo(() => {
    const activeBooking = bookings.find((b) => {
      if (b.status !== 'Approved') return false
      try {
        return isWithinInterval(now, { start: new Date(b.start_time), end: new Date(b.end_time) })
      } catch {
        return false
      }
    })
    return activeBooking ? { status: 'Busy', booking: activeBooking } : { status: 'Vacant', booking: null }
  }, [bookings, now])

  const todaysBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        try {
          return isSameDay(new Date(b.start_time), now) && b.status === 'Approved'
        } catch {
          return false
        }
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }, [bookings, now])

  const pendingRequests = useMemo(() => {
    return bookings.filter((b) => (b.status ?? '').toLowerCase() === 'pending')
  }, [bookings])

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()

    const currentEmployeeId = employee?.id || user?.employee_id || '00000000-0000-0000-0000-000000000010'

    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)

    if (start >= end) {
      return toast.error('End time must be after start time')
    }

    // Check for overlap with approved bookings
    const hasOverlap = bookings.some((b) => {
      if (b.status !== 'Approved') return false
      try {
        const bStart = new Date(b.start_time)
        const bEnd = new Date(b.end_time)
        return isSameDay(bStart, start) && start < bEnd && end > bStart
      } catch {
        return false
      }
    })

    if (hasOverlap) {
      return toast.error('This time slot overlaps with an existing approved booking. Please choose another time.')
    }

    try {
      await createBooking.mutateAsync({
        title,
        description,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        requested_by: currentEmployeeId,
        status: isAdmin ? 'Approved' : 'Pending',
      })

      setIsDialogOpen(false)
      setTitle('')
      setDescription('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setStartTime('09:00')
      setEndTime('10:00')
    } catch {
      // toast is handled in mutation
    }
  }

  const handleUpdateStatus = (id: string, status: 'Approved' | 'Rejected') => {
    updateStatus.mutate({
      id,
      status,
      comment: isAdmin ? 'Approved by Admin/CEO' : 'Approved by Management',
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Meeting Hall</h1>
          <p className="text-muted-foreground mt-1">Book the main conference hall and view real-time availability.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-sm">
              <Plus className="mr-2 h-5 w-5" /> Book Hall
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleBook}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  {isAdmin ? 'Book Meeting Hall (Admin Direct)' : 'Request Meeting Hall'}
                </DialogTitle>
                <DialogDescription>
                  {isAdmin
                    ? 'As Admin / CEO, your booking is confirmed immediately.'
                    : 'Your request will be submitted to the Admin / CEO for approval.'}
                </DialogDescription>
              </DialogHeader>

              {!isAdmin && (
                <div className="my-3 flex items-start gap-2.5 rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 text-xs text-indigo-900">
                  <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Admin Approval Required:</strong> All meeting hall booking requests must be approved by the Admin / CEO before the room is reserved.
                  </span>
                </div>
              )}

              <div className="grid gap-4 py-3">
                <div className="grid gap-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="e.g. Q3 Roadmap Review / Client Demo"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    min={format(now, 'yyyy-MM-dd')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start">Start Time *</Label>
                    <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end">End Time *</Label>
                    <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Description / Agenda (Optional)</Label>
                  <Textarea
                    id="desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Brief agenda or equipment requirements (projector, VC link)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBooking.isPending}>
                  {createBooking.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isAdmin ? 'Confirm & Book Hall' : 'Submit Request for Approval'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status & Schedule Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-2 overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Building className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" /> Current Status
            </CardTitle>
            <CardDescription>Real-time occupancy of the main conference hall</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div
              className={`text-5xl font-black uppercase tracking-widest ${
                currentStatus.status === 'Vacant' ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {currentStatus.status}
            </div>
            {currentStatus.status === 'Busy' && currentStatus.booking && (
              <div className="mt-4 text-center animate-in fade-in slide-in-from-bottom-4 bg-white/80 p-4 rounded-xl border border-rose-100 shadow-sm max-w-md w-full">
                <p className="text-base font-semibold text-slate-900">{currentStatus.booking.title}</p>
                <p className="text-xs text-slate-500 flex items-center justify-center gap-1 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(currentStatus.booking.start_time), 'h:mm a')} -{' '}
                  {format(new Date(currentStatus.booking.end_time), 'h:mm a')}
                </p>
                {currentStatus.booking.requester && (
                  <p className="text-xs font-medium mt-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
                    Organized by {currentStatus.booking.requester.first_name} {currentStatus.booking.requester.last_name}
                  </p>
                )}
              </div>
            )}
            {currentStatus.status === 'Vacant' && (
              <p className="text-xs text-muted-foreground mt-3">
                The hall is currently free for scheduled sessions.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600" /> Today's Schedule
            </CardTitle>
            <CardDescription>{format(now, 'EEEE, MMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            {todaysBookings.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No approved bookings for today.
              </div>
            ) : (
              <div className="space-y-3 divide-y">
                {todaysBookings.map((booking) => (
                  <div key={booking.id} className="pt-3 first:pt-0 flex items-start gap-3">
                    <div className="w-1.5 h-9 bg-indigo-500 rounded-full mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{booking.title}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {format(new Date(booking.start_time), 'h:mm a')} - {format(new Date(booking.end_time), 'h:mm a')}
                      </p>
                      {booking.requester && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          By {booking.requester.first_name} {booking.requester.last_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin / Management Approval Section */}
      {(isAdmin || isManager) && (
        <Card className="border-amber-200 bg-amber-50/20 shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Pending Booking Requests
                {pendingRequests.length > 0 && (
                  <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5">
                    {pendingRequests.length} Pending
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-amber-800/80">
                Review and approve meeting hall booking requests from employees.
              </CardDescription>
            </div>
            {isAdmin && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs">
                Admin Sign-off Authority
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-xs text-slate-500 py-3">No pending booking requests at the moment. All caught up!</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-amber-200 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-900 text-sm">{req.title}</h4>
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-300 text-[10px]">
                          Pending
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1 mb-3">
                        <p>
                          <strong>Requested By:</strong> {req.requester?.first_name || 'Staff'} {req.requester?.last_name || ''}
                        </p>
                        <p>
                          <strong>Date:</strong> {format(new Date(req.start_time), 'MMM d, yyyy')}
                        </p>
                        <p>
                          <strong>Time:</strong> {format(new Date(req.start_time), 'h:mm a')} -{' '}
                          {format(new Date(req.end_time), 'h:mm a')}
                        </p>
                        {req.description && (
                          <p className="text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100">
                            "{req.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t mt-auto">
                      <Button
                        size="sm"
                        variant="success"
                        className="flex-1 h-8 text-xs font-semibold"
                        onClick={() => handleUpdateStatus(req.id, 'Approved')}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-8 text-xs font-semibold"
                        onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                        disabled={updateStatus.isPending}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Bookings / My Requests Table */}
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-slate-600" /> All Meeting Hall Bookings
            </CardTitle>
            <CardDescription className="text-xs">Schedule overview and past booking history.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {bookings.length === 0 ? (
            <EmptyState title="No bookings" description="Book the meeting hall using the button above." icon={Building} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-3">Meeting Title</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Organized By</th>
                    <th className="px-4 py-3">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{b.title}</p>
                        {b.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{b.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {format(new Date(b.start_time), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600 text-xs">
                        {format(new Date(b.start_time), 'h:mm a')} - {format(new Date(b.end_time), 'h:mm a')}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {b.requester ? `${b.requester.first_name} ${b.requester.last_name}` : 'Staff'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={b.status === 'Approved' ? 'success' : b.status === 'Pending' ? 'warning' : 'destructive'}
                          className="text-xs font-semibold"
                        >
                          {b.status}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteBooking.mutate(b.id)}
                            title="Delete booking"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


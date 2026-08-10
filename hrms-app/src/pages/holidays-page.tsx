import { useState } from 'react'
import { parseISO } from 'date-fns'
import { CalendarDays, Plus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { Calendar, type CalendarDayMarker } from '@/components/ui/calendar'
import { useHolidays, useCreateHoliday, useDeleteHoliday } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate } from '@/lib/format'

export default function HolidaysPage() {
  const { isManager } = useAuth()
  const year = new Date().getFullYear()
  const { data: holidays = [], isLoading } = useHolidays(year)
  const create = useCreateHoliday()
  const del = useDeleteHoliday()

  const [dialog, setDialog] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [optional, setOptional] = useState(false)

  const markers: CalendarDayMarker[] = holidays.map((h) => ({
    date: parseISO(h.date),
    className: 'bg-warning/20 font-semibold text-warning',
    dotClassName: h.is_optional ? 'bg-muted-foreground' : 'bg-warning',
    title: h.name,
  }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !date) return
    await create.mutateAsync({ name: name.trim(), date, is_optional: optional })
    setDialog(false)
    setName(''); setDate(''); setOptional(false)
  }

  return (
    <div>
      <PageHeader
        title="Holidays"
        description={`Company holidays for ${year}.`}
        actions={
          isManager ? (
            <Button onClick={() => setDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Holiday
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-0">
              <Calendar markers={markers} />
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Upcoming Holidays</h2>
            {holidays.length === 0 ? (
              <EmptyState title="No holidays" description="No holidays scheduled for this year." icon={CalendarDays} />
            ) : (
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={h.is_optional ? 'secondary' : 'warning'}>{h.is_optional ? 'Optional' : 'Holiday'}</Badge>
                      {isManager && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete holiday?</AlertDialogTitle>
                              <AlertDialogDescription>Remove "{h.name}" from the holiday calendar?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(h.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
            <DialogDescription>Schedule a company holiday.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Holiday name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Republic Day" required />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Optional holiday</p>
                <p className="text-xs text-muted-foreground">Employees may choose to work on this day.</p>
              </div>
              <Switch checked={optional} onCheckedChange={setOptional} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

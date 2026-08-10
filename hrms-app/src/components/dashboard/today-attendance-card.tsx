import { Clock, Coffee, LogIn, LogOut, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime, formatHours, hoursBetween } from '@/lib/format'
import { useTodayAttendance, useCheckIn, useCheckOut, useSetBreak } from '@/hooks/use-queries'

interface TodayAttendanceCardProps {
  employeeId: string
  className?: string
}

export function TodayAttendanceCard({ employeeId, className }: TodayAttendanceCardProps) {
  const { data: records = [], isLoading } = useTodayAttendance(employeeId)
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const setBreak = useSetBreak()

  const record = records.find((r) => r.employee_id === employeeId)
  const isCheckedIn = Boolean(record?.check_in)
  const isCheckedOut = Boolean(record?.check_out)
  const onBreak = Boolean(record?.break_in) && !Boolean(record?.break_out)

  const busy = checkIn.isPending || checkOut.isPending || setBreak.isPending

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Today's Attendance
        </CardTitle>
        {isCheckedIn && (
          <Badge variant={onBreak ? 'warning' : isCheckedOut ? 'secondary' : 'success'}>
            {isCheckedOut ? 'Checked out' : onBreak ? 'On break' : 'On shift'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="mt-1 text-lg font-semibold">{formatTime(record?.check_in)}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Break</p>
                <p className="mt-1 text-lg font-semibold">
                  {record?.break_in ? (record.break_out ? formatHours(hoursBetween(record.break_in, record.break_out)) : 'Active') : '—'}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="mt-1 text-lg font-semibold">{formatTime(record?.check_out)}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-xs text-muted-foreground">Worked</p>
                <p className="mt-1 text-lg font-semibold">{formatHours(record?.working_hours ?? hoursBetween(record?.check_in, null))}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => checkIn.mutate(employeeId)} disabled={isCheckedIn || busy} className="flex-1">
                <LogIn className="mr-2 h-4 w-4" /> Check In
              </Button>
              <Button
                variant="outline"
                onClick={() => setBreak.mutate({ employeeId, action: onBreak ? 'out' : 'in' })}
                disabled={!isCheckedIn || isCheckedOut || busy}
                className="flex-1"
              >
                <Coffee className="mr-2 h-4 w-4" /> {onBreak ? 'End Break' : 'Start Break'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => checkOut.mutate(employeeId)}
                disabled={!isCheckedIn || isCheckedOut || busy}
                className="flex-1"
              >
                <LogOut className="mr-2 h-4 w-4" /> Check Out
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

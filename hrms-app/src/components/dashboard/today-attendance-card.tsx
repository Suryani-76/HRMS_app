import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Clock,
  LogOut,
  Loader2,
  ScanFace,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  MapPin,
  Navigation,
  RefreshCw,
  ExternalLink,
  Layers,
  Laptop,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTime, formatHours } from '@/lib/format'
import { useTodayAttendance, useCheckIn, useCheckOut, useEmployee } from '@/hooks/use-queries'
import { FaceIdVerificationModal } from '@/components/attendance/face-id-verification-modal'
import { LocationDetailDialog } from '@/components/attendance/location-detail-dialog'
import { getStoredFaceProfile, type FaceVerificationResult, type FaceBiometricData } from '@/lib/face-biometrics'
import {
  getCurrentGeoLocation,
  getNetworkIpLocation,
  watchLocationPermission,
  parseGpsFromNotes,
  type GeoLocationData,
} from '@/lib/geo-tracking'
import {
  parseAttendanceSessions,
  calculateCumulativeLoginHours,
} from '@/lib/attendance-sessions'
import { useLaptopAutoCheckout } from '@/lib/laptop-auto-checkout'

interface TodayAttendanceCardProps {
  employeeId: string
  className?: string
}

export function TodayAttendanceCard({ employeeId, className }: TodayAttendanceCardProps) {
  const { data: records = [], isLoading } = useTodayAttendance(employeeId)
  const { data: employee } = useEmployee(employeeId)
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const { simulateAutoCheckout } = useLaptopAutoCheckout(employeeId)

  const [faceModalOpen, setFaceModalOpen] = useState(false)
  const [faceModalAction, setFaceModalAction] = useState<'check-in' | 'check-out'>('check-in')
  const [storedProfile, setStoredProfile] = useState<FaceBiometricData | null>(null)

  // Live timer tick for active on-shift duration update
  const [currentTime, setCurrentTime] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Real-time GPS Location Tracking state
  const [currentLocation, setCurrentLocation] = useState<GeoLocationData | null>(null)
  const [locating, setLocating] = useState(false)
  const [, setLocationError] = useState<string | null>(null)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [dialogLocation, setDialogLocation] = useState<any>(null)
  const [, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')

  const refreshLocation = useCallback(async () => {
    setLocating(true)
    setLocationError(null)
    try {
      const loc = await getCurrentGeoLocation()
      setCurrentLocation(loc)
    } catch (err: any) {
      console.warn('GPS location acquisition error:', err)
      try {
        const fallback = await getNetworkIpLocation()
        setCurrentLocation(fallback)
      } catch {
        setLocationError(err?.message || 'Unable to detect GPS position.')
      }
    } finally {
      setLocating(false)
    }
  }, [])

  // Auto-acquire GPS position on card mount and watch permission status
  useEffect(() => {
    refreshLocation()
    const unwatch = watchLocationPermission((status) => {
      setPermissionState(status)
      if (status === 'granted') {
        refreshLocation()
      }
    })
    return () => unwatch()
  }, [refreshLocation])

  // Sync stored Face ID profile
  useEffect(() => {
    if (employeeId) {
      setStoredProfile(getStoredFaceProfile(employeeId))
    }

    const handleProfileUpdate = (e: any) => {
      if (e?.detail?.employeeId === employeeId) {
        setStoredProfile(e.detail.profile)
      }
    }

    window.addEventListener('face-id-profile-updated', handleProfileUpdate)
    return () => {
      window.removeEventListener('face-id-profile-updated', handleProfileUpdate)
    }
  }, [employeeId])

  const record = records.find((r) => r.employee_id === employeeId)
  const isCheckedIn = Boolean(record?.check_in)
  const isCheckedOut = Boolean(record?.check_out)
  const isOnShift = isCheckedIn && !isCheckedOut
  const isAutoCheckedOut = Boolean(
    record?.notes?.includes('Auto-Checkout') ||
    record?.notes?.includes('Laptop closed')
  )

  const busy = checkIn.isPending || checkOut.isPending

  // Parse sessions across multiple check-in / check-outs today
  const sessions = useMemo(() => {
    return parseAttendanceSessions(
      record?.notes,
      record?.check_in,
      record?.check_out,
      record?.working_hours
    )
  }, [record?.notes, record?.check_in, record?.check_out, record?.working_hours])

  // Cumulative login hours calculation across every session today
  const { totalHours, sessionCount } = useMemo(() => {
    return calculateCumulativeLoginHours(sessions, record?.check_in, isCheckedOut)
  }, [sessions, record?.check_in, isCheckedOut, currentTime])

  const handleOpenFaceModal = (action: 'check-in' | 'check-out') => {
    setFaceModalAction(action)
    setFaceModalOpen(true)
    refreshLocation()
  }

  const handleFaceVerified = async (result: FaceVerificationResult, verifiedLocation?: GeoLocationData | null) => {
    const locPayload = verifiedLocation || currentLocation || undefined

    const biometricPayload = {
      method: 'FACE_ID' as const,
      confidence: result.confidence,
      token: result.token,
      snapshotUrl: result.snapshotDataUrl,
    }

    if (faceModalAction === 'check-in') {
      await checkIn.mutateAsync({
        employeeId,
        biometric: biometricPayload,
        location: locPayload,
      })
    } else {
      await checkOut.mutateAsync({
        employeeId,
        biometric: biometricPayload,
        location: locPayload,
      })
    }
  }

  const faceVerifiedNotes = record?.notes?.includes('Face ID')
  const punchLocation = parseGpsFromNotes(record?.notes)

  const handleOpenLocationDialog = (loc: any) => {
    setDialogLocation({
      ...loc,
      employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'Employee',
    })
    setLocationDialogOpen(true)
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Today's Attendance
            </CardTitle>
            <Badge
              variant="outline"
              className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-normal ${
                storedProfile
                  ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30'
                  : 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/30'
              }`}
            >
              <ScanFace className="h-3 w-3" />
              {storedProfile ? 'Face ID Enrolled' : 'Face Setup Required'}
            </Badge>

            {/* Live GPS Status Pill in Header */}
            <Badge
              variant="outline"
              className={`hidden md:inline-flex items-center gap-1 text-[11px] font-normal cursor-pointer ${
                currentLocation
                  ? currentLocation.isOfficeLocation
                    ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-slate-300 text-slate-500'
              }`}
              onClick={() => currentLocation && handleOpenLocationDialog(currentLocation)}
              title={currentLocation ? 'Click to inspect GPS details' : 'GPS locating'}
            >
              <Navigation className={`h-3 w-3 ${locating ? 'animate-spin text-indigo-500' : 'text-emerald-500'}`} />
              {locating
                ? 'Acquiring GPS...'
                : currentLocation
                ? `${currentLocation.city || 'GPS Active'} (${currentLocation.isOfficeLocation ? 'On-site' : 'Remote'})`
                : 'GPS Standby'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {isCheckedIn ? (
              <Badge
                variant={isCheckedOut ? 'secondary' : 'success'}
                className="font-medium"
              >
                {isCheckedOut ? (isAutoCheckedOut ? 'Auto Checked out' : 'Checked out') : 'On shift'}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs font-normal">
                Not checked in
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Laptop Lid Auto Check-Out Status & Test Banner (Armed when on shift) */}
              {isOnShift && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs text-indigo-950 dark:text-indigo-200">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0">
                      <Laptop className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold flex items-center gap-1.5">
                        Laptop Auto Check-Out:
                        <Badge className="bg-emerald-600 text-white border-0 text-[10px] px-1.5 py-0">
                          Active &amp; Armed
                        </Badge>
                      </span>
                      <p className="text-[11px] text-indigo-700/90 dark:text-indigo-300/80">
                        If your laptop is closed or asleep for half an hour (30m) without checking out, you will be automatically checked out.
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => simulateAutoCheckout()}
                    className="h-7 px-2.5 text-[11px] border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/70 font-semibold cursor-pointer shrink-0"
                    title="Simulate 30 minutes of laptop lid being closed"
                  >
                    ⚡ Test 30m Auto-Checkout
                  </Button>
                </div>
              )}

              {/* Auto Checked Out Notice */}
              {isAutoCheckedOut && isCheckedOut && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-950 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
                      <Laptop className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="font-bold flex items-center gap-1.5">
                        Automatic Check-Out Recorded
                        <Badge className="bg-amber-600 text-white border-0 text-[10px] px-1.5 py-0">
                          Laptop Closed &gt;30m
                        </Badge>
                      </span>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        System automatically checked you out because the laptop remained closed for over half an hour.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* First-time enrollment alert if face not scanned in the beginning */}
              {!storedProfile && !isCheckedIn && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Initial Face Scan Required:</strong> Scan and store your face details first. Future check-ins will verify your identity and track login hours.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenFaceModal('check-in')}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-semibold gap-1.5 shadow-sm"
                  >
                    <ScanFace className="h-3.5 w-3.5" /> Initial Face Scan & Store
                  </Button>
                </div>
              )}

              {/* Attendance metrics (Check-in | Check-out | Sessions | Total Login Hours) */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* 1. Check-In Time */}
                <div className="rounded-lg border p-3 text-center relative overflow-hidden bg-card">
                  <p className="text-xs text-muted-foreground">
                    {sessions.length > 1 && isOnShift ? `Current Check-in` : `Check-in`}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{formatTime(record?.check_in)}</p>
                  {faceVerifiedNotes && record?.check_in && (
                    <div className="mt-1 flex items-center justify-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="h-3 w-3" /> Face Matched
                    </div>
                  )}
                </div>

                {/* 2. Check-Out Time */}
                <div className="rounded-lg border p-3 text-center bg-card">
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="mt-1 text-lg font-semibold">
                    {isCheckedOut ? (
                      formatTime(record?.check_out)
                    ) : isOnShift ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center justify-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Active on Shift
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                  {faceVerifiedNotes && isCheckedOut && record?.check_out && (
                    <div className="mt-1 flex items-center justify-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="h-3 w-3" /> Face Matched
                    </div>
                  )}
                </div>

                {/* 3. Login Sessions Count */}
                <div className="rounded-lg border p-3 text-center bg-card">
                  <p className="text-xs text-muted-foreground">Login Sessions</p>
                  <p className="mt-1 text-lg font-semibold flex items-center justify-center gap-1 text-foreground">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    {sessionCount === 0 ? '—' : `${sessionCount} ${sessionCount === 1 ? 'Session' : 'Sessions'}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {isOnShift ? `Session ${sessionCount} Active` : isCheckedOut ? 'All sessions closed' : 'Not started'}
                  </p>
                </div>

                {/* 4. Total Cumulative Login Hours */}
                <div className="rounded-lg border p-3 text-center bg-card border-primary/20">
                  <p className="text-xs text-muted-foreground">Calculated Login Hours</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {formatHours(totalHours)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sessions.length > 1
                      ? `Sum of ${sessions.length} sessions`
                      : isOnShift
                      ? 'Live tracking'
                      : 'Total login time'}
                  </p>
                </div>
              </div>

              {/* Multi-Session Breakdown Strip (Shows when employee logged in & out multiple times today) */}
              {sessions.length > 1 && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/80 text-xs space-y-2">
                  <div className="flex items-center justify-between font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Session Hours Breakdown ({sessions.length} check-ins today)
                    </span>
                    <span className="text-primary font-bold">Sum Total: {formatHours(totalHours)}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {sessions.map((s, idx) => {
                      const isActive = !s.checkOut
                      const sessionDuration = isActive
                        ? Math.max(0, (Date.now() - new Date(s.checkIn).getTime()) / 36e5)
                        : s.hours

                      return (
                        <div
                          key={idx}
                          className={`p-2 rounded-md border flex items-center justify-between ${
                            isActive
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                              : 'bg-background border-border text-foreground'
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-xs block">
                              Session {idx + 1}
                              {isActive && (
                                <Badge variant="outline" className="ml-1.5 text-[9px] py-0 px-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                                  Active
                                </Badge>
                              )}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatTime(s.checkIn)} → {s.checkOut ? formatTime(s.checkOut) : 'Now'}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-xs">
                              {formatHours(sessionDuration)}
                            </span>
                            {isActive && <span className="block text-[9px] text-emerald-500">Live</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Verified Punch Location Banner (if check-in has GPS data) */}
              {punchLocation && record?.check_in && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        Punch Location Tracked
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        >
                          {punchLocation.mode || 'On-site'}
                        </Badge>
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {punchLocation.locationName} {punchLocation.accuracy ? `(±${punchLocation.accuracy}m)` : ''}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenLocationDialog(punchLocation)}
                    className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-xs gap-1"
                  >
                    <ExternalLink className="h-3 w-3" /> View Map
                  </Button>
                </div>
              )}

              {/* Live Real-time GPS Tracking Info Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Navigation className={`h-3.5 w-3.5 ${locating ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                      Live Location Tracking:
                      {currentLocation ? (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {currentLocation.address || `${currentLocation.city || 'Location Identified'}, ${currentLocation.state || ''}`}
                        </span>
                      ) : locating ? (
                        <span className="text-slate-400 italic">Detecting device GPS...</span>
                      ) : (
                        <span className="text-amber-500">Standby (click refresh to verify)</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {currentLocation && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] py-0 px-1.5 ${
                        currentLocation.isOfficeLocation
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-300 bg-emerald-500/10'
                          : 'border-amber-500/40 text-amber-600 dark:text-amber-300 bg-amber-500/10'
                      }`}
                    >
                      {currentLocation.isOfficeLocation ? 'HQ Office' : 'Remote'} (±{currentLocation.accuracy}m)
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refreshLocation}
                    disabled={locating}
                    className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                    title="Refresh GPS location"
                  >
                    <RefreshCw className={`h-3 w-3 ${locating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Punch Buttons — Clean Check In & Check Out Only */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => handleOpenFaceModal('check-in')}
                  disabled={isOnShift || busy}
                  className={`flex-1 font-semibold text-white shadow-sm transition-all py-5 ${
                    storedProfile
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  <ScanFace className="mr-2 h-4 w-4" />
                  {storedProfile
                    ? isCheckedOut
                      ? 'Face ID Check In Again'
                      : 'Face ID Check In'
                    : 'Initial Face Scan & Check In'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleOpenFaceModal('check-out')}
                  disabled={!isOnShift || busy}
                  className="flex-1 font-semibold border hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-300 transition-colors py-5"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Face ID Check Out
                </Button>
              </div>

              {/* Biometric verification banner */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className={`h-3.5 w-3.5 ${storedProfile ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span>
                    {storedProfile
                      ? 'Face ID & GPS tracking active: biometric match & geolocation verified on punch.'
                      : 'Initial face scan required before biometric check-in can be authorized.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenFaceModal(isOnShift ? 'check-out' : 'check-in')}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0 font-medium"
                >
                  <UserCheck className="h-3 w-3" />
                  {storedProfile ? 'Manage Stored Face' : 'Enroll Face ID'}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Face ID Biometric Verification Modal */}
      {employee && (
        <FaceIdVerificationModal
          open={faceModalOpen}
          onOpenChange={setFaceModalOpen}
          action={faceModalAction}
          employee={{
            id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            employee_code: employee.employee_code || undefined,
            department_name: (employee.department as any)?.name || 'General Department',
            avatar_url: (employee as any).avatar_url || undefined,
          }}
          currentLocation={currentLocation}
          onVerified={handleFaceVerified}
        />
      )}

      {/* Interactive Location Detail Dialog */}
      <LocationDetailDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        location={dialogLocation}
      />
    </>
  )
}

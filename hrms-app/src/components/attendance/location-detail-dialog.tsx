import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, ExternalLink, Navigation, ShieldCheck, Building2, Laptop, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { OFFICE_COORDINATES } from '@/lib/geo-tracking'

export interface LocationDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: {
    latitude: number
    longitude: number
    locationName?: string
    address?: string
    accuracy?: number
    mode?: string
    distanceFromOfficeMeters?: number
    timestamp?: string
    employeeName?: string
  } | null
}

export function LocationDetailDialog({
  open,
  onOpenChange,
  location,
}: LocationDetailDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!location) return null

  const lat = location.latitude
  const lng = location.longitude
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
  const openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`

  const isOffice = location.mode?.toLowerCase().includes('on-site') || location.mode?.toLowerCase().includes('office')
  const coordinatesStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(coordinatesStr)
    setCopied(true)
    toast.success('GPS coordinates copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-xl">
        <DialogHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                GPS Location Tracking
                <Badge
                  variant="outline"
                  className={
                    isOffice
                      ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                      : 'border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                  }
                >
                  {isOffice ? 'On-site HQ' : 'Remote / WFH'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Verified attendance punch location for {location.employeeName || 'Employee'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Location Summary Card */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Detected Location</p>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 mt-0.5">
                  {location.address || location.locationName || 'Location Recorded'}
                </p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Navigation className="h-4 w-4" />
              </div>
            </div>

            {/* Coordinates Strip */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              <span className="text-slate-700 dark:text-slate-300">
                {coordinatesStr}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border bg-card">
              <p className="text-[11px] text-muted-foreground">Work Mode</p>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                {isOffice ? <Building2 className="h-3.5 w-3.5 text-emerald-500" /> : <Laptop className="h-3.5 w-3.5 text-amber-500" />}
                <span>{location.mode || (isOffice ? 'On-site / Office HQ' : 'Remote / WFH')}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border bg-card">
              <p className="text-[11px] text-muted-foreground">GPS Precision</p>
              <p className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                {location.accuracy ? `±${location.accuracy} meters` : 'High accuracy'}
              </p>
            </div>
          </div>

          {/* Geofence Reference */}
          <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong>Office Geofence:</strong> {OFFICE_COORDINATES.name} (Radius: {OFFICE_COORDINATES.radiusMeters}m).{' '}
              {isOffice ? 'Punch was verified within office premises.' : 'Punch was verified from an off-site/remote location.'}
            </span>
          </div>

          {/* Map Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              asChild
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs gap-1.5 shadow-sm"
            >
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> View on Google Maps
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="text-xs gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <a href={openStreetMapUrl} target="_blank" rel="noopener noreferrer">
                OpenStreetMap
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

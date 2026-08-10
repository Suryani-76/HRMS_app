import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/shared/page-header'
import { useAuth } from '@/features/auth/auth-context'
import type { Asset, AssetIncident, Employee } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TableSkeleton } from '@/components/shared/skeletons'
import { StatusPill } from '@/components/shared/status-pill'
import { formatDate } from '@/lib/format'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AssetsPage() {
  const { isManager, employee } = useAuth()
  
  const [assets, setAssets] = useState<(Asset & { employee?: Employee })[]>([])
  const [incidents, setIncidents] = useState<(AssetIncident & { asset?: Asset, employee?: Employee })[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [assetDialog, setAssetDialog] = useState(false)
  const [incidentDialog, setIncidentDialog] = useState(false)

  // Asset Form State
  const [type, setType] = useState('Laptop')
  const [serial, setSerial] = useState('')
  const [assignedTo, setAssignedTo] = useState('')

  // Incident Form State
  const [incidentAssetId, setIncidentAssetId] = useState('')
  const [incidentType, setIncidentType] = useState('Lost')
  const [incidentReport, setIncidentReport] = useState('')
  
  const loadData = async () => {
    setLoading(true)
    
    // Load Assets
    let assetQuery = supabase.from('assets').select('*, employee:employees(*)')
    if (!isManager && employee) assetQuery = assetQuery.eq('assigned_to', employee.id)
    const { data: aData } = await assetQuery.order('created_at', { ascending: false })
    if (aData) setAssets(aData as any[])

    // Load Incidents
    let incidentQuery = supabase.from('asset_incidents').select('*, asset:assets(*), employee:employees(*)')
    if (!isManager && employee) incidentQuery = incidentQuery.eq('employee_id', employee.id)
    const { data: iData } = await incidentQuery.order('created_at', { ascending: false })
    if (iData) setIncidents(iData as any[])

    // Load Employees for assignment
    if (isManager) {
      const { data: eData } = await supabase.from('employees').select('*')
      if (eData) setEmployees(eData as Employee[])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [isManager, employee])

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('assets').insert({
      type,
      serial_number: serial || null,
      assigned_to: assignedTo || null,
      status: 'Active',
      assigned_at: assignedTo ? new Date().toISOString() : null
    })
    
    if (error) toast.error('Failed to create asset')
    else {
      toast.success('Asset created')
      setAssetDialog(false)
      loadData()
    }
  }

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incidentAssetId) return
    const asset = assets.find(a => a.id === incidentAssetId)
    if (!asset || !asset.assigned_to) return

    let penalty = 0
    if (incidentType === 'Lost' && asset.type === 'ID Card') {
      const prevLosses = incidents.filter(i => i.employee_id === asset.assigned_to && i.incident_type === 'Lost' && i.asset?.type === 'ID Card').length
      if (prevLosses === 0) penalty = 500
      else if (prevLosses === 1) penalty = 700
      else penalty = 0 // HR discretion
    } else if (incidentType === 'Lost' && asset.type === 'Laptop') {
      penalty = 25000
    }

    const { error } = await supabase.from('asset_incidents').insert({
      asset_id: incidentAssetId,
      employee_id: asset.assigned_to,
      incident_type: incidentType,
      report: incidentReport,
      penalty_charge: penalty,
      status: 'Pending'
    })

    if (error) toast.error('Failed to report incident')
    else {
      toast.success('Incident reported. A penalty may be applicable.')
      // Also update asset status
      await supabase.from('assets').update({ status: incidentType }).eq('id', incidentAssetId)
      setIncidentDialog(false)
      loadData()
    }
  }

  const resolveIncident = async (incidentId: string) => {
    const { error } = await supabase.from('asset_incidents').update({ status: 'Resolved' }).eq('id', incidentId)
    if (error) toast.error('Failed to resolve')
    else {
      toast.success('Incident resolved')
      loadData()
    }
  }

  const printAcknowledgement = (incident: any) => {
    const content = `
EMPLOYEE ACKNOWLEDGEMENT
------------------------
Name: ${incident.employee?.first_name} ${incident.employee?.last_name}
Asset: ${incident.asset?.type} (${incident.asset?.serial_number})
Incident: ${incident.incident_type}
Date: ${formatDate(incident.created_at || new Date().toISOString())}
Penalty: ₹${incident.penalty_charge}

Employee Signature: ______________________
Date:               ______________________

HR Representative:  ______________________
Date:               ______________________
    `
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`<pre style="font-family: monospace; padding: 20px;">${content}</pre>`)
      win.document.close()
      setTimeout(() => win.print(), 250)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Asset Tracking" 
        description={isManager ? "Manage company assets and track incidents." : "View your assigned assets and report issues."}
      />

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Assigned Assets</TabsTrigger>
          <TabsTrigger value="incidents">Incident Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4 pt-4">
          {isManager && (
            <div className="flex justify-end">
              <Button onClick={() => setAssetDialog(true)}>Add Asset</Button>
            </div>
          )}

          {loading ? <TableSkeleton rows={5} /> : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Serial/ID</th>
                    {isManager && <th className="px-4 py-3">Assigned To</th>}
                    <th className="px-4 py-3">Assigned On</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{a.type}</td>
                      <td className="px-4 py-3">{a.serial_number || 'N/A'}</td>
                      {isManager && (
                        <td className="px-4 py-3">
                          {a.employee ? `${a.employee.first_name} ${a.employee.last_name}` : 'Unassigned'}
                        </td>
                      )}
                      <td className="px-4 py-3">{a.assigned_at ? formatDate(a.assigned_at) : '—'}</td>
                      <td className="px-4 py-3"><StatusPill status={a.status.toLowerCase()} /></td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr>
                      <td colSpan={isManager ? 5 : 4} className="text-center py-6 text-muted-foreground">No assets found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button onClick={() => setIncidentDialog(true)}>Report Incident</Button>
          </div>

          {loading ? <TableSkeleton rows={5} /> : (
            <div className="rounded-xl border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3">Asset</th>
                    {isManager && <th className="px-4 py-3">Employee</th>}
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Penalty</th>
                    <th className="px-4 py-3">Status</th>
                    {isManager && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{i.asset?.type} ({i.asset?.serial_number})</td>
                      {isManager && (
                        <td className="px-4 py-3">{i.employee?.first_name} {i.employee?.last_name}</td>
                      )}
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-semibold">{i.incident_type}</span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {i.penalty_charge === 0 && i.asset?.type === 'ID Card' && i.incident_type === 'Lost' ? 'HR Discretion' : `₹${i.penalty_charge}`}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={i.status.toLowerCase()} /></td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {(i.asset?.type === 'Laptop' || i.asset?.type === 'ID Card') && (
                              <Button size="sm" variant="secondary" onClick={() => printAcknowledgement(i)}>Print Form</Button>
                            )}
                            {i.status === 'Pending' && (
                              <Button size="sm" variant="outline" onClick={() => resolveIncident(i.id)}>Resolve</Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {incidents.length === 0 && (
                    <tr>
                      <td colSpan={isManager ? 6 : 5} className="text-center py-6 text-muted-foreground">No incidents reported.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Asset Dialog */}
      <Dialog open={assetDialog} onOpenChange={setAssetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAsset} className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Laptop">Laptop</SelectItem>
                  <SelectItem value="ID Card">ID Card</SelectItem>
                  <SelectItem value="Mobile Device">Mobile Device</SelectItem>
                  <SelectItem value="Charger">Charger</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number / Identifier</Label>
              <Input value={serial} onChange={e => setSerial(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssetDialog(false)}>Cancel</Button>
              <Button type="submit">Add Asset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog open={incidentDialog} onOpenChange={setIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Incident</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReportIncident} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Asset</Label>
              <Select value={incidentAssetId} onValueChange={setIncidentAssetId}>
                <SelectTrigger><SelectValue placeholder="Select Asset" /></SelectTrigger>
                <SelectContent>
                  {assets.filter(a => a.assigned_to === employee?.id || isManager).map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.type} - {a.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Incident Type</Label>
              <Select value={incidentType} onValueChange={setIncidentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Stolen">Stolen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report Details</Label>
              <Textarea value={incidentReport} onChange={e => setIncidentReport(e.target.value)} rows={3} placeholder="Please provide details..." />
            </div>
            <p className="text-xs text-muted-foreground border-t pt-2">
              Note: A penalty charge may be levied according to company policy for lost/damaged items.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIncidentDialog(false)}>Cancel</Button>
              <Button type="submit" variant="destructive">Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

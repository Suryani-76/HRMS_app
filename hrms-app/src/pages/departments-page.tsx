import { useState } from 'react'
import { Building2, Pencil, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import {
  useDepartments,
  useDesignations,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useCreateDesignation,
  useUpdateDesignation,
  useDeleteDesignation,
  useEmployees,
} from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import type { Department, Designation } from '@/lib/database.types'

export default function DepartmentsPage() {
  const { isManager } = useAuth()
  const { data: departments = [], isLoading } = useDepartments()
  const { data: designations = [] } = useDesignations()
  const { data: employees = [] } = useEmployees()

  const [deptDialog, setDeptDialog] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)
  const [designationDialog, setDesignationDialog] = useState(false)
  const [editingDesignation, setDesignationForm] = useState<Designation | null>(null)

  const [deptName, setDeptName] = useState('')
  const [deptCode, setDeptCode] = useState('')
  const [deptDesc, setDeptDesc] = useState('')
  const [deptHead, setDeptHead] = useState('')

  const [desigName, setDesigName] = useState('')
  const [desigDept, setDesigDept] = useState('')
  const [desigLevel, setDesigLevel] = useState('1')

  const createDept = useCreateDepartment()
  const updateDept = useUpdateDepartment()
  const deleteDept = useDeleteDepartment()
  const createDesig = useCreateDesignation()
  const updateDesig = useUpdateDesignation()
  const deleteDesig = useDeleteDesignation()

  const openDeptDialog = (dept?: Department) => {
    setEditingDept(dept ?? null)
    setDeptName(dept?.name ?? '')
    setDeptCode(dept?.code ?? '')
    setDeptDesc(dept?.description ?? '')
    setDeptHead(dept?.head_id ?? '')
    setDeptDialog(true)
  }

  const openDesigDialog = (d?: Designation) => {
    setDesignationForm(d ?? null)
    setDesigName(d?.name ?? '')
    setDesigDept(d?.department_id ?? '')
    setDesigLevel(String(d?.level ?? 1))
    setDesignationDialog(true)
  }

  const submitDept = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDept) {
      await updateDept.mutateAsync({ id: editingDept.id, input: { name: deptName, code: deptCode, description: deptDesc, head_id: deptHead } })
    } else {
      await createDept.mutateAsync({ name: deptName, code: deptCode, description: deptDesc })
    }
    setDeptDialog(false)
  }

  const submitDesig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDesignation) {
      await updateDesig.mutateAsync({ id: editingDesignation.id, input: { name: desigName, department_id: desigDept, level: Number(desigLevel) || 1 } })
    } else {
      await createDesig.mutateAsync({ name: desigName, department_id: desigDept, level: Number(desigLevel) || 1 })
    }
    setDesignationDialog(false)
  }

  const countFor = (deptId: string) => employees.filter((e) => e.department_id === deptId).length

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Organize your workforce by department and designation."
        actions={
          isManager ? (
            <>
              <Button variant="outline" onClick={() => openDesigDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Designation
              </Button>
              <Button onClick={() => openDeptDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Department
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments ({departments.length})</TabsTrigger>
          <TabsTrigger value="designations">Designations ({designations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : departments.length === 0 ? (
            <EmptyState title="No departments" description="Create your first department." icon={Building2} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((d) => (
                <Card key={d.id}>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{d.name}</CardTitle>
                        {d.code && <p className="text-xs text-muted-foreground">{d.code}</p>}
                      </div>
                    </div>
                    {isManager && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeptDialog(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete department?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the {d.name} department. Employees assigned to it will be unaffected but lose their department.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDept.mutate(d.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{d.description || 'No description provided.'}</p>
                    <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
                      <span className="font-medium">{countFor(d.id)} employees</span>
                      <span className="text-muted-foreground">
                        Head: {d.head?.first_name ? `${d.head.first_name} ${d.head.last_name}` : '—'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="designations" className="mt-4">
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : designations.length === 0 ? (
            <EmptyState title="No designations" description="Add designations to classify roles." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {designations.map((d) => (
                <Card key={d.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.department?.name ?? 'General'} · Level {d.level}
                      </p>
                    </div>
                    {isManager && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDesigDialog(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete designation?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove the {d.name} designation.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteDesig.mutate(d.id)} className="bg-destructive text-destructive-foreground">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Department dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit Department' : 'New Department'}</DialogTitle>
            <DialogDescription>Enter the department details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDept} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} required placeholder="Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={deptCode} onChange={(e) => setDeptCode(e.target.value)} placeholder="ENG" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} rows={3} />
            </div>
            {isManager && (
              <div className="space-y-2">
                <Label>Department head</Label>
                <Select value={deptHead || undefined} onValueChange={setDeptHead}>
                  <SelectTrigger><SelectValue placeholder="Select head" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeptDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createDept.isPending || updateDept.isPending}>
                {(createDept.isPending || updateDept.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDept ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Designation dialog */}
      <Dialog open={designationDialog} onOpenChange={setDesignationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDesignation ? 'Edit Designation' : 'New Designation'}</DialogTitle>
            <DialogDescription>Enter the designation details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDesig} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={desigName} onChange={(e) => setDesigName(e.target.value)} required placeholder="Senior Engineer" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={desigDept || undefined} onValueChange={setDesigDept}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Input type="number" min={1} value={desigLevel} onChange={(e) => setDesigLevel(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDesignationDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={createDesig.isPending || updateDesig.isPending}>
                {(createDesig.isPending || updateDesig.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingDesignation ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

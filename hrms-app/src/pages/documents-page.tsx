import { useMemo, useState } from 'react'
import { Download, FileText, FolderOpen, Trash2, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { TableSkeleton } from '@/components/shared/skeletons'
import { useDocuments, useUploadDocument, useDeleteDocument, useEmployees } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { formatDate, formatDateTime } from '@/lib/format'

const DOC_TYPES = ['Resume', 'ID Proof', 'Address Proof', 'Education', 'Experience Letter', 'Offer Letter', 'Contract', 'Other']

export default function DocumentsPage() {
  const { isManager, employee } = useAuth()
  const { data: documents = [], isLoading } = useDocuments()
  const { data: employees = [] } = useEmployees()
  const upload = useUploadDocument()
  const del = useDeleteDocument()

  const [dialog, setDialog] = useState(false)
  const [name, setName] = useState('')
  const [docType, setDocType] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const myDocs = useMemo(() => (employee ? documents.filter((d) => d.employee_id === employee.id) : documents), [documents, employee])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !ownerId) return
    let fileUrl: string | undefined
    let fileSize: number | undefined

    if (file) {
      const { supabase } = await import('@/lib/supabase')
      const path = `documents/${ownerId}/${Date.now()}-${file.name}`
      const { data, error } = await supabase.storage.from('documents').upload(path, file)
      if (!error && data) {
        const { data: pubUrl } = supabase.storage.from('documents').getPublicUrl(path)
        fileUrl = pubUrl.publicUrl
        fileSize = file.size
      }
    }

    await upload.mutateAsync({ employee_id: ownerId, name: name.trim(), doc_type: docType || undefined, file_url: fileUrl, file_size: fileSize })
    setDialog(false)
    setName(''); setDocType(''); setOwnerId(''); setFile(null)
  }

  const visible = isManager ? documents : myDocs

  return (
    <div>
      <PageHeader
        title="Documents"
        description={isManager ? 'Manage employee documents centrally.' : 'Your uploaded documents.'}
        actions={
          <Button onClick={() => { setOwnerId(employee?.id ?? ''); setDialog(true) }}>
            <Upload className="mr-2 h-4 w-4" /> Upload
          </Button>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : visible.length === 0 ? (
        <EmptyState title="No documents" description="Upload documents to get started." icon={FolderOpen} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => (
            <div key={d.id} className="flex flex-col rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.doc_type ?? 'Document'}{d.file_size ? ` · ${Math.round(d.file_size / 1024)} KB` : ''}
                  </p>
                </div>
              </div>
              {isManager && (
                <p className="mb-3 text-xs text-muted-foreground">
                  {d.employee?.first_name} {d.employee?.last_name} · {formatDate(d.created_at)}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between border-t pt-3">
                <span className="text-[11px] text-muted-foreground">{formatDateTime(d.created_at)}</span>
                <div className="flex gap-1">
                  {d.file_url && (
                    <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                      <a href={d.file_url} target="_blank" rel="noreferrer" aria-label="Download"><Download className="h-4 w-4" /></a>
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove "{d.name}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate(d.id)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Attach a document to an employee's record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Document name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Offer Letter" required />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={docType || undefined} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isManager && (
              <div className="space-y-2">
                <Label>Owner *</Label>
                <Select value={ownerId || undefined} onValueChange={setOwnerId}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>File (optional)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={upload.isPending}>
                {upload.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

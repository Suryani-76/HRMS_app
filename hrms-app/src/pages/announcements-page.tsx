import { useState } from 'react'
import { Megaphone, Plus, Loader2, Trash2, Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, useDepartments } from '@/hooks/use-queries'
import { useAuth } from '@/features/auth/auth-context'
import { timeAgo, formatDate } from '@/lib/format'

export default function AnnouncementsPage() {
  const { isManager } = useAuth()
  const { data: announcements = [], isLoading } = useAnnouncements()
  const { data: departments = [] } = useDepartments()
  const create = useCreateAnnouncement()
  const del = useDeleteAnnouncement()

  const [dialog, setDialog] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState('all')
  const [departmentId, setDepartmentId] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    await create.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      audience: audience === 'all' ? undefined : audience,
      department_id: audience === 'department' ? departmentId || undefined : undefined,
    })
    setDialog(false)
    setTitle(''); setContent(''); setAudience('all'); setDepartmentId('')
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Keep the team informed with company updates."
        actions={
          isManager ? (
            <Button onClick={() => setDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Announcement
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : announcements.length === 0 ? (
        <EmptyState title="No announcements" description="Share an update with the team." icon={Megaphone} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {announcements.map((a) => (
            <div key={a.id} className="flex flex-col rounded-xl border bg-card p-5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-medium">{a.title}</h3>
                    <p className="text-xs text-muted-foreground">{timeAgo(a.published_at)}</p>
                  </div>
                </div>
                {isManager && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove "{a.title}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del.mutate(a.id)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <p className="flex-1 whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
              <div className="mt-4 flex items-center gap-2 border-t pt-3">
                <Badge variant={a.audience === 'department' ? 'warning' : 'secondary'}>
                  {a.audience === 'department' ? <Building2 className="mr-1 h-3 w-3" /> : <Users className="mr-1 h-3 w-3" />}
                  {a.audience === 'department' ? a.department?.name ?? 'Department' : 'Everyone'}
                </Badge>
                {a.expires_at && <span className="text-xs text-muted-foreground">Until {formatDate(a.expires_at)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>Share an update with your team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali Office Closure" required />
            </div>
            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Write your announcement..." required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {audience === 'department' && (
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={departmentId || undefined} onValueChange={setDepartmentId}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

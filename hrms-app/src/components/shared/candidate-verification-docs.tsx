import { useState, useRef, useEffect } from 'react'
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Paperclip,
  Plus,
  XCircle,
  Check,
  X,
  Info,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  type CandidateVerificationDoc,
  type CandidateDocSubmission,
  getCandidateVerificationDocs,
  saveCandidateVerificationDocs,
  updateCandidateDocVerification,
  verifyAllCandidateDocuments,
  releaseOfferLetterForCandidate,
  revokeOfferLetterForCandidate,
} from '@/lib/api/candidatePortal'
import { formatDateTime } from '@/lib/format'

// ---------------------------------------------------------------------------
// Document Softcopy Viewer Modal
// ---------------------------------------------------------------------------

export function DocumentPreviewModal({
  open,
  onOpenChange,
  doc,
  candidateName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: CandidateVerificationDoc | null
  candidateName?: string
}) {
  if (!doc) return null

  const isImage =
    doc.fileType?.includes('image') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(doc.fileName || '')

  const isPdf =
    doc.fileType?.includes('pdf') ||
    /\.pdf$/i.test(doc.fileName || '') ||
    doc.fileData?.startsWith('data:application/pdf')

  const handleDownload = () => {
    if (!doc.fileData) {
      toast.error('Document data not available for download.')
      return
    }
    const a = document.createElement('a')
    a.href = doc.fileData
    a.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.pdf`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success(`Downloading ${doc.fileName || doc.title}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                {doc.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {candidateName ? `Candidate: ${candidateName} · ` : ''}
                {doc.fileName} {doc.fileSize ? `(${doc.fileSize})` : ''} · Uploaded:{' '}
                {doc.uploadedAt ? formatDateTime(doc.uploadedAt) : 'Recently'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="h-8 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center bg-slate-100 min-h-[350px]">
          {doc.fileData ? (
            isImage ? (
              <div className="max-h-[65vh] flex items-center justify-center">
                <img
                  src={doc.fileData}
                  alt={doc.title}
                  className="max-h-[60vh] max-w-full rounded-lg shadow-md object-contain border bg-white"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={doc.fileData}
                title={doc.title}
                className="w-full h-[65vh] rounded-lg border bg-white shadow-sm"
              />
            ) : (
              <div className="text-center p-8 bg-white rounded-xl shadow-sm border max-w-md">
                <FileCheck className="h-12 w-12 text-indigo-600 mx-auto mb-3" />
                <h4 className="font-semibold text-slate-800 text-sm mb-1">{doc.fileName}</h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Softcopy uploaded successfully. Click below to download or view with your system viewer.
                </p>
                <Button size="sm" onClick={handleDownload} className="gap-2 bg-indigo-600 text-white">
                  <Download className="h-4 w-4" /> Download Softcopy ({doc.fileSize || 'Attachment'})
                </Button>
              </div>
            )
          ) : (
            <div className="text-center p-8 text-muted-foreground text-xs">
              No softcopy preview available for this item.
            </div>
          )}
        </div>

        <DialogFooter className="p-3 border-t bg-slate-50 flex items-center justify-between sm:justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Verification Status:</span>
            <Badge
              variant={
                doc.status === 'verified'
                  ? 'success'
                  : doc.status === 'rejected'
                    ? 'destructive'
                    : 'secondary'
              }
              className="text-[11px] capitalize"
            >
              {doc.status}
            </Badge>
            {doc.adminNotes && (
              <span className="italic text-slate-500">Note: {doc.adminNotes}</span>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Candidate Document Upload Card (For Individual Document Slot)
// ---------------------------------------------------------------------------

export function CandidateDocUploadCard({
  doc,
  onFileSelect,
  onRemove,
  onPreview,
  readOnly = false,
}: {
  doc: CandidateVerificationDoc
  onFileSelect: (file: File) => void
  onRemove: () => void
  onPreview: () => void
  readOnly?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUploaded = !!doc.fileName

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size exceeds 10MB limit. Please upload a smaller file.')
        return
      }
      onFileSelect(file)
    }
    // reset so same file can be re-selected if replaced
    if (e.target) e.target.value = ''
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-200 ${
        doc.status === 'verified'
          ? 'bg-emerald-50/40 border-emerald-200 shadow-sm'
          : isUploaded
            ? 'bg-blue-50/30 border-blue-200 shadow-sm'
            : 'bg-card hover:border-slate-300'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-slate-900 leading-tight">
              {doc.title}
            </h4>
            {doc.required ? (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4 font-semibold uppercase">
                Required
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-muted-foreground">
                Optional
              </Badge>
            )}

            {doc.status === 'verified' && (
              <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0 px-1.5 h-4 gap-1 font-semibold">
                <CheckCircle2 className="h-2.5 w-2.5" /> Verified
              </Badge>
            )}
            {doc.status === 'rejected' && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5 h-4 gap-1 font-semibold">
                <XCircle className="h-2.5 w-2.5" /> Re-upload Requested
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-normal">
            {doc.description}
          </p>
        </div>

        {/* Upload Button or Uploaded File Details */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {!isUploaded ? (
            !readOnly && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold gap-1.5 border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" /> Upload Softcopy
              </Button>
            )
          ) : (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={onPreview}
                title="Preview Document"
              >
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
              {!readOnly && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={() => fileInputRef.current?.click()}
                    title="Replace with new softcopy"
                  >
                    <RefreshCw className="h-3 w-3" /> Replace
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50"
                    onClick={onRemove}
                    title="Remove attachment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Uploaded File Pill */}
      {isUploaded && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Paperclip className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-slate-800 truncate max-w-[240px] sm:max-w-[340px]">
              {doc.fileName}
            </span>
            {doc.fileSize && (
              <span className="text-[11px] text-muted-foreground">({doc.fileSize})</span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {doc.uploadedAt ? formatDateTime(doc.uploadedAt) : 'Ready'}
          </span>
        </div>
      )}

      {/* Rejection / Admin Feedback Note */}
      {doc.rejectionReason && (
        <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">HR Feedback: </span>
            {doc.rejectionReason}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Candidate Document Upload Section (Rendered in Candidate Portal)
// ---------------------------------------------------------------------------

export function CandidateDocumentUploadSection({
  candidateId,
  candidateEmail,
  candidateName,
  isExperienced = false,
  onSubmissionComplete,
}: {
  candidateId: string
  candidateEmail?: string
  candidateName: string
  isExperienced?: boolean
  onSubmissionComplete: (submission: CandidateDocSubmission) => void
}) {
  const [submission, setSubmission] = useState<CandidateDocSubmission>(() => {
    return getCandidateVerificationDocs(candidateId, candidateEmail, isExperienced)
  })

  const [previewDoc, setPreviewDoc] = useState<CandidateVerificationDoc | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addCustomOpen, setAddCustomOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDesc, setCustomDesc] = useState('')

  // Sync state if candidateId changes or external update fires
  useEffect(() => {
    const handleUpdate = () => {
      setSubmission(getCandidateVerificationDocs(candidateId, candidateEmail, isExperienced))
    }
    window.addEventListener('candidate-documents-updated', handleUpdate)
    return () => window.removeEventListener('candidate-documents-updated', handleUpdate)
  }, [candidateId, candidateEmail, isExperienced])

  const requiredDocs = submission.documents.filter((d) => d.required)
  const uploadedRequiredDocs = requiredDocs.filter((d) => !!d.fileName)
  const totalUploaded = submission.documents.filter((d) => !!d.fileName).length
  const allRequiredUploaded = requiredDocs.length > 0 && uploadedRequiredDocs.length === requiredDocs.length
  const progressPercent = requiredDocs.length > 0 ? (uploadedRequiredDocs.length / requiredDocs.length) * 100 : 100

  const handleFileSelect = (docId: string, file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const fileData = String(e.target?.result || '')
      const fileSize = `${(file.size / 1024).toFixed(1)} KB`
      const nowIso = new Date().toISOString()

      const updatedDocs = submission.documents.map((d) => {
        if (d.id === docId) {
          return {
            ...d,
            fileName: file.name,
            fileSize,
            fileType: file.type || 'application/octet-stream',
            fileData,
            uploadedAt: nowIso,
            status: 'pending' as const,
            rejectionReason: undefined,
          }
        }
        return d
      })

      const nextSubmission: CandidateDocSubmission = {
        ...submission,
        documents: updatedDocs,
      }
      setSubmission(nextSubmission)
      saveCandidateVerificationDocs(candidateId, nextSubmission, candidateEmail)
      toast.success(`Uploaded ${file.name} for ${submission.documents.find((d) => d.id === docId)?.title}`)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = (docId: string) => {
    const updatedDocs = submission.documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          fileName: undefined,
          fileSize: undefined,
          fileType: undefined,
          fileData: undefined,
          uploadedAt: undefined,
          status: 'pending' as const,
        }
      }
      return d
    })

    const nextSubmission: CandidateDocSubmission = {
      ...submission,
      documents: updatedDocs,
    }
    setSubmission(nextSubmission)
    saveCandidateVerificationDocs(candidateId, nextSubmission, candidateEmail)
    toast.info('Document attachment removed.')
  }

  const handleAddCustomDoc = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customTitle.trim()) return

    const newDoc: CandidateVerificationDoc = {
      id: `doc-custom-${Date.now()}`,
      docType: 'other',
      title: customTitle.trim(),
      description: customDesc.trim() || 'Supplementary candidate verification softcopy.',
      required: false,
      status: 'pending',
    }

    const nextSubmission: CandidateDocSubmission = {
      ...submission,
      documents: [...submission.documents, newDoc],
    }
    setSubmission(nextSubmission)
    saveCandidateVerificationDocs(candidateId, nextSubmission, candidateEmail)
    setCustomTitle('')
    setCustomDesc('')
    setAddCustomOpen(false)
    toast.success(`Added "${newDoc.title}" to your verification checklist.`)
  }

  const handleSubmitAllDocuments = async () => {
    if (!allRequiredUploaded) {
      const missing = requiredDocs.filter((d) => !d.fileName).map((d) => d.title)
      toast.error(
        `Please upload all mandatory documents before submission. Missing: ${missing.join(', ')}`
      )
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const finalSubmission: CandidateDocSubmission = {
        ...submission,
        status: 'submitted',
        submittedAt: now,
      }
      await saveCandidateVerificationDocs(candidateId, finalSubmission, candidateEmail)
      setSubmission(finalSubmission)
      toast.success(
        'All softcopy documents submitted successfully! Your documents have been sent to the HR team for verification before offer letter release.'
      )
      onSubmissionComplete(finalSubmission)
    } catch (err: any) {
      toast.error('Failed to submit documents: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmitted = submission.status === 'submitted' || submission.status === 'verified' || submission.status === 'under_review'

  return (
    <Card className="border-indigo-200 bg-gradient-to-b from-indigo-50/40 via-white to-white shadow-md">
      <CardHeader className="space-y-2 border-b pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-900">
                Pre-Offer Document Verification (Softcopy Submission)
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Employment Terms Accepted ✓ · Upload standard verification softcopies before official offer release
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSubmitted ? (
              <Badge
                variant="success"
                className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1.5 py-1 px-3 text-xs font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {submission.status === 'verified'
                  ? 'Documents Verified & Approved'
                  : 'Submitted & Under HR Verification'}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 gap-1.5 py-1 px-3 text-xs font-semibold"
              >
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Upload Required ({uploadedRequiredDocs.length}/{requiredDocs.length})
              </Badge>
            )}
          </div>
        </div>

        {/* Informational Guidance Box */}
        <div className="rounded-xl border border-indigo-100 bg-white p-3.5 text-xs text-slate-700 shadow-sm space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
            <Info className="h-4 w-4 text-indigo-600" />
            Mandatory Company Pre-Onboarding Compliance:
          </div>
          <p className="text-slate-600 leading-relaxed">
            As per standard corporate employment procedure, please provide softcopies (PDF, JPG, PNG) of your
            identity, taxation, education, and previous employment credentials. The HR and Admin teams will
            review these documents against your application before releasing your official appointment letter.
          </p>
        </div>

        {/* Progress Tracker */}
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>Mandatory Document Checklist Progress</span>
            <span className="font-semibold text-indigo-700">
              {uploadedRequiredDocs.length} of {requiredDocs.length} Completed ({Math.round(progressPercent)}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Document Checklist Cards */}
        <div className="grid gap-3.5">
          {submission.documents.map((doc) => (
            <CandidateDocUploadCard
              key={doc.id}
              doc={doc}
              onFileSelect={(file) => handleFileSelect(doc.id, file)}
              onRemove={() => handleRemoveFile(doc.id)}
              onPreview={() => setPreviewDoc(doc)}
            />
          ))}
        </div>

        {/* Add Additional Document Option */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs text-slate-700 hover:text-indigo-600 gap-1.5"
            onClick={() => setAddCustomOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add Additional Certificate or Document
          </Button>

          <span className="text-xs text-muted-foreground">
            Total files attached: <strong>{totalUploaded}</strong>
          </span>
        </div>

        {/* Submit Documents CTA */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-sm text-indigo-950">
              {isSubmitted ? 'Softcopy Documents Submitted' : 'Ready to Submit Documents?'}
            </h4>
            <p className="text-xs text-slate-600">
              {isSubmitted
                ? `Submitted on ${formatDateTime(submission.submittedAt || new Date().toISOString())}. You can still view or replace files if requested by HR.`
                : 'Once submitted, your softcopies will be forwarded to HR & Admin. Upon HR verification, your official offer letter will be released.'}
            </p>
          </div>

          <Button
            type="button"
            onClick={handleSubmitAllDocuments}
            disabled={!allRequiredUploaded || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-10 px-5 shadow-md shrink-0 gap-2"
          >
            {isSubmitting ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : isSubmitted ? (
              <Check className="h-4 w-4" />
            ) : (
              <FileCheck className="h-4 w-4" />
            )}
            {isSubmitted ? 'Update / Re-Submit Documents' : 'Submit Softcopies for HR Verification →'}
          </Button>
        </div>
      </CardContent>

      {/* Add Custom Document Dialog */}
      <Dialog open={addCustomOpen} onOpenChange={setAddCustomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Supplementary Verification Document</DialogTitle>
            <DialogDescription>
              Upload any extra certificates, portfolios, or references requested by the recruiter.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomDoc} className="space-y-4">
            <div className="space-y-2">
              <Label>Document Name / Title *</Label>
              <Input
                placeholder="e.g. AWS Certification, Post Graduate Diploma, Address Proof"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Professional Cloud Architect Certificate credentials."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddCustomOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!customTitle.trim()}>
                Add Document Slot
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Softcopy Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        doc={previewDoc}
        candidateName={candidateName}
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Submitted Documents Summary Card (Shown above Offer Letter once submitted)
// ---------------------------------------------------------------------------

export function SubmittedDocumentsStatusCard({
  submission,
  candidateName,
  onOpenManage,
}: {
  submission: CandidateDocSubmission
  candidateName: string
  onOpenManage: () => void
}) {
  const [previewDoc, setPreviewDoc] = useState<CandidateVerificationDoc | null>(null)
  const uploadedDocs = submission.documents.filter((d) => !!d.fileName)
  const isVerified = submission.status === 'verified'

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold shadow-sm ${
              isVerified ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
            }`}
          >
            {isVerified ? <CheckCircle2 className="h-5 w-5" /> : <FileCheck className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900">
                Pre-Offer Verification Documents: {uploadedDocs.length} Softcopies Attached
              </h4>
              <Badge
                variant={isVerified ? 'success' : 'secondary'}
                className="text-[11px] font-semibold"
              >
                {isVerified ? 'Verified & Approved' : 'Submitted & Under HR Verification'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Softcopies submitted on{' '}
              {submission.submittedAt ? formatDateTime(submission.submittedAt) : 'Recently'}. Visible in HR &amp; Admin portals.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
          onClick={onOpenManage}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Manage / View Uploads
        </Button>
      </div>

      {/* Quick Softcopy Pills */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-200/60">
        {uploadedDocs.map((doc) => (
          <button
            key={doc.id}
            type="button"
            onClick={() => setPreviewDoc(doc)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-2xs"
          >
            <Paperclip className="h-3 w-3 text-slate-400" />
            <span className="font-medium truncate max-w-[150px]">{doc.title}</span>
            {doc.status === 'verified' && <Check className="h-3 w-3 text-emerald-600" />}
          </button>
        ))}
      </div>

      {/* Document Softcopy Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        doc={previewDoc}
        candidateName={candidateName}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Candidate Documents Admin Viewer (Rendered in HR & Admin Portal)
// ---------------------------------------------------------------------------

export function CandidateDocumentsAdminViewer({
  candidate,
  isExperienced = false,
}: {
  candidate: any
  isExperienced?: boolean
}) {
  const candidateId = candidate.id || candidate.candidate_id
  const candidateEmail = candidate.email
  const candidateNotes = candidate.notes

  const [submission, setSubmission] = useState<CandidateDocSubmission>(() => {
    return getCandidateVerificationDocs(candidateId, candidateEmail, isExperienced, candidateNotes)
  })

  const [previewDoc, setPreviewDoc] = useState<CandidateVerificationDoc | null>(null)
  const [rejectDialogDoc, setRejectDialogDoc] = useState<CandidateVerificationDoc | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isReleasingOffer, setIsReleasingOffer] = useState(false)

  useEffect(() => {
    setSubmission(getCandidateVerificationDocs(candidateId, candidateEmail, isExperienced, candidateNotes))
  }, [candidateId, candidateEmail, isExperienced, candidateNotes])

  const uploadedDocs = submission.documents.filter((d) => !!d.fileName)
  const verifiedDocs = uploadedDocs.filter((d) => d.status === 'verified')

  const handleVerifyOne = async (docId: string) => {
    const updated = await updateCandidateDocVerification(
      candidateId,
      docId,
      'verified',
      'Verified by HR/Admin',
      'HR Admin',
      candidateEmail
    )
    setSubmission(updated)
    toast.success('Document marked as verified.')
  }

  const handleOpenReject = (doc: CandidateVerificationDoc) => {
    setRejectDialogDoc(doc)
    setRejectReason(doc.rejectionReason || '')
  }

  const handleConfirmReject = async () => {
    if (!rejectDialogDoc) return
    const updated = await updateCandidateDocVerification(
      candidateId,
      rejectDialogDoc.id,
      'rejected',
      rejectReason.trim() || 'Re-upload requested by HR.',
      'HR Admin',
      candidateEmail
    )
    setSubmission(updated)
    setRejectDialogDoc(null)
    setRejectReason('')
    toast.warning('Document marked for re-upload.')
  }

  const handleVerifyAll = async () => {
    if (uploadedDocs.length === 0) {
      toast.error('No uploaded documents available to verify.')
      return
    }
    const updated = await verifyAllCandidateDocuments(candidateId, 'HR Admin', candidateEmail)
    setSubmission(updated)
    toast.success('All candidate verification softcopies verified and approved!')
  }

  const handleReleaseOffer = async () => {
    setIsReleasingOffer(true)
    try {
      const updated = await releaseOfferLetterForCandidate(candidateId, 'HR Admin', candidateEmail)
      setSubmission(updated)
      toast.success(
        `Official Offer Letter released to ${candidate.name}! It is now visible and unlocked in the Candidate Portal.`
      )
    } catch (e: any) {
      toast.error('Failed to release offer letter: ' + e?.message)
    } finally {
      setIsReleasingOffer(false)
    }
  }

  const handleRevokeOffer = async () => {
    try {
      const updated = await revokeOfferLetterForCandidate(candidateId, 'HR Admin', candidateEmail)
      setSubmission(updated)
      toast.info(`Offer letter release revoked for ${candidate.name}. It is now locked in candidate portal.`)
    } catch (e: any) {
      toast.error('Failed to revoke offer letter: ' + e?.message)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Pre-Offer Verification Documents (Softcopies)
            </h4>
            <p className="text-xs text-muted-foreground">
              Candidate: <strong>{candidate.name}</strong> · Status:{' '}
              <span className="capitalize font-semibold text-slate-800">{submission.status}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={
              submission.status === 'verified'
                ? 'success'
                : uploadedDocs.length > 0
                  ? 'default'
                  : 'secondary'
            }
            className="text-xs font-semibold"
          >
            {submission.status === 'verified'
              ? 'All Verified ✓'
              : `${verifiedDocs.length}/${uploadedDocs.length} Verified`}
          </Badge>

          {uploadedDocs.length > 0 && submission.status !== 'verified' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyAll}
              className="h-8 text-xs gap-1 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve &amp; Verify All
            </Button>
          )}
        </div>
      </div>

      {/* Offer Letter Release Status & Gate Banner */}
      {submission.offerReleased ? (
        <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 p-4 shadow-2xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-emerald-950">
                    Official Offer Letter Released to Candidate ✓
                  </h5>
                  <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] py-0 px-2 h-4 font-semibold">
                    Live in Candidate Portal
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Released by <strong>{submission.offerReleasedBy || 'HR Admin'}</strong> on{' '}
                  {submission.offerReleasedAt ? formatDateTime(submission.offerReleasedAt) : 'Recently'}. The candidate can now view, download, and accept the offer letter.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleRevokeOffer}
              className="h-7 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-50 font-medium"
            >
              Revoke / Hold Offer
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-slate-900">
                    Offer Letter Gated &amp; Pending HR Release
                  </h5>
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px] py-0 px-2 h-4 font-semibold">
                    Offer Letter Hidden from Candidate
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {uploadedDocs.length > 0
                    ? `Candidate has uploaded ${uploadedDocs.length} verification softcopies. Review them below and click to release the official offer letter.`
                    : 'Candidate has not submitted softcopies yet. Once submitted, review and release the offer letter.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleReleaseOffer}
              disabled={isReleasingOffer}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm px-4"
            >
              {isReleasingOffer ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Approve Documents &amp; Release Offer Letter
            </Button>
          </div>
        </div>
      )}

      {/* Document List */}
      {uploadedDocs.length === 0 ? (
        <div className="p-6 text-center border rounded-xl border-dashed bg-slate-50">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-semibold text-slate-700">No Softcopy Documents Uploaded Yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            The candidate has not submitted pre-offer verification documents from their portal yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {submission.documents.map((doc) => {
            const hasFile = !!doc.fileName
            return (
              <div
                key={doc.id}
                className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  doc.status === 'verified'
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : doc.status === 'rejected'
                      ? 'bg-red-50/40 border-red-200'
                      : hasFile
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-slate-50/40 border-dashed text-muted-foreground'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{doc.title}</span>
                    {doc.required && (
                      <span className="text-[10px] text-red-600 font-bold uppercase">(Mandatory)</span>
                    )}
                    <Badge
                      variant={
                        doc.status === 'verified'
                          ? 'success'
                          : doc.status === 'rejected'
                            ? 'destructive'
                            : hasFile
                              ? 'secondary'
                              : 'outline'
                      }
                      className="text-[10px] py-0 px-1.5 h-4 capitalize"
                    >
                      {hasFile ? doc.status : 'Pending Upload'}
                    </Badge>
                  </div>
                  {hasFile ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      <span className="font-mono text-slate-800">{doc.fileName}</span>
                      {doc.fileSize && <span>({doc.fileSize})</span>}
                      {doc.uploadedAt && <span>· {formatDateTime(doc.uploadedAt)}</span>}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{doc.description}</p>
                  )}
                  {doc.adminNotes && (
                    <p className="text-[11px] text-slate-500 italic">HR Note: {doc.adminNotes}</p>
                  )}
                </div>

                {hasFile && (
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-slate-300 hover:bg-slate-100"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="h-3 w-3" /> View Softcopy
                    </Button>

                    {doc.status !== 'verified' ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => handleVerifyOne(doc.id)}
                      >
                        <Check className="h-3 w-3" /> Verify
                      </Button>
                    ) : (
                      <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 px-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                      </span>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => handleOpenReject(doc)}
                      title="Request re-upload"
                    >
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectDialogDoc} onOpenChange={(open) => !open && setRejectDialogDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Document Re-upload</DialogTitle>
            <DialogDescription>
              Specify what is incorrect or illegible so the candidate can re-upload{' '}
              <strong>{rejectDialogDoc?.title}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Feedback / Reason for Rejection *</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Please provide a clear, full-page scanned copy. The current softcopy is blurry."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogDoc(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim()}
              onClick={handleConfirmReject}
            >
              Send Re-upload Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Softcopy Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        doc={previewDoc}
        candidateName={candidate.name}
      />
    </div>
  )
}

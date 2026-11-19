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
  clearAllCandidateDocuments,
} from '@/lib/api/candidatePortal'
import { supabase } from '@/lib/supabase'
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

  const handleFileSelect = async (docId: string, file: File) => {
    const docTitle = submission.documents.find((d) => d.id === docId)?.title || 'document'
    const cleanCandId = candidateId || 'temp'
    const ext = file.name.split('.').pop() || 'pdf'
    const storagePath = `${cleanCandId}/${docId}-${Date.now()}.${ext}`

    toast.loading(`Uploading ${file.name}...`, { id: `upload-${docId}` })

    let remoteFileUrl: string | undefined = undefined

    // 1. Upload to Supabase Storage candidate-documents bucket
    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('candidate-documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('candidate-documents')
          .getPublicUrl(uploadData.path)
        remoteFileUrl = publicUrlData?.publicUrl
      } else if (uploadErr) {
        console.warn('Storage bucket candidate-documents upload warning, attempting CANDIDATE-DOCS:', uploadErr)
        // Fallback check for case sensitivity
        const { data: fallbackData } = await supabase.storage
          .from('CANDIDATE-DOCS')
          .upload(storagePath, file, { upsert: true })
        if (fallbackData?.path) {
          const { data: pUrl } = supabase.storage
            .from('CANDIDATE-DOCS')
            .getPublicUrl(fallbackData.path)
          remoteFileUrl = pUrl?.publicUrl
        }
      }
    } catch (sErr) {
      console.warn('Supabase storage upload error:', sErr)
    }

    const fileSize = `${(file.size / 1024).toFixed(1)} KB`
    const nowIso = new Date().toISOString()

    // 2. Read lightweight thumbnail or use remote URL directly
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64Data = String(e.target?.result || '')
      // Prefer clean cloud URL so database write is tiny & shared with HRMS
      const effectiveDataUrl = remoteFileUrl || base64Data

      const updatedDocs = submission.documents.map((d) => {
        if (d.id === docId) {
          return {
            ...d,
            fileName: file.name,
            fileSize,
            fileType: file.type || 'application/octet-stream',
            fileData: effectiveDataUrl,
            fileUrl: remoteFileUrl || effectiveDataUrl,
            uploadedAt: nowIso,
            status: 'pending' as const,
            rejectionReason: undefined,
          }
        }
        return d
      })

      const nextSubmission: CandidateDocSubmission = {
        ...submission,
        status: submission.status === 'draft' ? 'submitted' : submission.status,
        submittedAt: submission.submittedAt || nowIso,
        documents: updatedDocs,
      }
      setSubmission(nextSubmission)
      saveCandidateVerificationDocs(candidateId, nextSubmission, candidateEmail)

      toast.dismiss(`upload-${docId}`)
      toast.success(
        remoteFileUrl
          ? `Uploaded ${file.name} to cloud for ${docTitle}!`
          : `Uploaded ${file.name} for ${docTitle}`
      )
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = async (docId: string) => {
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
          adminNotes: undefined,
        }
      }
      return d
    })

    const hasAnyDocsLeft = updatedDocs.some((d) => !!d.fileName)
    const nextSubmission: CandidateDocSubmission = {
      ...submission,
      status: hasAnyDocsLeft ? submission.status : 'draft',
      offerReleased: hasAnyDocsLeft ? submission.offerReleased : false,
      documents: updatedDocs,
    }
    setSubmission(nextSubmission)
    await saveCandidateVerificationDocs(candidateId, nextSubmission, candidateEmail)
    toast.info('Document attachment removed.')
  }

  const handleClearAllFiles = async () => {
    try {
      const reset = await clearAllCandidateDocuments(candidateId, candidateEmail, isExperienced)
      setSubmission(reset)
      onSubmissionComplete?.(reset)
      toast.success('All documents cleared! Please upload your fresh softcopies.')
    } catch (err: any) {
      toast.error('Failed to reset documents: ' + (err?.message || 'Unknown error'))
    }
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
                Upload standard verification softcopies for HR review and profile verification
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

        {/* Add Additional Document Option & Clear/Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-slate-700 hover:text-indigo-600 gap-1.5"
              onClick={() => setAddCustomOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Add Additional Certificate or Document
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
              onClick={handleClearAllFiles}
              title="Remove all uploaded softcopies and reset checklist"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear All Documents (Make Empty)
            </Button>
          </div>

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
                : 'Once submitted, your softcopies will be forwarded to HR & Admin. Upon HR verification, you will receive company Terms & Conditions to accept, followed by your official offer letter.'}
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
  const uploadedDocs = (submission.documents || []).filter((d) => !!d.fileName)
  const isVerified = submission.status === 'verified' && uploadedDocs.length > 0

  if (uploadedDocs.length === 0) {
    return null
  }

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
  onVerifiedChange,
}: {
  candidate: any
  isExperienced?: boolean
  onVerifiedChange?: () => void
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

  useEffect(() => {
    // 1. Initial synchronous load from cache / memory
    const initial = getCandidateVerificationDocs(candidateId, candidateEmail, isExperienced, candidateNotes)
    setSubmission(initial)

    // 2. Direct database fetch to guarantee latest softcopies if uploaded by candidate
    let isMounted = true
    async function fetchLatestFromDb() {
      try {
        if (!candidateId) return
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId)
        let query = supabase.from('candidates').select('notes, resume_url, updated_at')
        if (isUuid) {
          query = query.eq('id', candidateId)
        } else if (candidateEmail) {
          query = query.eq('email', candidateEmail)
        } else {
          return
        }

        const { data, error } = await query.maybeSingle()
        if (!error && data && data.notes && isMounted) {
          const fresh = getCandidateVerificationDocs(candidateId, candidateEmail, isExperienced, data.notes)
          // If fresh has uploaded files or status, update state and local cache
          // Preserve verified status if currently verified!
          if (submission.status === 'verified') {
            fresh.status = 'verified'
          }
          if (fresh.documents.some((d) => !!d.fileName) || fresh.status !== 'draft') {
            setSubmission(fresh)
            saveCandidateVerificationDocs(candidateId, fresh, candidateEmail)
          }
        }
      } catch (err) {
        console.warn('Could not fetch candidate docs from db:', err)
      }
    }

    fetchLatestFromDb()

    // 3. Listen for real-time document upload events
    const handleDocUpdate = (event: any) => {
      const detail = event?.detail
      if (detail && (detail.candidateId === candidateId || detail.email === candidateEmail)) {
        if (detail.submission && isMounted) {
          setSubmission(detail.submission)
        }
      }
    }

    window.addEventListener('candidate-documents-updated', handleDocUpdate)
    return () => {
      isMounted = false
      window.removeEventListener('candidate-documents-updated', handleDocUpdate)
    }
  }, [candidateId, candidateEmail, isExperienced, candidateNotes])

  const uploadedDocs = submission.documents.filter((d) => !!d.fileName)
  const verifiedDocs = uploadedDocs.filter((d) => d.status === 'verified')

  const isDocsVerified = submission.status === 'verified'
  const hasTermsAgreed = !!submission.termsAgreedAt || ['offer sent', 'offered', 'hired'].includes((candidate.status || '').toLowerCase())

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
    if (updated.status === 'verified') {
      onVerifiedChange?.()
    }
    toast.success('Document marked as verified and approved.')
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
    toast.warning('Document marked as rejected. Candidate will be asked to re-upload.')

    // Send email alert to candidate about document rejection / re-upload request
    try {
      if (candidateEmail) {
        import('@/lib/api/email').then(({ sendCandidateStatusAlertEmail }) => {
          sendCandidateStatusAlertEmail({
            candidateName: candidate.name || 'Candidate',
            candidateEmail: candidateEmail,
            referenceId: candidate.reference_id || candidate.temp_id || candidate.id?.slice(0, 8)?.toUpperCase(),
            jobTitle: candidate.job_opening?.title || 'Open Position',
            status: 'Action Required: Re-upload Verification Documents',
            reason: `Your submitted document "${rejectDialogDoc.title}" requires re-upload. Note: ${rejectReason.trim()}`,
          }).catch((err) => console.warn('Docs reject email notice:', err))
        })
      }
    } catch (e) {
      console.warn('sendCandidateStatusAlertEmail trigger error:', e)
    }
  }

  const handleVerifyAll = async () => {
    const updated = await verifyAllCandidateDocuments(candidateId, 'HR Admin', candidateEmail)
    setSubmission(updated)

    // Ensure database candidate record is directly updated with verified status and tag
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId)
      let query = supabase.from('candidates').select('notes, status')
      if (isUuid) {
        query = query.eq('id', candidateId)
      } else if (candidateEmail) {
        query = query.eq('email', candidateEmail)
      }

      const { data: cand } = await query.maybeSingle()
      if (cand) {
        const cleanNotes = (cand.notes || '')
          .replace(/\[DOCS_VERIFIED:\s*(true|false)\]/gi, '')
          .trim()
        const newNotes = cleanNotes ? `${cleanNotes}\n[DOCS_VERIFIED: true]` : '[DOCS_VERIFIED: true]'
        const updatePayload: Record<string, any> = {
          notes: newNotes,
          updated_at: new Date().toISOString(),
        }
        if (!cand.status?.toLowerCase().includes('offer') && cand.status !== 'hired') {
          updatePayload.status = 'Documents Verified'
        }
        await supabase
          .from('candidates')
          .update(updatePayload)
          .eq(isUuid ? 'id' : 'email', isUuid ? candidateId : candidateEmail)
      }
    } catch (err) {
      console.warn('DB candidate verify update note:', err)
    }

    // Direct local cross-tab dispatch
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('candidate-documents-updated', {
          detail: { candidateId, email: candidateEmail, submission: updated, status: 'verified' },
        })
      )
    }

    onVerifiedChange?.()
    toast.success('Profile and verification documents approved! Terms & Conditions is now unlocked.')

    // Send email alert to candidate about documents approved
    try {
      if (candidateEmail) {
        import('@/lib/api/email').then(({ sendDocsApprovedAlertEmail }) => {
          sendDocsApprovedAlertEmail({
            candidateName: candidate.name || 'Candidate',
            candidateEmail: candidateEmail,
            referenceId: candidate.reference_id || candidate.temp_id || candidate.id?.slice(0, 8)?.toUpperCase(),
            jobTitle: candidate.job_opening?.title || 'Open Position',
          }).catch((err) => console.warn('Docs approved email notice:', err))
        })
      }
    } catch (e) {
      console.warn('sendDocsApprovedAlertEmail trigger error:', e)
    }
  }

  const handleRejectAll = async () => {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateId)
      let query = supabase.from('candidates').select('notes, status')
      if (isUuid) {
        query = query.eq('id', candidateId)
      } else if (candidateEmail) {
        query = query.eq('email', candidateEmail)
      }

      const { data: cand } = await query.maybeSingle()
      if (cand) {
        const cleanNotes = (cand.notes || '')
          .replace(/\[DOCS_VERIFIED:\s*(true|false)\]/gi, '')
          .trim()
        const newNotes = cleanNotes ? `${cleanNotes}\n[DOCS_REJECTED: true]` : '[DOCS_REJECTED: true]'
        await supabase
          .from('candidates')
          .update({
            status: 'Rejected',
            notes: newNotes,
            updated_at: new Date().toISOString(),
          })
          .eq(isUuid ? 'id' : 'email', isUuid ? candidateId : candidateEmail)
      }
      const rejectedSubmission: CandidateDocSubmission = {
        ...submission,
        status: 'rejected',
      }
      setSubmission(rejectedSubmission)
      saveCandidateVerificationDocs(candidateId, rejectedSubmission, candidateEmail)
      toast.error(`Candidate profile rejected. Status updated to Rejected.`)

      // Send status email alert
      if (candidateEmail) {
        import('@/lib/api/email').then(({ sendCandidateStatusAlertEmail }) => {
          sendCandidateStatusAlertEmail({
            candidateName: candidate.name || 'Candidate',
            candidateEmail: candidateEmail,
            referenceId: candidate.reference_id || candidate.temp_id || candidate.id?.slice(0, 8)?.toUpperCase(),
            jobTitle: candidate.job_opening?.title || 'Open Position',
            status: 'Rejected',
            reason: 'Document verification was unsuccessful or documents did not meet criteria.',
          }).catch((err) => console.warn('Docs rejected candidate status email notice:', err))
        })
      }
    } catch (err) {
      console.warn('DB candidate reject error:', err)
      toast.error('Failed to update candidate status to rejected.')
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
            className={`text-xs font-semibold ${
              submission.status === 'verified'
                ? 'bg-emerald-600 text-white'
                : submission.status === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-800'
            }`}
          >
            {submission.status === 'verified'
              ? 'Status: Approved ✓'
              : submission.status === 'rejected'
                ? 'Status: Rejected ✗'
                : 'Status: Pending Review'}
          </Badge>

          {/* Quick Approve / Reject Profile Buttons for HR */}
          <Button
            size="sm"
            onClick={handleVerifyAll}
            className={`h-8 text-xs gap-1 font-semibold shadow-2xs ${
              submission.status === 'verified'
                ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Approve Profile
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRejectAll}
            className="h-8 text-xs gap-1 border-red-300 text-red-700 bg-red-50 hover:bg-red-100 font-semibold shadow-2xs"
          >
            <XCircle className="h-3.5 w-3.5" /> Reject Profile
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (window.confirm(`Reset and remove all verification files for ${candidate.name}? The candidate will be requested to upload fresh documents.`)) {
                try {
                  const reset = await clearAllCandidateDocuments(candidateId, candidateEmail, isExperienced)
                  setSubmission(reset)
                  toast.success(`Removed all documents for ${candidate.name}. Candidate can now upload fresh files.`)
                } catch (e: any) {
                  toast.error('Failed to reset candidate documents: ' + e.message)
                }
              }
            }}
            className="h-8 text-xs gap-1 border-slate-300 text-slate-700 hover:bg-slate-100 font-medium shadow-2xs"
            title="Clear all uploaded softcopies and request candidate to upload again"
          >
            <Trash2 className="h-3.5 w-3.5" /> Reset Docs
          </Button>
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
          </div>
        </div>
      ) : !isDocsVerified ? (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-slate-900">
                    Step 1: Document Verification Required
                  </h5>
                  <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px] py-0 px-2 h-4 font-semibold">
                    Awaiting HR Document Approval
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {uploadedDocs.length > 0
                    ? `Candidate has uploaded ${uploadedDocs.length} verification softcopies. Review them below and click "Approve Documents" to unlock Terms & Conditions for the candidate.`
                    : 'Candidate has not submitted softcopies yet. Once submitted, review and approve their documents.'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleVerifyAll}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-sm px-4"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve &amp; Verify Documents
            </Button>
          </div>
        </div>
      ) : !hasTermsAgreed ? (
        <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Clock className="h-5 w-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-amber-950">
                    Step 2: Documents Approved ✓ · Awaiting Candidate Terms &amp; Conditions
                  </h5>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] py-0 px-2 h-4 font-semibold">
                    Terms Pending Candidate Acceptance
                  </Badge>
                </div>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Documents have been verified and approved. The Terms &amp; Conditions section is now unlocked in the candidate&apos;s portal. Once the candidate accepts the terms, HR will provide the offer letter from the Offers section.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-xs text-emerald-950">
                    Terms &amp; Conditions Accepted ✓
                  </h5>
                  <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2 h-4 font-semibold">
                    Terms Digitally Accepted
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Candidate has digitally accepted the Company Terms &amp; Conditions {submission.termsAgreedAt ? `on ${formatDateTime(submission.termsAgreedAt)}` : ''}. The offer letter can now be generated and issued from the Offers section.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="grid gap-2.5">
        <div className="flex items-center justify-between pb-1 border-b text-xs text-slate-500 font-medium">
          <span>Verification Checklist ({uploadedDocs.length}/{submission.documents.length} Uploaded)</span>
          <span>{verifiedDocs.length} Verified</span>
        </div>

        {submission.documents.map((doc) => {
          const hasFile = !!doc.fileName
          return (
            <div
              key={doc.id}
              className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                doc.status === 'verified'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : doc.status === 'rejected'
                    ? 'bg-red-50/40 border-red-200'
                    : hasFile
                      ? 'bg-indigo-50/30 border-indigo-200'
                      : 'bg-slate-50/50 border-dashed border-slate-200 text-muted-foreground'
              }`}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-semibold ${hasFile ? 'text-slate-900' : 'text-slate-600'}`}>{doc.title}</span>
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
                    className={`text-[10px] py-0 px-2 h-4.5 capitalize font-medium ${
                      doc.status === 'verified'
                        ? 'bg-emerald-600 text-white'
                        : doc.status === 'rejected'
                          ? 'bg-red-600 text-white'
                          : hasFile
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {hasFile ? (doc.status === 'verified' ? 'Approved ✓' : doc.status === 'rejected' ? 'Rejected ✗' : 'Uploaded (Pending Review)') : 'Awaiting Upload'}
                  </Badge>
                </div>

                {hasFile ? (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      <Paperclip className="h-3 w-3 text-slate-400" />
                      {doc.fileName}
                    </span>
                    {doc.fileSize && <span>({doc.fileSize})</span>}
                    {doc.uploadedAt && <span>· Uploaded: {formatDateTime(doc.uploadedAt)}</span>}
                    {doc.verifiedBy && doc.status === 'verified' && (
                      <span className="text-emerald-700 font-medium">· Verified by {doc.verifiedBy}</span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">{doc.description}</p>
                )}

                {doc.adminNotes && (
                  <div className={`text-[11px] px-2.5 py-1 rounded-md border mt-1 ${
                    doc.status === 'rejected'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <strong>HR Note:</strong> {doc.adminNotes}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {hasFile ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>

                    {doc.status !== 'verified' ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                        onClick={() => handleVerifyOne(doc.id)}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs text-emerald-800 bg-emerald-50 border-emerald-200 font-semibold cursor-default"
                        disabled
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Approved
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
                      onClick={() => handleOpenReject(doc)}
                      title="Request document re-upload with note"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground italic px-2 py-1">
                      No softcopy attached
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

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

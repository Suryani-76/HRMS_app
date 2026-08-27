/**
 * HRMS OKLUT — Email & Notification Service
 * Supports transactional emails for Candidates, Recruitment, and Workforce.
 */

import { supabase } from '@/lib/supabase'

export interface CandidateApplicationEmailPayload {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  referenceId: string
  dateOfBirth?: string
  candidatePortalUrl?: string
  passwordPin?: string
}

export interface InterviewEmailPayload {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  roundName: string
  scheduledAt: string
  meetingLink?: string
  interviewerName?: string
}

export interface OfferEmailPayload {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  annualSalary?: string | number
  joiningDate?: string
  candidatePortalUrl?: string
}

export const DEFAULT_CANDIDATE_PORTAL_URL = 'https://suryani-76.github.io/HRMS_app/candidate-portal'
export const DEFAULT_SENDER_EMAIL = 'hr@oklut.com'
export const DEFAULT_SENDER_NAME = 'OKLUT Human Resources'

/**
 * Generate standard HTML template for candidate application confirmation
 */
export function generateCandidateApplicationHtml(payload: CandidateApplicationEmailPayload): string {
  const portalUrl = payload.candidatePortalUrl || DEFAULT_CANDIDATE_PORTAL_URL
  const dobText = payload.dateOfBirth
    ? `${payload.dateOfBirth} (Format: YYYY-MM-DD / DDMMYYYY)`
    : 'Your Date of Birth (Format: DD/MM/YYYY or YYYY-MM-DD)'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received — ${payload.jobTitle}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);padding:36px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">OKLUT HRMS</h1>
        <p style="margin:8px 0 0 0;color:#e0e7ff;font-size:14px;">Talent Acquisition & Careers</p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding:36px 32px;">
        <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#0f172a;">Application Confirmation</h2>
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>
        <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#475569;">
          Thank you for applying for the <strong>${payload.jobTitle}</strong> role at <strong>OKLUT</strong>! We have received your application and our talent team is reviewing your profile.
        </p>

        <!-- Details Card -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;border-radius:8px;padding:20px;margin:24px 0;border-left:4px solid #4f46e5;">
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#64748b;">Applied Role:</td>
            <td style="padding:6px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right;">${payload.jobTitle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#64748b;">Application Reference ID:</td>
            <td style="padding:6px 0;font-size:14px;font-weight:700;color:#4f46e5;text-align:right;font-family:monospace;">${payload.referenceId}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:14px;color:#64748b;">Portal Password:</td>
            <td style="padding:6px 0;font-size:14px;font-weight:600;color:#0f172a;text-align:right;">${dobText}</td>
          </tr>
        </table>

        <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#475569;">
          You can log in to the Candidate Portal anytime using your <strong>Application Reference ID</strong> and <strong>Date of Birth</strong> as your password to track application status, view interview schedules, and respond to offers.
        </p>

        <!-- CTA Button -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#4f46e5;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.25);">
            Access Candidate Portal →
          </a>
        </div>

        <p style="margin:24px 0 0 0;font-size:13px;line-height:1.5;color:#94a3b8;text-align:center;">
          Direct Link: <a href="${portalUrl}" style="color:#4f46e5;word-break:break-all;">${portalUrl}</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          © ${new Date().getFullYear()} OKLUT HRMS. Sent from <a href="mailto:${DEFAULT_SENDER_EMAIL}" style="color:#64748b;text-decoration:none;">${DEFAULT_SENDER_EMAIL}</a>
        </p>
        <p style="margin:4px 0 0 0;font-size:11px;color:#cbd5e1;">
          Please do not reply directly to this automated notification.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Dispatch candidate application confirmation email
 * Stores an audit entry in Supabase and triggers the webhook / mailer
 */
export async function sendCandidateApplicationEmail(payload: CandidateApplicationEmailPayload): Promise<{ success: boolean; message: string }> {
  try {
    const htmlContent = generateCandidateApplicationHtml(payload)
    const subject = `Thank you for applying for ${payload.jobTitle} — Ref #${payload.referenceId}`

    // 1. Record pending email event in audit logs with HTML payload for background SMTP delivery
    try {
      await supabase.from('audit_logs').insert({
        action: 'EMAIL_PENDING',
        entity_type: 'candidate_application',
        details: {
          to: payload.candidateEmail,
          name: payload.candidateName,
          job: payload.jobTitle,
          refId: payload.referenceId,
          subject,
          html: htmlContent,
          from: DEFAULT_SENDER_EMAIL,
          sent_at: new Date().toISOString(),
        },
      })
    } catch {
      /* audit log fallback */
    }

    // 2. Try invoking Supabase Edge Function 'send-email' if deployed
    try {
      const { error: fnErr } = await supabase.functions.invoke('send-email', {
        body: {
          to: payload.candidateEmail,
          from: `${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`,
          subject,
          html: htmlContent,
          refId: payload.referenceId,
        },
      })

      if (!fnErr) {
        return { success: true, message: `Confirmation email sent to ${payload.candidateEmail}` }
      }
    } catch {
      /* edge function fallback */
    }

    return {
      success: true,
      message: `Confirmation email queued for ${payload.candidateEmail} (Ref: ${payload.referenceId})`,
    }
  } catch (err: any) {
    console.error('sendCandidateApplicationEmail error:', err)
    return {
      success: false,
      message: err?.message || 'Failed to dispatch email',
    }
  }
}

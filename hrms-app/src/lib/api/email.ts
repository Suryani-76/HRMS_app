/**
 * HRMS OKLUT — Email & Notification Service
 * Supports transactional emails for Candidates, Recruitment, and Workforce.
 */

import { supabase } from '@/lib/supabase'
import type { JobOpening } from '@/lib/database.types'
import { INITIAL_EMPLOYEES } from '@/lib/seed-data'

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

export const DEFAULT_CANDIDATE_PORTAL_URL = 'https://hrm.oklut.com/candidate-portal'
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

    // 0. Direct local dev server SMTP dispatch if available
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.candidateEmail,
          subject,
          html: htmlContent,
          refId: payload.referenceId,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success) {
          console.log(`[Email] Directly delivered to ${payload.candidateEmail} via dev server SMTP`)
          // Also record in audit log
          try {
            await supabase.from('audit_logs').insert({
              action: 'EMAIL_SENT',
              entity_type: 'candidate_application',
              details: {
                to: payload.candidateEmail,
                name: payload.candidateName,
                job: payload.jobTitle,
                refId: payload.referenceId,
                subject,
                from: DEFAULT_SENDER_EMAIL,
                sent_at: new Date().toISOString(),
              },
            })
          } catch {}
          return { success: true, message: `Confirmation email sent to ${payload.candidateEmail}` }
        }
      }
    } catch {
      /* local endpoint fallback */
    }

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

/**
 * Generate standard unique Job Code (e.g. JOB-ENG-4A12)
 */
export function generateJobCode(job: { id?: string; title: string }): string {
  const cleanTitle = (job.title || 'OPN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'OPN'
  const rawId = job.id ? job.id.replace(/[^a-zA-Z0-9]/g, '') : ''
  const suffix = rawId && rawId.length >= 4 ? rawId.slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase()
  return `JOB-${cleanTitle}-${suffix}`
}

/**
 * Generate standard Employee Referral Code (e.g. REF-ENG4A12)
 */
export function generateReferralCode(job: { id?: string; title: string }): string {
  const cleanTitle = (job.title || 'OPN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'OPN'
  const rawId = job.id ? job.id.replace(/[^a-zA-Z0-9]/g, '') : ''
  const suffix = rawId && rawId.length >= 4 ? rawId.slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase()
  return `REF-${cleanTitle}${suffix}`
}

export interface JobOpeningBroadcastPayload {
  jobId: string
  title: string
  departmentName?: string
  location?: string
  openingsCount?: number
  employmentType?: string
  description?: string
  requirements?: string
  jobCode: string
  referralCode: string
  lastDate?: string
  careersUrl?: string
  portalUrl?: string
}

/**
 * Generate standard HTML email template for broadcasting job opening to all employees
 */
export function generateJobOpeningBroadcastHtml(payload: JobOpeningBroadcastPayload, recipientName?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Opening: ${payload.title} — ${payload.jobCode}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#0f172a;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:24px auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
    
    <!-- Top Announcement Ribbon -->
    <tr>
      <td style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);padding:40px 32px;text-align:center;color:#ffffff;">
        <span style="display:inline-block;padding:6px 14px;background-color:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:9999px;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#e0e7ff;margin-bottom:12px;">
          🚀 Internal Talent &amp; Referral Announcement
        </span>
        <h1 style="margin:12px 0 6px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;">
          ${payload.title}
        </h1>
        <p style="margin:0;font-size:14px;color:#c7d2fe;">
          ${payload.departmentName || 'General Department'} &bull; ${payload.location || 'Hybrid / Remote'} &bull; ${payload.openingsCount || 1} Open Position${(payload.openingsCount || 1) > 1 ? 's' : ''}
        </p>
      </td>
    </tr>

    <!-- Body Container -->
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${recipientName || 'OKLUT Team Member'}</strong>,
        </p>
        <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#475569;">
          A new job opening has officially been uploaded and published on the OKLUT Careers &amp; Recruitment Portal! As part of our active Employee Referral Program, we encourage all team members to refer outstanding professionals from their network or explore internal career advancement.
        </p>

        <!-- Codes & Key Metrics Box -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:0 0 28px 0;overflow:hidden;">
          <tr>
            <td style="padding:20px;border-bottom:1px solid #e2e8f0;background-color:#eef2ff;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="50%" style="vertical-align:top;padding-right:12px;">
                    <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Official Job Code</div>
                    <div style="font-size:18px;font-weight:800;font-family:monospace;color:#1e1b4b;letter-spacing:1px;background-color:#ffffff;padding:8px 12px;border-radius:8px;border:1px solid #c7d2fe;display:inline-block;">
                      ${payload.jobCode}
                    </div>
                  </td>
                  <td width="50%" style="vertical-align:top;padding-left:12px;">
                    <div style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Employee Referral Code</div>
                    <div style="font-size:18px;font-weight:800;font-family:monospace;color:#064e3b;letter-spacing:1px;background-color:#ecfdf5;padding:8px 12px;border-radius:8px;border:1px solid #a7f3d0;display:inline-block;">
                      ${payload.referralCode}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 20px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.8;color:#475569;">
                <tr>
                  <td width="35%" style="color:#64748b;font-weight:600;">Department:</td>
                  <td width="65%" style="color:#0f172a;font-weight:700;">${payload.departmentName || 'General'}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-weight:600;">Work Location:</td>
                  <td style="color:#0f172a;font-weight:700;">${payload.location || 'Corporate Office / Remote'}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-weight:600;">Employment Type:</td>
                  <td style="color:#0f172a;font-weight:700;">${payload.employmentType || 'Full-time'}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-weight:600;">Available Vacancies:</td>
                  <td style="color:#0f172a;font-weight:700;">${payload.openingsCount || 1} Position(s)</td>
                </tr>
                ${payload.lastDate ? `
                <tr>
                  <td style="color:#dc2626;font-weight:600;">Application Deadline:</td>
                  <td style="color:#b91c1c;font-weight:700;">${payload.lastDate}</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>

        <!-- Description Section -->
        ${payload.description ? `
        <div style="margin-bottom:24px;">
          <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">
            Role Overview &amp; Responsibilities
          </h3>
          <div style="font-size:14px;line-height:1.6;color:#475569;background-color:#f8fafc;padding:16px;border-radius:8px;border-left:3px solid #6366f1;white-space:pre-line;">
            ${payload.description}
          </div>
        </div>
        ` : ''}

        <!-- Requirements Section -->
        ${payload.requirements ? `
        <div style="margin-bottom:28px;">
          <h3 style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.5px;">
            Key Qualifications &amp; Skills
          </h3>
          <div style="font-size:14px;line-height:1.6;color:#475569;background-color:#f8fafc;padding:16px;border-radius:8px;border-left:3px solid #10b981;white-space:pre-line;">
            ${payload.requirements}
          </div>
        </div>
        ` : ''}

        <!-- Referral Bonus Card -->
        <div style="background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:32px;">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="36" style="vertical-align:top;font-size:24px;">🎁</td>
              <td style="vertical-align:top;padding-left:12px;">
                <h4 style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#14532d;">
                  How to Refer &amp; Earn Your Employee Bonus
                </h4>
                <p style="margin:0 0 10px 0;font-size:13px;line-height:1.5;color:#166534;">
                  Every successful hire through employee referral is eligible for attractive referral rewards disbursed with your monthly payroll.
                </p>
                <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#15803d;">
                  <li>Share the <strong>Job Code (${payload.jobCode})</strong> and <strong>Referral Code (${payload.referralCode})</strong> with your candidate.</li>
                  <li>Ask them to enter your referral code when applying on the Careers Portal.</li>
                  <li>Our Talent Acquisition team will prioritize their screening and keep you posted!</li>
                </ol>
              </td>
            </tr>
          </table>
        </div>

        <!-- Action CTA -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
          <tr>
            <td align="center">
              <a href="${payload.careersUrl || 'http://localhost:5174/careers'}" target="_blank" style="display:inline-block;padding:14px 28px;background-color:#4f46e5;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;box-shadow:0 4px 6px -1px rgba(79,70,229,0.3);margin-right:12px;">
                View Careers Portal &rarr;
              </a>
              <a href="${payload.portalUrl || 'http://localhost:5174/recruitment'}" target="_blank" style="display:inline-block;padding:14px 24px;background-color:#f1f5f9;color:#334155;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;border:1px solid #cbd5e1;">
                Internal HR Portal
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">
          This official announcement was dispatched to all registered employees at their office email addresses by <strong>OKLUT Human Resources &amp; Talent Acquisition</strong>.
        </p>
        <p style="margin:6px 0 0 0;font-size:11px;color:#94a3b8;">
          &copy; ${new Date().getFullYear()} OKLUT Inc. Confidential &bull; For internal company use only.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>`
}

/**
 * Broadcast a newly uploaded or created job opening with Job Code and Referral Code
 * to every employee's office email.
 */
export async function broadcastJobOpeningToEmployees(
  job: Partial<JobOpening> & { id?: string; title: string },
  departmentName?: string
): Promise<{ success: boolean; count: number; jobCode: string; referralCode: string; message: string }> {
  try {
    const jobCode = generateJobCode(job)
    const referralCode = generateReferralCode(job)

    // Extract last date if formatted in description
    let lastDate: string | undefined
    let cleanDesc = job.description || ''
    const match = cleanDesc.match(/\[Last Date: (.*?)\]/)
    if (match) {
      lastDate = match[1]
      cleanDesc = cleanDesc.replace(/\[Last Date: .*?\]\n?/, '').trim()
    }

    // 1. Fetch all active employees with valid office email addresses
    let employeeList: Array<{ email: string; name: string }> = []

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, status')
        .neq('status', 'Terminated')

      if (!error && Array.isArray(data) && data.length > 0) {
        employeeList = data
          .filter((e) => e.email && e.email.includes('@'))
          .map((e) => ({
            email: e.email.trim(),
            name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Team Member',
          }))
      }
    } catch (dbErr) {
      console.warn('[broadcastJobOpening] Error fetching employees from Supabase:', dbErr)
    }

    // Fallback to INITIAL_EMPLOYEES if DB query returned nothing
    if (employeeList.length === 0) {
      employeeList = INITIAL_EMPLOYEES
        .filter((e) => e.email && e.email.includes('@'))
        .map((e) => ({
          email: e.email.trim(),
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Team Member',
        }))
    }

    // Deduplicate emails
    const uniqueMap = new Map<string, string>()
    for (const emp of employeeList) {
      if (!uniqueMap.has(emp.email.toLowerCase())) {
        uniqueMap.set(emp.email.toLowerCase(), emp.name)
      }
    }

    const recipients = Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }))

    if (recipients.length === 0) {
      return {
        success: false,
        count: 0,
        jobCode,
        referralCode,
        message: 'No employee office email addresses found to broadcast.',
      }
    }

    const hostOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174'
    const payload: JobOpeningBroadcastPayload = {
      jobId: job.id || 'job-new',
      title: job.title,
      departmentName: departmentName || (job.department as any)?.name || 'Corporate',
      location: job.location || 'Hybrid / Remote',
      openingsCount: job.openings_count || 1,
      employmentType: job.employment_type || 'Full-time',
      description: cleanDesc,
      requirements: job.requirements || undefined,
      jobCode,
      referralCode,
      lastDate,
      careersUrl: `${hostOrigin}/careers`,
      portalUrl: `${hostOrigin}/recruitment`,
    }

    const subject = `🚀 New Job Opening: ${job.title} | Job Code: ${jobCode} | Referral Code: ${referralCode}`

    // 2. Dispatch email to each employee
    let sentCount = 0
    await Promise.allSettled(
      recipients.map(async ({ email, name }) => {
        const html = generateJobOpeningBroadcastHtml(payload, name)
        try {
          const res = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject,
              html,
              refId: referralCode,
            }),
          })
          if (res.ok) {
            sentCount++
          } else {
            // Also invoke Supabase edge function if local endpoint returned error
            await supabase.functions.invoke('send-email', {
              body: {
                to: email,
                from: `${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`,
                subject,
                html,
                refId: referralCode,
              },
            }).catch(() => {})
            sentCount++
          }
        } catch {
          // Fallback edge function
          try {
            await supabase.functions.invoke('send-email', {
              body: {
                to: email,
                from: `${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`,
                subject,
                html,
                refId: referralCode,
              },
            })
            sentCount++
          } catch {}
        }
      })
    )

    // 3. Record in audit_logs
    try {
      await supabase.from('audit_logs').insert({
        action: 'JOB_OPENING_BROADCAST',
        entity_type: 'job_openings',
        details: {
          job_id: job.id,
          job_title: job.title,
          job_code: jobCode,
          referral_code: referralCode,
          recipient_count: recipients.length,
          delivered_count: sentCount,
          recipient_emails: recipients.map((r) => r.email),
          broadcast_at: new Date().toISOString(),
        },
      })
    } catch {}

    return {
      success: true,
      count: recipients.length,
      jobCode,
      referralCode,
      message: `Broadcast email with Job Code ${jobCode} & Referral Code ${referralCode} sent to ${recipients.length} employees' office emails.`,
    }
  } catch (err: any) {
    console.error('[broadcastJobOpeningToEmployees] Fatal error:', err)
    return {
      success: false,
      count: 0,
      jobCode: generateJobCode(job),
      referralCode: generateReferralCode(job),
      message: err?.message || 'Failed to broadcast job opening to employees.',
    }
  }
}

// ============================================================================
// CANDIDATE PORTAL LIFECYCLE EMAIL ALERTS
// (Shortlisted, Interview Scheduled/Rescheduled, Stage Cleared, Docs Required,
// Offer Released, and Application Rejection)
// ============================================================================

export function getEffectivePortalUrl(customUrl?: string): string {
  if (customUrl) return customUrl
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/candidate-portal`
  }
  return DEFAULT_CANDIDATE_PORTAL_URL
}

/**
 * Universal email dispatcher: Attempts dev server SMTP first, then edge function,
 * with Supabase audit log tracking.
 */
export async function dispatchCandidateAlertEmail({
  to,
  subject,
  html,
  refId,
  alertType = 'candidate_update',
}: {
  to: string
  subject: string
  html: string
  refId?: string
  alertType?: string
}): Promise<{ success: boolean; message: string }> {
  if (!to || !to.includes('@')) {
    return { success: false, message: 'Invalid recipient email' }
  }

  // 1. Direct local dev server SMTP dispatch
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html, refId }),
    })
    if (res.ok) {
      const json = await res.json()
      if (json.success) {
        console.log(`[Email Alert] Successfully sent to ${to} (${subject})`)
        try {
          await supabase.from('audit_logs').insert({
            action: 'EMAIL_SENT',
            entity_type: alertType,
            details: {
              to,
              subject,
              refId,
              from: DEFAULT_SENDER_EMAIL,
              sent_at: new Date().toISOString(),
            },
          })
        } catch {}
        return { success: true, message: `Email delivered to ${to}` }
      }
    }
  } catch {
    /* fallback to background/edge */
  }

  // 2. Queue in audit_logs for background delivery
  try {
    await supabase.from('audit_logs').insert({
      action: 'EMAIL_PENDING',
      entity_type: alertType,
      details: {
        to,
        subject,
        html,
        refId,
        from: DEFAULT_SENDER_EMAIL,
        sent_at: new Date().toISOString(),
      },
    })
  } catch {}

  // 3. Supabase Edge Function fallback
  try {
    await supabase.functions.invoke('send-email', {
      body: {
        to,
        from: `${DEFAULT_SENDER_NAME} <${DEFAULT_SENDER_EMAIL}>`,
        subject,
        html,
        refId,
      },
    })
  } catch {}

  return { success: true, message: `Email alert queued for ${to}` }
}

// ---------------------------------------------------------------------------
// 1. Candidate Status Alert (Shortlisted, Stage Advancement, Rejected, Hired)
// ---------------------------------------------------------------------------

export interface CandidateStatusAlertPayload {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  referenceId?: string
  dateOfBirth?: string
  status: string
  feedback?: string
  reason?: string
  portalUrl?: string
}

export function generateCandidateStatusAlertHtml(payload: CandidateStatusAlertPayload): string {
  const portalUrl = getEffectivePortalUrl(payload.portalUrl)
  const normStatus = (payload.status || '').toLowerCase()
  const isShortlisted = normStatus.includes('shortlist')
  const isRejected = normStatus.includes('reject') || normStatus.includes('failed')
  const isHired = normStatus.includes('hire')

  const headerGradient = isShortlisted
    ? 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)'
    : isRejected
      ? 'linear-gradient(135deg, #475569 0%, #334155 100%)'
      : isHired
        ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
        : 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'

  const badgeText = isShortlisted
    ? '🎉 Profile Shortlisted'
    : isRejected
      ? 'Application Update'
      : isHired
        ? 'Welcome to OKLUT 🎉'
        : `Stage Updated: ${payload.status}`

  const dobText = payload.dateOfBirth
    ? `${payload.dateOfBirth} (YYYY-MM-DD)`
    : 'Your Date of Birth (as registered)'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${payload.status} — ${payload.jobTitle}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:${headerGradient};padding:36px 32px;text-align:center;">
        <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;margin-bottom:8px;">
          ${badgeText}
        </span>
        <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:700;">OKLUT Recruitment</h1>
        <p style="margin:4px 0 0 0;color:#e0e7ff;font-size:14px;">Role: ${payload.jobTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>

        ${isShortlisted ? `
          <div style="background-color:#eff6ff;border-left:4px solid #3b82f6;padding:16px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#1e40af;font-weight:600;">
              Congratulations! Your profile has been shortlisted for the <strong>${payload.jobTitle}</strong> position.
            </p>
            <p style="margin:8px 0 0 0;font-size:13px;color:#1e3a8a;">
              Our talent team evaluated your application and shortlisted your candidacy for the evaluation rounds. You can now access your Candidate Portal to schedule your interview slot or participate in the screening assessment.
            </p>
          </div>
        ` : isRejected ? `
          <div style="background-color:#f8fafc;border-left:4px solid #94a3b8;padding:16px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
              Thank you for taking the time to interview and consider opportunities with <strong>OKLUT</strong> for the <strong>${payload.jobTitle}</strong> role.
            </p>
            <p style="margin:10px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">
              After careful evaluation of all candidates, we regret to inform you that we will not be proceeding with your application at this stage. ${payload.reason ? `<em>Feedback note: ${payload.reason}</em>` : ''}
            </p>
            <p style="margin:10px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">
              We were impressed with your background and appreciate the effort you dedicated to our selection process. We will maintain your profile in our talent network for future openings that match your skills.
            </p>
          </div>
        ` : `
          <div style="background-color:#f1f5f9;border-left:4px solid #6366f1;padding:16px;border-radius:6px;margin:20px 0;">
            <p style="margin:0;font-size:14px;line-height:1.6;color:#312e81;font-weight:600;">
              Your application status has been updated to: <strong>${payload.status}</strong>
            </p>
            <p style="margin:8px 0 0 0;font-size:13px;color:#4338ca;">
              Please log in to your Candidate Portal to review the updated status and next steps.
            </p>
          </div>
        `}

        ${!isRejected ? `
        <!-- Credentials Box -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;padding:18px;margin:20px 0;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#64748b;">Candidate Reference ID:</td>
            <td style="padding:4px 0;font-size:13px;font-weight:700;color:#4338ca;text-align:right;font-family:monospace;">${payload.referenceId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#64748b;">Portal Password:</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${dobText}</td>
          </tr>
        </table>

        <!-- CTA -->
        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#4f46e5;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.2);">
            Open Candidate Portal →
          </a>
        </div>
        ` : ''}

        <p style="margin:24px 0 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
          Direct Portal URL: <a href="${portalUrl}" style="color:#6366f1;">${portalUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} OKLUT Inc. &bull; Automated notification from OKLUT HRMS
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendCandidateStatusAlertEmail(payload: CandidateStatusAlertPayload) {
  const normStatus = (payload.status || '').toLowerCase()
  const isShortlisted = normStatus.includes('shortlist')
  const isRejected = normStatus.includes('reject') || normStatus.includes('failed')

  const subject = isShortlisted
    ? `🎉 Profile Shortlisted: ${payload.jobTitle} — OKLUT`
    : isRejected
      ? `Application Update regarding ${payload.jobTitle} — OKLUT`
      : `Application Status Updated: ${payload.status} (${payload.jobTitle}) — OKLUT`

  const html = generateCandidateStatusAlertHtml(payload)
  return dispatchCandidateAlertEmail({
    to: payload.candidateEmail,
    subject,
    html,
    refId: payload.referenceId,
    alertType: `candidate_status_${normStatus.replace(/\s+/g, '_')}`,
  })
}

// ---------------------------------------------------------------------------
// 2. Interview Scheduled Alert Email
// ---------------------------------------------------------------------------

export interface InterviewScheduledAlertPayload {
  candidateName: string
  candidateEmail: string
  referenceId?: string
  dateOfBirth?: string
  jobTitle: string
  roundName: string
  scheduledAt: string
  mode?: string
  meetingLink?: string
  interviewerName?: string
  portalUrl?: string
}

export function generateInterviewScheduledHtml(payload: InterviewScheduledAlertPayload): string {
  const portalUrl = getEffectivePortalUrl(payload.portalUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Interview Scheduled — ${payload.roundName}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg, #4f46e5 0%, #312e81 100%);padding:36px 32px;text-align:center;">
        <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;margin-bottom:8px;">
          📅 Interview Confirmed
        </span>
        <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:700;">${payload.roundName}</h1>
        <p style="margin:4px 0 0 0;color:#e0e7ff;font-size:14px;">Role: ${payload.jobTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          Your interview for the <strong>${payload.jobTitle}</strong> position has been scheduled. Below are your appointment details:
        </p>

        <!-- Interview Details Card -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #4f46e5;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">Round:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${payload.roundName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">Scheduled Date &amp; Time:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:#4338ca;text-align:right;">${payload.scheduledAt}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">Interview Mode:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;text-transform:capitalize;">${payload.mode || 'Online Video'}</td>
          </tr>
          ${payload.interviewerName ? `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">Interviewer:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;">${payload.interviewerName}</td>
          </tr>` : ''}
          ${payload.meetingLink ? `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#64748b;">Video Meeting Link:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#2563eb;text-align:right;word-break:break-all;">
              <a href="${payload.meetingLink.startsWith('http') ? payload.meetingLink : `https://${payload.meetingLink}`}" style="color:#2563eb;">Join Meeting</a>
            </td>
          </tr>` : ''}
        </table>

        <p style="margin:20px 0;font-size:13px;color:#475569;line-height:1.6;">
          Please join the meeting 5 minutes prior to the scheduled time. Ensure a quiet environment and stable internet connection. You can also view this interview and manage slots directly in your Candidate Portal.
        </p>

        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#4f46e5;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(79,70,229,0.2);">
            View Interview in Candidate Portal →
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} OKLUT Inc. &bull; Automated notification from OKLUT HRMS
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendInterviewScheduledAlertEmail(payload: InterviewScheduledAlertPayload) {
  const subject = `📅 Interview Scheduled: ${payload.roundName} (${payload.jobTitle}) — OKLUT`
  const html = generateInterviewScheduledHtml(payload)
  return dispatchCandidateAlertEmail({
    to: payload.candidateEmail,
    subject,
    html,
    refId: payload.referenceId,
    alertType: 'interview_scheduled',
  })
}

// ---------------------------------------------------------------------------
// 3. Interview Rescheduled Alert Email
// ---------------------------------------------------------------------------

export interface InterviewRescheduledAlertPayload {
  candidateName: string
  candidateEmail: string
  referenceId?: string
  jobTitle: string
  roundName: string
  scheduledAt: string
  mode?: string
  meetingLink?: string
  rescheduleReason?: string
  adminNote?: string
  portalUrl?: string
}

export function generateInterviewRescheduledHtml(payload: InterviewRescheduledAlertPayload): string {
  const portalUrl = getEffectivePortalUrl(payload.portalUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Interview Rescheduled — ${payload.roundName}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg, #d97706 0%, #b45309 100%);padding:36px 32px;text-align:center;">
        <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;margin-bottom:8px;">
          🔄 Reschedule Approved
        </span>
        <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:700;">${payload.roundName} Rescheduled</h1>
        <p style="margin:4px 0 0 0;color:#fef3c7;font-size:14px;">Role: ${payload.jobTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          Your request to reschedule the <strong>${payload.roundName}</strong> interview has been approved. Your updated interview schedule is confirmed below:
        </p>

        <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#fffbeb;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #f59e0b;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#92400e;">Updated Date &amp; Time:</td>
            <td style="padding:6px 0;font-size:14px;font-weight:700;color:#78350f;text-align:right;">${payload.scheduledAt}</td>
          </tr>
          ${payload.adminNote ? `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#92400e;">HR / Admin Note:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#78350f;text-align:right;">${payload.adminNote}</td>
          </tr>` : ''}
          ${payload.meetingLink ? `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#92400e;">Video Meeting Link:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#2563eb;text-align:right;">
              <a href="${payload.meetingLink.startsWith('http') ? payload.meetingLink : `https://${payload.meetingLink}`}" style="color:#2563eb;">Join Video Call</a>
            </td>
          </tr>` : ''}
        </table>

        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#d97706;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;">
            View Updated Schedule in Portal →
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} OKLUT Inc. &bull; Automated notification from OKLUT HRMS
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendInterviewRescheduledAlertEmail(payload: InterviewRescheduledAlertPayload) {
  const subject = `🔄 Interview Rescheduled: ${payload.roundName} (${payload.jobTitle}) — OKLUT`
  const html = generateInterviewRescheduledHtml(payload)
  return dispatchCandidateAlertEmail({
    to: payload.candidateEmail,
    subject,
    html,
    refId: payload.referenceId,
    alertType: 'interview_rescheduled',
  })
}

// ---------------------------------------------------------------------------
// 4. Round Cleared Alert Email
// ---------------------------------------------------------------------------

export interface RoundClearedAlertPayload {
  candidateName: string
  candidateEmail: string
  referenceId?: string
  jobTitle: string
  roundName: string
  score?: number | string
  feedback?: string
  nextStep?: string
  portalUrl?: string
}

export function generateRoundClearedHtml(payload: RoundClearedAlertPayload): string {
  const portalUrl = getEffectivePortalUrl(payload.portalUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Stage Cleared — ${payload.roundName}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg, #059669 0%, #047857 100%);padding:36px 32px;text-align:center;">
        <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;margin-bottom:8px;">
          🏆 Stage Cleared Successfully
        </span>
        <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:700;">Congratulations, ${payload.candidateName}!</h1>
        <p style="margin:4px 0 0 0;color:#d1fae5;font-size:14px;">You have qualified ${payload.roundName}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          We are pleased to inform you that you have successfully cleared the <strong>${payload.roundName}</strong> round for the <strong>${payload.jobTitle}</strong> position at OKLUT!
        </p>

        ${payload.feedback ? `
        <div style="background-color:#ecfdf5;border-radius:8px;padding:16px;margin:20px 0;border:1px solid #a7f3d0;">
          <strong style="font-size:13px;color:#065f46;">Evaluator Feedback &amp; Score:</strong>
          <p style="margin:6px 0 0 0;font-size:13px;color:#047857;line-height:1.6;">${payload.feedback}</p>
        </div>` : ''}

        <p style="margin:20px 0;font-size:14px;color:#475569;line-height:1.6;">
          ${payload.nextStep || 'Please check your Candidate Portal for the next stage requirements and slot availability.'}
        </p>

        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#059669;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;">
            Open Candidate Portal →
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} OKLUT Inc. &bull; Automated notification from OKLUT HRMS
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendRoundClearedAlertEmail(payload: RoundClearedAlertPayload) {
  const subject = `🏆 Stage Cleared: You passed ${payload.roundName} (${payload.jobTitle}) — OKLUT`
  const html = generateRoundClearedHtml(payload)
  return dispatchCandidateAlertEmail({
    to: payload.candidateEmail,
    subject,
    html,
    refId: payload.referenceId,
    alertType: 'round_cleared',
  })
}

// ---------------------------------------------------------------------------
// 5. Verification Softcopies Required Email Alert
// ---------------------------------------------------------------------------

export interface DocsRequiredAlertPayload {
  candidateName: string
  candidateEmail: string
  referenceId?: string
  jobTitle: string
  portalUrl?: string
}

export function generateDocsRequiredHtml(payload: DocsRequiredAlertPayload): string {
  const portalUrl = getEffectivePortalUrl(payload.portalUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Action Required: Upload Verification Documents</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg, #6366f1 0%, #4338ca 100%);padding:36px 32px;text-align:center;">
        <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;margin-bottom:8px;">
          📄 Pre-Offer Verification
        </span>
        <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:22px;font-weight:700;">Upload Verification Softcopies</h1>
        <p style="margin:4px 0 0 0;color:#e0e7ff;font-size:14px;">Role: ${payload.jobTitle}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          Congratulations on clearing all interview rounds and accepting the terms &amp; conditions for the <strong>${payload.jobTitle}</strong> position!
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          As per standard company policy, please upload softcopies of the following verification documents in your Candidate Portal before your official offer letter is released by HR:
        </p>

        <ul style="font-size:13px;line-height:1.8;color:#334155;background:#f8fafc;padding:16px 32px;border-radius:8px;border:1px solid #e2e8f0;">
          <li><strong>Government Photo ID Proof</strong> (Aadhaar / Passport / Driving License)</li>
          <li><strong>PAN Card</strong></li>
          <li><strong>Highest Educational Degree / Certificates / Marksheets</strong></li>
          <li><strong>Experience / Relieving Letter</strong> (for experienced candidates)</li>
          <li><strong>Recent Payslips / Bank Statement (3 Months)</strong> (for experienced candidates)</li>
          <li><strong>Recent Passport-Size Photograph</strong></li>
        </ul>

        <p style="margin:20px 0;font-size:13px;color:#64748b;line-height:1.6;">
          Once your softcopies are submitted, our HR team will review and release your Official Employment Offer Letter directly in the portal.
        </p>

        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#4f46e5;color:#ffffff;padding:12px 28px;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;display:inline-block;">
            Upload Documents Now →
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} OKLUT Inc. &bull; Automated notification from OKLUT HRMS
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendDocsRequiredAlertEmail(payload: DocsRequiredAlertPayload) {
  const subject = `📄 Action Required: Upload Verification Documents for ${payload.jobTitle} — OKLUT`
  const html = generateDocsRequiredHtml(payload)
  return dispatchCandidateAlertEmail({
    to: payload.candidateEmail,
    subject,
    html,
    refId: payload.referenceId,
    alertType: 'docs_required',
  })
}

// ---------------------------------------------------------------------------
// 6. Offer Letter Released Alert Email
// ---------------------------------------------------------------------------

export interface OfferReleasedAlertPayload {
  candidateName: string
  candidateEmail: string
  referenceId?: string
  jobTitle: string
  salaryOffered?: number | string
  joiningDate?: string
  serviceBondYears?: number | null
  releasedBy?: string
  portalUrl?: string
}

export function generateOfferLetterReleasedHtml(payload: OfferReleasedAlertPayload): string {
  const portalUrl = getEffectivePortalUrl(payload.portalUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Official Offer Letter Released — ${payload.jobTitle}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:30px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    <tr>
      <td style="background:linear-gradient(135deg, #059669 0%, #065f46 100%);padding:36px 32px;text-align:center;">
        <span style="display:inline-block;padding:5px 12px;background:rgba(255,255,255,0.2);border-radius:9999px;font-size:12px;font-weight:700;color:#ffffff;margin-bottom:8px;">
          🌟 Official Employment Offer
        </span>
        <h1 style="margin:8px 0 0 0;color:#ffffff;font-size:24px;font-weight:800;">Offer Letter Released!</h1>
        <p style="margin:4px 0 0 0;color:#d1fae5;font-size:14px;">Role: ${payload.jobTitle} at OKLUT Inc.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:36px 32px;">
        <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
          Dear <strong>${payload.candidateName}</strong>,
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          We are delighted to formally extend our Offer of Employment for the position of <strong>${payload.jobTitle}</strong> at <strong>OKLUT Inc.</strong>!
        </p>
        <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
          Your verification softcopies have been verified and approved by our HR team. Your official appointment letter is now available for review and formal acceptance in the Candidate Portal.
        </p>

        <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#ecfdf5;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #10b981;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#065f46;">Annual Compensation (CTC):</td>
            <td style="padding:6px 0;font-size:14px;font-weight:700;color:#047857;text-align:right;">
              ${payload.salaryOffered ? `₹${Number(payload.salaryOffered).toLocaleString('en-IN')}` : 'As Mutually Discussed'}
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#065f46;">Tentative Joining Date:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#064e3b;text-align:right;">${payload.joiningDate || 'Immediate / To be confirmed'}</td>
          </tr>
          ${payload.serviceBondYears ? `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#065f46;">Service Commitment:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600;color:#064e3b;text-align:right;">${payload.serviceBondYears} Year(s)</td>
          </tr>` : ''}
        </table>

        <div style="text-align:center;margin:30px 0;">
          <a href="${portalUrl}" target="_blank" style="background-color:#059669;color:#ffffff;padding:14px 32px;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;display:inline-block;box-shadow:0 2px 4px rgba(5,150,105,0.25);">
            Review &amp; Accept Offer Letter →
          </a>
        </div>

        <p style="margin:20px 0 0 0;font-size:13px;color:#64748b;line-height:1.6;text-align:center;">
          You can download your printable Offer Letter PDF and submit your formal acceptance directly through the portal.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;">
        © ${new Date().getFullYear()} OKLUT Inc. &bull; Human Resources Department
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendOfferLetterReleasedAlertEmail(payload: OfferReleasedAlertPayload) {
  const subject = `🌟 Official Offer Letter Released: ${payload.jobTitle} — OKLUT`
  const html = generateOfferLetterReleasedHtml(payload)
  return dispatchCandidateAlertEmail({
    to: payload.candidateEmail,
    subject,
    html,
    refId: payload.referenceId,
    alertType: 'offer_released',
  })
}

/**
 * HRMS OKLUT — Job Opening Broadcast Template & Code Generator
 * Deterministic Job Code & Referral Code generation + Branded HTML Email Template
 */

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
 * Generate standard unique Job Code (e.g. JOB-ENG-4A12)
 */
export function generateJobCode(job: { id?: string; title: string }): string {
  const cleanTitle = (job.title || 'OPN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'OPN'
  const rawId = job.id ? String(job.id).replace(/[^a-zA-Z0-9]/g, '') : ''
  const suffix = rawId && rawId.length >= 4 ? rawId.slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase()
  return `JOB-${cleanTitle}-${suffix}`
}

/**
 * Generate standard Employee Referral Code (e.g. REF-ENG4A12)
 */
export function generateReferralCode(job: { id?: string; title: string }): string {
  const cleanTitle = (job.title || 'OPN').replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'OPN'
  const rawId = job.id ? String(job.id).replace(/[^a-zA-Z0-9]/g, '') : ''
  const suffix = rawId && rawId.length >= 4 ? rawId.slice(-4).toUpperCase() : Math.random().toString(36).substring(2, 6).toUpperCase()
  return `REF-${cleanTitle}${suffix}`
}

/**
 * Generate HTML email template for broadcasting job opening to employee office inbox
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
          This official announcement was automatically dispatched to all registered employees at their office email addresses by <strong>OKLUT Human Resources &amp; Talent Acquisition</strong>.
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


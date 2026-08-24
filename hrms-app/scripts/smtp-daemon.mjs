/**
 * HRMS OKLUT — Background SMTP Mailer Daemon
 * Polls audit_logs for EMAIL_PENDING records and delivers them via TLS SMTP.
 * After successful delivery, updates the row to EMAIL_SENT to prevent re-delivery.
 */

import tls from 'tls'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'kindle.herosite.pro',
  port: parseInt(process.env.SMTP_PORT || '465'),
  user: process.env.SMTP_USER || 'hr@oklut.com',
  pass: process.env.SMTP_PASS || 'Hr@oklut25$',
  fromName: 'OKLUT Human Resources',
}

const POLL_INTERVAL_MS = 15000
const MAX_RETRIES = 3

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function sendEmailTls({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(SMTP_CONFIG.port, SMTP_CONFIG.host, { rejectUnauthorized: false }, () => {
      console.log(`[SMTP] Connected to ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`)
    })

    let step = 0
    let buffer = ''
    socket.setEncoding('utf8')

    socket.on('data', (data) => {
      buffer += data
      const lines = buffer.split('\r\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line) continue
        if (line.startsWith('220') && step === 0) {
          step = 1; socket.write('EHLO localhost\r\n')
        } else if (line.startsWith('250') && step === 1) {
          step = 2; socket.write('AUTH LOGIN\r\n')
        } else if (line.startsWith('334') && step === 2) {
          step = 3; socket.write(Buffer.from(SMTP_CONFIG.user).toString('base64') + '\r\n')
        } else if (line.startsWith('334') && step === 3) {
          step = 4; socket.write(Buffer.from(SMTP_CONFIG.pass).toString('base64') + '\r\n')
        } else if (line.startsWith('235') && step === 4) {
          step = 5; socket.write(`MAIL FROM:<${SMTP_CONFIG.user}>\r\n`)
        } else if (line.startsWith('250') && step === 5) {
          step = 6; socket.write(`RCPT TO:<${to}>\r\n`)
        } else if (line.startsWith('250') && step === 6) {
          step = 7; socket.write('DATA\r\n')
        } else if (line.startsWith('354') && step === 7) {
          step = 8
          const message = [
            `From: "${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.user}>`,
            `To: <${to}>`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=utf-8`,
            ``,
            html,
            `\r\n.\r\n`
          ].join('\r\n')
          socket.write(message)
        } else if (line.startsWith('250') && step === 8) {
          step = 9; socket.write('QUIT\r\n')
        } else if (line.startsWith('221') && step === 9) {
          socket.end(); resolve({ success: true })
        } else if (line.startsWith('5') || line.startsWith('4')) {
          socket.end(); reject(new Error('SMTP Error: ' + line.trim()))
        }
      }
    })

    socket.on('error', (err) => { socket.destroy(); reject(err) })
    socket.setTimeout(30000, () => { socket.destroy(); reject(new Error('SMTP timeout')) })
  })
}

async function processPendingEmails() {
  const { data: pending, error } = await supabase
    .from('audit_logs')
    .select('id, details')
    .eq('action', 'EMAIL_PENDING')
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) { console.error('[MAILER] Fetch error:', error.message); return }
  if (!pending || pending.length === 0) return

  for (const log of pending) {
    const details = log.details || {}
    const { to, subject, html, refId } = details

    if (!to || !subject || !html) {
      console.warn(`[MAILER] Skipping log ${log.id} — missing fields`)
      await supabase.from('audit_logs').update({ action: 'EMAIL_FAILED', details: { ...details, last_error: 'Missing required fields' } }).eq('id', log.id)
      continue
    }

    if ((details.retry_count || 0) >= MAX_RETRIES) {
      await supabase.from('audit_logs').update({ action: 'EMAIL_FAILED' }).eq('id', log.id)
      continue
    }

    // *** CRITICAL: Mark as IN_PROGRESS before sending to prevent concurrent re-delivery ***
    await supabase.from('audit_logs').update({ action: 'EMAIL_IN_PROGRESS' }).eq('id', log.id)

    console.log(`[MAILER] Dispatching email to: ${to} (Ref: ${refId || 'N/A'})...`)
    try {
      await sendEmailTls({ to, subject, html })
      await supabase.from('audit_logs').update({
        action: 'EMAIL_SENT',
        details: { ...details, delivered_at: new Date().toISOString() },
      }).eq('id', log.id)
      console.log(`✅ Email delivered to ${to}`)
    } catch (err) {
      const retries = (details.retry_count || 0) + 1
      console.error(`❌ Failed to deliver to ${to}:`, err.message)
      await supabase.from('audit_logs').update({
        action: retries >= MAX_RETRIES ? 'EMAIL_FAILED' : 'EMAIL_PENDING',
        details: { ...details, retry_count: retries, last_error: err.message, last_attempt_at: new Date().toISOString() },
      }).eq('id', log.id)
    }
  }
}

async function main() {
  console.log('[MAILER] OKLUT SMTP Daemon started')
  console.log(`[MAILER] SMTP: ${SMTP_CONFIG.user}@${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`)
  console.log(`[MAILER] Poll interval: ${POLL_INTERVAL_MS / 1000}s | Max retries: ${MAX_RETRIES}`)
  await processPendingEmails()
  setInterval(processPendingEmails, POLL_INTERVAL_MS)
}

main().catch((err) => { console.error('[MAILER] Fatal error:', err); process.exit(1) })




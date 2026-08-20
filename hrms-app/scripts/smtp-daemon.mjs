/**
 * HRMS OKLUT — Background SMTP Mailer Daemon
 * Realtime listener + queue poller for candidate applications and notifications
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function sendEmailTls({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(SMTP_CONFIG.port, SMTP_CONFIG.host, { rejectUnauthorized: false }, () => {
      console.log(`[SMTP] Connected to ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`)
    })

    let step = 0
    socket.setEncoding('utf8')

    socket.on('data', (data) => {
      if (data.startsWith('220') && step === 0) {
        step = 1
        socket.write('EHLO localhost\r\n')
      } else if (data.startsWith('250') && step === 1) {
        step = 2
        socket.write('AUTH LOGIN\r\n')
      } else if (data.startsWith('334') && step === 2) {
        step = 3
        socket.write(Buffer.from(SMTP_CONFIG.user).toString('base64') + '\r\n')
      } else if (data.startsWith('334') && step === 3) {
        step = 4
        socket.write(Buffer.from(SMTP_CONFIG.pass).toString('base64') + '\r\n')
      } else if (data.startsWith('235') && step === 4) {
        step = 5
        socket.write(`MAIL FROM:<${SMTP_CONFIG.user}>\r\n`)
      } else if (data.startsWith('250') && step === 5) {
        step = 6
        socket.write(`RCPT TO:<${to}>\r\n`)
      } else if (data.startsWith('250') && step === 6) {
        step = 7
        socket.write('DATA\r\n')
      } else if (data.startsWith('354') && step === 7) {
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
      } else if (data.startsWith('250') && step === 8) {
        step = 9
        socket.write('QUIT\r\n')
      } else if (data.startsWith('221') && step === 9) {
        socket.end()
        resolve({ success: true })
      } else if (data.startsWith('5') || data.startsWith('4')) {
        socket.end()
        reject(new Error('SMTP Error: ' + data.trim()))
      }
    })

    socket.on('error', (err) => {
      socket.destroy()
      reject(err)
    })
  })
}

async function processPendingEmails() {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('action', 'EMAIL_PENDING')
      .limit(10)

    if (error || !logs || logs.length === 0) return

    for (const log of logs) {
      const { to, subject, html, refId } = log.details || {}
      if (to && html) {
        console.log(`[MAILER] Dispatching email to ${to} (Ref: ${refId})...`)
        try {
          await sendEmailTls({ to, subject, html })
          console.log(`[MAILER] Successfully delivered email to ${to}`)
          await supabase
            .from('audit_logs')
            .update({ action: 'EMAIL_DELIVERED', updated_at: new Date().toISOString() })
            .eq('id', log.id)
        } catch (err) {
          console.error(`[MAILER] Delivery failed for ${to}:`, err.message)
          await supabase
            .from('audit_logs')
            .update({ action: 'EMAIL_FAILED', details: { ...log.details, error: err.message } })
            .eq('id', log.id)
        }
      }
    }
  } catch (err) {
    console.error('[MAILER] Polling error:', err)
  }
}

console.log('🚀 OKLUT SMTP Mailer Daemon started. Listening for application emails...')
setInterval(processPendingEmails, 3000)
processPendingEmails()

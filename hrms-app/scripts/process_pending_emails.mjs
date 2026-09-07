import tls from 'tls'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qwygpcovmlobcmwcptvz.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gAOufq0KVS9ugonSUIC8cA_i5DAtaII'

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'kindle.herosite.pro',
  port: parseInt(process.env.SMTP_PORT || '465'),
  user: process.env.SMTP_USER || 'hr@oklut.com',
  pass: process.env.SMTP_PASS || 'Hr@oklut25$',
  fromName: 'OKLUT Human Resources',
}

export function sendEmailViaTls({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(SMTP_CONFIG.port, SMTP_CONFIG.host, { rejectUnauthorized: false }, () => {
      console.log(`[SMTP] Connected to ${SMTP_CONFIG.host}:${SMTP_CONFIG.port} for ${to}`)
    })

    let step = 0
    socket.setEncoding('utf8')

    socket.on('data', (data) => {
      const trimmed = data.trim()
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
        console.log(`✅ [SMTP] Successfully delivered to ${to}`)
        resolve({ success: true })
      } else if (data.startsWith('5') || data.startsWith('4')) {
        socket.end()
        reject(new Error('SMTP Error: ' + trimmed))
      }
    })

    socket.on('error', (err) => {
      socket.destroy()
      reject(err)
    })

    socket.setTimeout(25000, () => {
      socket.destroy()
      reject(new Error('SMTP Timeout'))
    })
  })
}

async function run() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?action=eq.EMAIL_PENDING&select=id,details,created_at&order=created_at.asc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    })
    const list = await res.json()
    console.log(`Found ${list.length} pending emails in audit_logs`)

    for (const item of list) {
      const { to, subject, html, refId } = item.details || {}
      if (!to || !subject || !html) continue
      try {
        console.log(`Dispatching pending email -> ${to} (Ref: ${refId || 'N/A'})...`)
        await sendEmailViaTls({ to, subject, html })
        await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({ action: 'EMAIL_SENT' })
        })
        console.log(`Updated audit_log status to EMAIL_SENT for id: ${item.id}`)
      } catch (err) {
        console.error(`Failed to send to ${to}:`, err.message)
      }
    }
    console.log('Finished processing all pending emails.')
  } catch (err) {
    console.error('Fatal runner error:', err.message)
  }
}

run()

// Supabase Edge Function: send-email
// Serves transactional emails via OKLUT SMTP (kindle.herosite.pro:465 SSL)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'kindle.herosite.pro'
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465')
const SMTP_USER = Deno.env.get('SMTP_USER') || 'hr@oklut.com'
const SMTP_PASS = Deno.env.get('SMTP_PASS') || 'Hr@oklut25$'

async function sendSmtpEmail({ to, subject, html, fromName = 'OKLUT Human Resources' }: { to: string; subject: string; html: string; fromName?: string }) {
  const conn = await Deno.connectTls({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  })

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(4096)
    const n = await conn.read(buf)
    if (n === null) return ''
    return decoder.decode(buf.subarray(0, n))
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + '\r\n'))
    return await readResponse()
  }

  // 1. Initial greeting
  await readResponse()

  // 2. EHLO
  await sendCommand('EHLO localhost')

  // 3. AUTH LOGIN
  await sendCommand('AUTH LOGIN')
  await sendCommand(btoa(SMTP_USER))
  const authRes = await sendCommand(btoa(SMTP_PASS))
  if (!authRes.startsWith('235')) {
    conn.close()
    throw new Error('SMTP Authentication Failed: ' + authRes)
  }

  // 4. MAIL FROM & RCPT TO
  await sendCommand(`MAIL FROM:<${SMTP_USER}>`)
  const rcptRes = await sendCommand(`RCPT TO:<${to}>`)
  if (!rcptRes.startsWith('250')) {
    conn.close()
    throw new Error('Recipient rejected: ' + rcptRes)
  }

  // 5. DATA
  await sendCommand('DATA')

  const message = [
    `From: "${fromName}" <${SMTP_USER}>`,
    `To: <${to}>`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
    `\r\n.`
  ].join('\r\n')

  const dataRes = await sendCommand(message)
  await sendCommand('QUIT')
  conn.close()

  if (!dataRes.startsWith('250')) {
    throw new Error('Failed to deliver message data: ' + dataRes)
  }

  return { success: true, response: dataRes }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, fromName } = await req.json()

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required parameters (to, subject, html)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await sendSmtpEmail({ to, subject, html, fromName })

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

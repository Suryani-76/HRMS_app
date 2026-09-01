import path from 'path'
import tls from 'tls'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function smtpDevPlugin(): Plugin {
  const SMTP_CONFIG = {
    host: process.env.SMTP_HOST || 'kindle.herosite.pro',
    port: parseInt(process.env.SMTP_PORT || '465'),
    user: process.env.SMTP_USER || 'hr@oklut.com',
    pass: process.env.SMTP_PASS || 'Hr@oklut25$',
    fromName: 'OKLUT Human Resources',
  }

  function sendEmailTls({ to, subject, html }: { to: string; subject: string; html: string }) {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(SMTP_CONFIG.port, SMTP_CONFIG.host, { rejectUnauthorized: false }, () => {
        console.log(`[Vite-SMTP] Connected to ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`)
      })

      let step = 0
      let buffer = ''
      socket.setEncoding('utf8')

      socket.on('data', (data: string) => {
        buffer += data
        const lines = buffer.split('\r\n')
        buffer = lines.pop() || ''
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
      socket.setTimeout(25000, () => { socket.destroy(); reject(new Error('SMTP timeout')) })
    })
  }

  return {
    name: 'vite-plugin-smtp-mailer',
    configureServer(server) {
      server.middlewares.use('/api/send-email', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => { body += chunk })
          req.on('end', async () => {
            try {
              const { to, subject, html, refId } = JSON.parse(body || '{}')
              if (!to || !subject || !html) {
                res.statusCode = 400
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: false, message: 'Missing to, subject, or html' }))
                return
              }
              console.log(`[Vite-SMTP] Dispatching candidate email to: ${to} (Ref: ${refId || 'N/A'})...`)
              await sendEmailTls({ to, subject, html })
              console.log(`✅ [Vite-SMTP] Candidate email delivered to ${to}`)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, message: `Email delivered to ${to}` }))
            } catch (err: any) {
              console.error(`❌ [Vite-SMTP] Delivery error:`, err?.message)
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, message: err?.message || 'SMTP delivery failed' }))
            }
          })
        } else {
          res.statusCode = 405
          res.end('Method Not Allowed')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), smtpDevPlugin()],
  base: process.env.NODE_ENV === 'production' ? '/HRMS_app/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
  },
  // @ts-ignore - vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
        '**/*.d.ts',
        'dist/**',
      ],
    },
  },
})

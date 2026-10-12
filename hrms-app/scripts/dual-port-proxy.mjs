import http from 'http'

const TARGET_PORT = 5174
const PROXY_PORT = 5173

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res, { end: true })
  })

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Dev server connecting on port 5174...')
  })

  req.pipe(proxyReq, { end: true })
})

// Support WebSocket proxying for Vite HMR on port 5173
server.on('upgrade', (req, socket, head) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  })

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.entries(proxyRes.headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    )
    proxySocket.pipe(socket)
    socket.pipe(proxySocket)
  })

  proxyReq.on('error', () => {
    socket.destroy()
  })

  proxyReq.end()
})

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[DualPortProxy] Active: http://localhost:${PROXY_PORT} -> http://localhost:${TARGET_PORT}`)
})

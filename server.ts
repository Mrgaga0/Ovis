import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initWebSocketServer } from './lib/websocket/server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3001', 10)

// Next.js 앱 초기화
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // HTTP 서버 생성
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // 웹소켓 서버 초기화
  initWebSocketServer(server)

  // 서버 시작
  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.NODE_ENV
      }`
    )
  })
}) 
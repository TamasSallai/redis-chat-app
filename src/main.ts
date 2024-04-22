import fastify from 'fastify'
import cors from '@fastify/cors'
import redis from '@fastify/redis'
import closeWithGrace from 'close-with-grace'
import socketIO from './plugins/socketio'
import {
  CONNECTION_COUNT_KEY,
  chatService,
  serverInstanceConnections,
} from './services/chat'

const app = fastify({ logger: true })

app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
})
app.register(redis, {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  namespace: 'pub',
})
app.register(redis, {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  namespace: 'sub',
})
app.register(socketIO)
app.register(chatService)

app.get('/healthcheck', async (request, reply) => {
  return { status: 'ok', port }
})

const host = process.env.HOST || 'localhost'
const port = parseInt(process.env.PORT || '3000')
app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})

closeWithGrace({ delay: 2000 }, async ({ signal, err }) => {
  const { redis } = app
  const publisher = redis['pub']

  console.log({ signal, err })

  if (serverInstanceConnections > 0) {
    const connectionCount = parseInt(
      (await publisher.get(CONNECTION_COUNT_KEY)) || '0'
    )

    const newCount = Math.max(connectionCount - serverInstanceConnections, 0)

    await publisher.set(CONNECTION_COUNT_KEY, newCount)
  }

  await app.close()
})

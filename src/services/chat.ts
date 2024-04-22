import { FastifyPluginAsync } from 'fastify'

export const CONNECTION_COUNT_KEY = 'chat:connection-count'
export const CONNECTION_COUNT_UPDATED_CHANNEL = 'chat:connection-count-updated'
const MESSAGE_CHANNEL = 'chat:message-channel'

// Count the clients that are connected trough this server instance
export let serverInstanceConnections = 0

export const chatService: FastifyPluginAsync = async (fastify) => {
  const { redis } = fastify
  const publisher = redis['pub']
  const subscriber = redis['sub']

  const connectionCount = await publisher.get(CONNECTION_COUNT_KEY)

  if (connectionCount === null) {
    await publisher.set(CONNECTION_COUNT_KEY, 0)
  }

  fastify.io.on('connect', async (socket) => {
    const incrResult = await publisher.incr(CONNECTION_COUNT_KEY)
    serverInstanceConnections++
    await publisher.publish(
      CONNECTION_COUNT_UPDATED_CHANNEL,
      String(incrResult)
    )

    socket.on('send-message', async (message) => {
      await publisher.publish(MESSAGE_CHANNEL, String(message))
    })

    socket.on('disconnect', async () => {
      const decrResult = await publisher.decr(CONNECTION_COUNT_KEY)
      serverInstanceConnections--
      await publisher.publish(
        CONNECTION_COUNT_UPDATED_CHANNEL,
        String(decrResult)
      )
    })
  })

  subscriber.subscribe(CONNECTION_COUNT_UPDATED_CHANNEL, async (err, count) => {
    if (err) {
      fastify.log.error(
        `Error subscribing to channel ${CONNECTION_COUNT_UPDATED_CHANNEL}`,
        err
      )
      return
    }

    fastify.log.info(
      `${count} clients connected to ${CONNECTION_COUNT_UPDATED_CHANNEL} channel`
    )
  })

  subscriber.on('message', (channel, text) => {
    if (channel === CONNECTION_COUNT_UPDATED_CHANNEL) {
      fastify.io.emit(CONNECTION_COUNT_UPDATED_CHANNEL, {
        count: text,
      })
      return
    }
  })
}

const sendMessageToRoom = () => {}

import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { Server } from 'socket.io'

const socketIO: FastifyPluginAsync = fp(async (fastify, opts) => {
  fastify
    .decorate('io', new Server(fastify.server, opts))
    .addHook('onClose', async (fastify) => {
      fastify.io.close()
    })
})

export default socketIO

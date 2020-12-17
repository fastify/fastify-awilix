import { AwilixContainer } from 'awilix'
import { FastifyPluginCallback } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    diScope: AwilixContainer
  }

  interface FastifyInstance {
    diContainer: AwilixContainer
  }
}

export type FastifyAwilixOptions = {
  disposeOnResponse?: boolean
  disposeOnClose?: boolean
}

export const fastifyAwilixPlugin: FastifyPluginCallback<NonNullable<FastifyAwilixOptions>>

export const diContainer: AwilixContainer

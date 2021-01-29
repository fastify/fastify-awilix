import { AwilixContainer } from 'awilix'
import { FastifyPluginCallback } from 'fastify'

export interface Cradle {}

declare module 'fastify' {
  interface FastifyRequest {
    diScope: AwilixContainer<Cradle>
  }

  interface FastifyInstance {
    diContainer: AwilixContainer<Cradle>
  }
}

export type FastifyAwilixOptions = {
  disposeOnResponse?: boolean
  disposeOnClose?: boolean
}

export const fastifyAwilixPlugin: FastifyPluginCallback<NonNullable<FastifyAwilixOptions>>

export const diContainer: AwilixContainer<Cradle>

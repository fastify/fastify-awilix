import { AwilixContainer } from 'awilix'
import { FastifyPluginCallback } from 'fastify'

export interface Cradle {}

export interface RequestCradle {}

declare module 'fastify' {
  interface FastifyRequest {
    diScope: AwilixContainer<Cradle & RequestCradle>
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

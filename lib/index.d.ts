import { AwilixContainer } from 'awilix'
import { FastifyPluginCallback } from 'fastify'
import { AwilixManager } from 'awilix-manager'

export interface Cradle {}

export interface RequestCradle {}

declare module 'fastify' {
  interface FastifyRequest {
    diScope: AwilixContainer<Cradle & RequestCradle>
  }

  interface FastifyInstance {
    diContainer: AwilixContainer<Cradle>
    awilixManager: AwilixManager
  }
}

export type FastifyAwilixOptions = {
  disposeOnResponse?: boolean
  disposeOnClose?: boolean
  asyncInit?: boolean
  asyncDispose?: boolean
  eagerInject?: boolean
}

export const fastifyAwilixPlugin: FastifyPluginCallback<NonNullable<FastifyAwilixOptions>>

export const diContainer: AwilixContainer<Cradle>

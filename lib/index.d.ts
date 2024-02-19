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
  injectionMode?: 'PROXY' | 'CLASSIC'
  container?: AwilixContainer<Cradle>
  asyncInit?: boolean
  asyncDispose?: boolean
  eagerInject?: boolean
  strictBooleanEnforced?: boolean
}

export const fastifyAwilixPlugin: FastifyPluginCallback<NonNullable<FastifyAwilixOptions>>

export const diContainer: AwilixContainer<Cradle>
export const diContainerClassic: AwilixContainer<Cradle>
export const diContainerProxy: AwilixContainer<Cradle>

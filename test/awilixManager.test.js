'use strict'

const { asClass } = require('awilix')
const fastify = require('fastify')
const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')

const { diContainer, diContainerClassic, fastifyAwilixPlugin } = require('../lib')

let isInittedGlobal = false
let isDisposedGlobal = false

class InitSetClass {
  constructor () {
    isInittedGlobal = true
  }
}

class AsyncInitSetClass {
  async init () {
    isInittedGlobal = true
  }

  async dispose () {
    isDisposedGlobal = true
  }
}

const variations = [
  {
    injectionMode: 'PROXY',
    container: diContainer
  },
  {
    injectionMode: 'CLASSIC',
    container: diContainerClassic
  }
]

describe('awilixManager', () => {
  variations.forEach((variation) => {
    describe(variation.injectionMode, () => {
      let app

      beforeEach(() => {
        isInittedGlobal = false
        isDisposedGlobal = false
      })

      afterEach(async () => {
        await variation.container.dispose()

        isInittedGlobal = false
        isDisposedGlobal = false

        await app.close()
      })

      it('performs eager injection if enabled', async () => {
        variation.container.register(
          'dependency1',
          asClass(InitSetClass, {
            lifetime: 'SINGLETON',
            eagerInject: true
          })
        )
        app = fastify({ logger: false })
        await app.register(fastifyAwilixPlugin, {
          eagerInject: true,
          injectionMode: variation.injectionMode
        })
        await app.ready()

        assert.equal(isInittedGlobal, true)
      })

      it('performs async init if enabled', async () => {
        variation.container.register(
          'dependency1',
          asClass(AsyncInitSetClass, {
            lifetime: 'SINGLETON',
            asyncInit: 'init'
          })
        )
        app = fastify({ logger: false })
        await app.register(fastifyAwilixPlugin, {
          asyncInit: true,
          injectionMode: variation.injectionMode
        })
        await app.ready()

        assert.equal(isInittedGlobal, true)
      })

      it('performs async dispose if enabled', async () => {
        variation.container.register(
          'dependency1',
          asClass(AsyncInitSetClass, {
            lifetime: 'SINGLETON',
            asyncDispose: 'dispose'
          })
        )
        app = fastify({ logger: false })
        await app.register(fastifyAwilixPlugin, {
          asyncDispose: true,
          injectionMode: variation.injectionMode
        })
        await app.ready()
        await app.close()

        assert.equal(isDisposedGlobal, true)
      })
    })
  })
})

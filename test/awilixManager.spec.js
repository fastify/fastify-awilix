const { asClass } = require('awilix')
const fastify = require('fastify')
const { diContainer, fastifyAwilixPlugin } = require('../lib')

const {
  diContainer: diContainerClassic,
  fastifyAwilixPlugin: fastifyAwilixPluginClassic,
} = require('../lib/classic')

let isInittedGlobal = false
let isDisposedGlobal = false

class InitSetClass {
  constructor() {
    isInittedGlobal = true
  }
}

class AsyncInitSetClass {
  constructor() {}

  async init() {
    isInittedGlobal = true
  }

  async dispose() {
    isDisposedGlobal = true
  }
}

const variations = [
  {
    name: 'PROXY',
    plugin: fastifyAwilixPlugin,
    container: diContainer,
  },
  {
    name: 'CLASSIC',
    plugin: fastifyAwilixPluginClassic,
    container: diContainerClassic,
  },
]

describe('awilixManager', () => {
  variations.forEach((variation) => {
    describe(variation.name, () => {
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
            eagerInject: true,
          })
        )
        app = fastify({ logger: false })
        await app.register(variation.plugin, { eagerInject: true })
        await app.ready()

        expect(isInittedGlobal).toBe(true)
      })

      it('performs async init if enabled', async () => {
        variation.container.register(
          'dependency1',
          asClass(AsyncInitSetClass, {
            lifetime: 'SINGLETON',
            asyncInit: 'init',
          })
        )
        app = fastify({ logger: false })
        await app.register(variation.plugin, { asyncInit: true })
        await app.ready()

        expect(isInittedGlobal).toBe(true)
      })

      it('performs async dispose if enabled', async () => {
        variation.container.register(
          'dependency1',
          asClass(AsyncInitSetClass, {
            lifetime: 'SINGLETON',
            asyncDispose: 'dispose',
          })
        )
        app = fastify({ logger: false })
        await app.register(variation.plugin, { asyncDispose: true })
        await app.ready()
        await app.close()

        expect(isDisposedGlobal).toBe(true)
      })
    })
  })
})

'use strict'

const fastify = require('fastify')
const { asClass, Lifetime } = require('awilix')
const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')

const { fastifyAwilixPlugin, diContainer, diContainerClassic } = require('../lib')

class UserRepository {
  constructor () {
    this.disposeCounter = 0
  }

  dispose () {
    this.disposeCounter++
  }
}

let storedUserRepository
let storedUserRepositoryScoped

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

function getCompletedRequests (output) {
  return output.filter((line) => {
    try {
      return JSON.parse(line).msg === 'request completed'
    } catch (e) {
      return false
    }
  })
}

describe('fastifyAwilixPlugin', () => {
  let app, output
  const write = process.stdout.write

  beforeEach(() => {
    storedUserRepository = undefined
    output = []
    process.stdout.write = (str) => output.push(str)
  })

  afterEach(() => {
    process.stdout.write = write
    return app.close()
  })

  variations.forEach((variation) => {
    describe(variation.injectionMode, () => {
      const endpoint = async (req, res) => {
        const userRepository = app.diContainer.resolve('userRepository')
        storedUserRepository = userRepository

        assert.equal(userRepository.disposeCounter, 0)

        res.send({
          status: 'OK'
        })
      }

      describe('dispose singletons', () => {
        const endpointWithScope = async (req, res) => {
          const userRepository = req.diScope.resolve('userRepository')
          const userRepositoryScoped = req.diScope.resolve('userRepositoryScoped')
          storedUserRepository = userRepository
          storedUserRepositoryScoped = userRepositoryScoped

          assert.equal(userRepository.disposeCounter, 0)
          assert.equal(userRepositoryScoped.disposeCounter, 0)

          res.send({
            status: 'OK'
          })
        }

        it('dispose app-scoped singletons on closing app correctly', async () => {
          app = fastify({ logger: true })
          app.register(fastifyAwilixPlugin, {
            disposeOnClose: true,
            disposeOnResponse: false,
            injectionMode: variation.injectionMode
          })
          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })

          app.post('/', endpoint)
          await app.ready()

          const response = await app.inject().post('/').end()

          assert.equal(response.statusCode, 200)
          assert.equal(storedUserRepository.disposeCounter, 0)

          await app.close()

          assert.equal(storedUserRepository.disposeCounter, 1)
        })

        it('do not dispose app-scoped singletons on sending response', async () => {
          app = fastify({ logger: true })
          app.register(fastifyAwilixPlugin, {
            disposeOnClose: false,
            disposeOnResponse: true,
            injectionMode: variation.injectionMode
          })
          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })

          app.post('/', endpoint)
          await app.ready()

          const response = await app.inject().post('/').end()

          assert.equal(response.statusCode, 200)
          assert.equal(storedUserRepository.disposeCounter, 0)

          await app.close()

          assert.equal(storedUserRepository.disposeCounter, 0)
        })

        it('do not attempt to dispose request scope if response was returned before it was even created', async () => {
          app = fastify({ logger: true })
          await app.addHook('onRequest', (request, reply) => {
            return reply.send('OK')
          })

          await app.register(fastifyAwilixPlugin, {
            disposeOnClose: false,
            disposeOnResponse: true,
            injectionMode: variation.injectionMode
          })
          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })

          let storedError = null
          app.setErrorHandler((err, request, reply) => {
            storedError = err
            return reply.send('Error')
          })

          app.post('/', endpoint)
          await app.ready()

          const response = await app.inject().options('/').end()

          assert.equal(response.statusCode, 200)
          assert.equal(storedUserRepository, undefined)

          await app.close()

          assert.equal(storedError, null)
          assert.equal(storedUserRepository, undefined)
        })

        it('dispose request-scoped singletons on sending response', async () => {
          app = fastify({ logger: true })
          app.register(fastifyAwilixPlugin, {
            disposeOnClose: false,
            disposeOnResponse: true,
            injectionMode: variation.injectionMode
          })

          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })
          app.addHook('onRequest', (request, reply, done) => {
            request.diScope.register({
              userRepositoryScoped: asClass(UserRepository, {
                lifetime: Lifetime.SCOPED,
                dispose: (service) => service.dispose()
              })
            })
            done()
          })

          app.post('/', endpointWithScope)
          await app.ready()

          const response = await app.inject().post('/').end()

          assert.equal(response.statusCode, 200)
          assert.equal(storedUserRepositoryScoped.disposeCounter, 1)
          assert.equal(storedUserRepository.disposeCounter, 0)

          await app.close()

          assert.equal(storedUserRepositoryScoped.disposeCounter, 1)
          assert.equal(storedUserRepository.disposeCounter, 0)
        })

        it('do not dispose request-scoped singletons twice on closing app', async () => {
          app = fastify({ logger: true })
          app.register(fastifyAwilixPlugin, {
            disposeOnClose: true,
            disposeOnResponse: true,
            injectionMode: variation.injectionMode
          })

          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })
          app.addHook('onRequest', (request, reply, done) => {
            request.diScope.register({
              userRepositoryScoped: asClass(UserRepository, {
                lifetime: Lifetime.SCOPED,
                dispose: (service) => service.dispose()
              })
            })
            done()
          })

          app.post('/', endpointWithScope)
          await app.ready()

          const response = await app.inject().post('/').end()

          assert.equal(response.statusCode, 200)
          assert.equal(storedUserRepositoryScoped.disposeCounter, 1)
          assert.equal(storedUserRepository.disposeCounter, 0)

          await app.close()

          assert.equal(storedUserRepositoryScoped.disposeCounter, 1)
          assert.equal(storedUserRepository.disposeCounter, 1)
        })
      })

      describe('response logging', () => {
        it('should only produce one "request completed" log with dispose settings enabled', async () => {
          app = fastify({ logger: true })
          app.register(fastifyAwilixPlugin, {
            disposeOnClose: true,
            disposeOnResponse: true,
            injectionMode: variation.injectionMode
          })
          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })

          app.post('/', endpoint)
          await app.ready()

          await app.inject().post('/').end()

          await app.close()

          const completedRequests = getCompletedRequests(output)
          assert.equal(completedRequests.length, 1)
        })

        it('should only produce one "request completed" log with dispose settings disabled', async () => {
          app = fastify({ logger: true })

          app.register(fastifyAwilixPlugin, {
            disposeOnClose: false,
            disposeOnResponse: false,
            injectionMode: variation.injectionMode
          })
          variation.container.register({
            userRepository: asClass(UserRepository, {
              lifetime: Lifetime.SINGLETON,
              dispose: (service) => service.dispose()
            })
          })

          app.post('/', endpoint)
          await app.ready()

          await app.inject().post('/').end()

          await app.close()

          const completedRequests = getCompletedRequests(output)
          assert.equal(completedRequests.length, 1)
        })
      })
    })
  })
})

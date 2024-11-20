'use strict'

const fastify = require('fastify')
const { asValue, asFunction, asClass, Lifetime } = require('awilix')
const { describe, it, afterEach } = require('node:test')
const assert = require('node:assert')

const { diContainer, diContainerClassic, fastifyAwilixPlugin } = require('../lib')
const pino = require('pino')

class UserServiceClassic {
  constructor (userRepository, maxUserName, maxEmail) {
    this.userRepository = userRepository
    this.maxUserName = maxUserName
    this.maxEmail = maxEmail
  }
}

class UserServiceProxy {
  constructor ({ userRepository, maxUserName, maxEmail }) {
    this.userRepository = userRepository
    this.maxUserName = maxUserName
    this.maxEmail = maxEmail
  }
}

const variations = [
  {
    injectionMode: 'PROXY',
    container: diContainer,
    optsContainer: undefined,
    optsInjectionMode: undefined,
    UserService: UserServiceProxy
  },
  {
    injectionMode: 'PROXY',
    container: diContainer,
    optsContainer: undefined,
    optsInjectionMode: 'PROXY',
    UserService: UserServiceProxy
  },
  {
    injectionMode: 'CLASSIC',
    container: diContainerClassic,
    optsContainer: undefined,
    optsInjectionMode: 'CLASSIC',
    UserService: UserServiceClassic
  },

  {
    injectionMode: 'PROXY',
    container: diContainer,
    optsContainer: diContainer,
    optsInjectionMode: undefined,
    UserService: UserServiceProxy
  },
  {
    injectionMode: 'CLASSIC',
    container: diContainerClassic,
    optsContainer: diContainerClassic,
    optsInjectionMode: undefined,
    UserService: UserServiceClassic
  }
]

describe('fastifyAwilixPlugin', () => {
  let app

  afterEach(() => {
    return app.close()
  })

  describe('variations', () => {
    variations.forEach((variation) => {
      describe(variation.injectionMode, () => {
        describe('inject singleton', () => {
          it('injects correctly', async () => {
            class UserRepository {
              constructor () {
                this.id = 'userRepository'
              }
            }

            const maxUserNameVariableFactory = () => {
              return 10
            }

            const maxUserPasswordVariableFactory = async () => {
              return await Promise.resolve(20).then((result) => result)
            }

            app = fastify({ logger: true })
            const endpoint = async (req, res) => {
              const userService = app.diContainer.resolve('userService')

              assert.equal(userService.userRepository.id, 'userRepository')
              assert.equal(userService.maxUserName, 10)
              assert.equal(userService.maxEmail, 40)

              const maxUserPassword = await req.diScope.resolve('maxUserPassword')

              assert.equal(maxUserPassword, 20)

              res.send({
                status: 'OK'
              })
            }

            app.register(fastifyAwilixPlugin, {
              injectionMode: variation.optsInjectionMode,
              container: variation.optsContainer
            })
            variation.container.register({
              userService: asClass(variation.UserService),
              userRepository: asClass(UserRepository, { lifetime: Lifetime.SINGLETON }),
              maxUserName: asFunction(maxUserNameVariableFactory, { lifetime: Lifetime.SINGLETON }),
              maxUserPassword: asFunction(maxUserPasswordVariableFactory, {
                lifetime: Lifetime.SINGLETON
              }),
              maxEmail: asValue(40)
            })

            app.post('/', endpoint)
            await app.ready()

            const response = await app.inject().post('/').end()

            assert.equal(response.statusCode, 200)
          })
        })
      })
    })
  })

  describe('constructor', () => {
    it('throws an error if both injection mode and container are specified', async () => {
      app = fastify({ logger: true })

      await assert.rejects(async () => {
        await app.register(fastifyAwilixPlugin, {
          injectionMode: 'PROXY',
          container: diContainer
        })
      }, /If you are passing pre-created container explicitly, you cannot specify injection mode/)
    })
  })

  describe('plugin', () => {
    it('handles DI timeout', async () => {
      app = fastify({
        loggerInstance: pino({
          level: 'debug'
        })
      })
      app.register(fastifyAwilixPlugin, {
        container: diContainer,
        asyncInit: true
      })
      diContainer.register('throwAnError', asFunction(() => {
        return {
          asyncInit: async () => {
            throw new Error('failed to init')
          }
        }
      }, {
        asyncInit: 'asyncInit',
        eagerInject: true
      }))
      await assert.rejects(app.ready(), /failed to init/)
    })
  })
})

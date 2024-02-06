'use strict'

const fastify = require('fastify')
const { asValue, asFunction, asClass, Lifetime } = require('awilix')
const { diContainer, diContainerClassic, fastifyAwilixPlugin } = require('../lib')

class UserServiceClassic {
  constructor(userRepository, maxUserName, maxEmail) {
    this.userRepository = userRepository
    this.maxUserName = maxUserName
    this.maxEmail = maxEmail
  }
}

class UserServiceProxy {
  constructor({ userRepository, maxUserName, maxEmail }) {
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
    UserService: UserServiceProxy,
  },
  {
    injectionMode: 'PROXY',
    container: diContainer,
    optsContainer: undefined,
    optsInjectionMode: 'PROXY',
    UserService: UserServiceProxy,
  },
  {
    injectionMode: 'CLASSIC',
    container: diContainerClassic,
    optsContainer: undefined,
    optsInjectionMode: 'CLASSIC',
    UserService: UserServiceClassic,
  },

  {
    injectionMode: 'PROXY',
    container: diContainer,
    optsContainer: diContainer,
    optsInjectionMode: undefined,
    UserService: UserServiceProxy,
  },
  {
    injectionMode: 'CLASSIC',
    container: diContainerClassic,
    optsContainer: diContainerClassic,
    optsInjectionMode: undefined,
    UserService: UserServiceClassic,
  },
]

describe('fastifyAwilixPlugin', () => {
  let app
  afterEach(() => {
    return app.close()
  })

  variations.forEach((variation) => {
    describe(variation.injectionMode, () => {
      describe('inject singleton', () => {
        it('injects correctly', async () => {
          class UserRepository {
            constructor() {
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
            expect(userService.userRepository.id).toBe('userRepository')
            expect(userService.maxUserName).toBe(10)
            expect(userService.maxEmail).toBe(40)

            const maxUserPassword = await req.diScope.resolve('maxUserPassword')
            expect(maxUserPassword).toBe(20)
            res.send({
              status: 'OK',
            })
          }

          app.register(fastifyAwilixPlugin, {
            injectionMode: variation.optsInjectionMode,
            container: variation.optsContainer,
          })
          variation.container.register({
            userService: asClass(variation.UserService),
            userRepository: asClass(UserRepository, { lifetime: Lifetime.SINGLETON }),
            maxUserName: asFunction(maxUserNameVariableFactory, { lifetime: Lifetime.SINGLETON }),
            maxUserPassword: asFunction(maxUserPasswordVariableFactory, {
              lifetime: Lifetime.SINGLETON,
            }),
            maxEmail: asValue(40),
          })

          app.post('/', endpoint)
          await app.ready()

          const response = await app.inject().post('/').end()
          expect(response.statusCode).toBe(200)
        })
      })
    })
  })

  describe('constructor', () => {
    it('throws an error if both injection mode and container are specified', async () => {
      app = fastify({ logger: true })

      await expect(() =>
        app.register(fastifyAwilixPlugin, {
          injectionMode: 'CLASSIC',
          container: diContainerClassic,
        }),
      ).rejects.toThrow(
        /If you are passing pre-created container explicitly, you cannot specify injection mode/,
      )
    })
  })
})

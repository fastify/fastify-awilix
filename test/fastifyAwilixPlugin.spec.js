'use strict'

const fastify = require('fastify')
const { asValue, asFunction, asClass, Lifetime } = require('awilix')
const { fastifyAwilixPlugin, diContainer } = require('../lib')
const {
  fastifyAwilixPlugin: fastifyAwilixPluginClassic,
  diContainer: diContainerClassic,
} = require('../lib/classic')

const variations = [
  {
    name: 'PROXY',
    plugin: fastifyAwilixPlugin,
    container: diContainer,
    UserService: class UserService {
      constructor({ userRepository, maxUserName, maxEmail }) {
        this.userRepository = userRepository
        this.maxUserName = maxUserName
        this.maxEmail = maxEmail
      }
    },
  },
  {
    name: 'CLASSIC',
    plugin: fastifyAwilixPluginClassic,
    container: diContainerClassic,
    UserService: class UserService {
      constructor(userRepository, maxUserName, maxEmail) {
        this.userRepository = userRepository
        this.maxUserName = maxUserName
        this.maxEmail = maxEmail
      }
    },
  },
]

describe('fastifyAwilixPlugin', () => {
  let app
  afterEach(() => {
    return app.close()
  })

  variations.forEach((variation) => {
    describe(variation.name, () => {
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

          app.register(variation.plugin)
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
})

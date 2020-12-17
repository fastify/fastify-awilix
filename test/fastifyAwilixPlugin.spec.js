const fastify = require('fastify')
const { fastifyAwilixPlugin, diContainer } = require('../')
const { asValue, asFunction, asClass, Lifetime } = require('awilix')

describe('fastifyAwilixPlugin', () => {
  let app
  afterEach(() => {
    return app.close()
  })

  describe('inject singleton', () => {
    it('injects correctly', async () => {
      class UserService {
        constructor({ userRepository, maxUserName, maxEmail }) {
          this.userRepository = userRepository
          this.maxUserName = maxUserName
          this.maxEmail = maxEmail
        }
      }

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
        expect(userService.userRepository.id).toEqual('userRepository')
        expect(userService.maxUserName).toEqual(10)
        expect(userService.maxEmail).toEqual(40)

        const maxUserPassword = await req.diScope.resolve('maxUserPassword')
        expect(maxUserPassword).toEqual(20)
        res.send({
          status: 'OK',
        })
      }

      app.register(fastifyAwilixPlugin)
      diContainer.register({
        userService: asClass(UserService),
        userRepository: asClass(UserRepository, { lifetime: Lifetime.SINGLETON }),
        maxUserName: asFunction(maxUserNameVariableFactory, { lifetime: Lifetime.SINGLETON }),
        maxUserPassword: asFunction(maxUserPasswordVariableFactory, {
          lifetime: Lifetime.SINGLETON,
        }),
        maxEmail: asValue(40, { lifetime: Lifetime.SINGLETON }),
      })

      app.post('/', endpoint)
      await app.ready()

      const response = await app.inject().post('/').end()
      expect(response.statusCode).toEqual(200)
    })
  })
})

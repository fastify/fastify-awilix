const fastify = require('fastify')
const { fastifyAwilixPlugin, diContainer } = require('../')
const { asClass, Lifetime } = require('awilix')

class UserRepository {
  constructor() {
    this.disposeCounter = 0
  }

  dispose() {
    this.disposeCounter++
  }
}

let storedUserRepository
let storedUserRepositoryScoped

describe('fastifyAwilixPlugin', () => {
  let app
  afterEach(() => {
    return app.close()
  })

  describe('dispose singletons', () => {
    const endpoint = async (req, res) => {
      const userRepository = app.diContainer.resolve('userRepository')
      storedUserRepository = userRepository
      expect(userRepository.disposeCounter).toEqual(0)

      res.send({
        status: 'OK',
      })
    }

    const endpointWithScope = async (req, res) => {
      const userRepository = req.diScope.resolve('userRepository')
      const userRepositoryScoped = req.diScope.resolve('userRepositoryScoped')
      storedUserRepository = userRepository
      storedUserRepositoryScoped = userRepositoryScoped
      expect(userRepository.disposeCounter).toEqual(0)
      expect(userRepositoryScoped.disposeCounter).toEqual(0)

      res.send({
        status: 'OK',
      })
    }

    it('dispose app-scoped singletons on closing app correctly', async () => {
      app = fastify({ logger: true })
      app.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: false })
      diContainer.register({
        userRepository: asClass(UserRepository, {
          lifetime: Lifetime.SINGLETON,
          dispose: (service) => service.dispose(),
        }),
      })

      app.post('/', endpoint)
      await app.ready()

      const response = await app.inject().post('/').end()
      expect(response.statusCode).toEqual(200)
      expect(storedUserRepository.disposeCounter).toEqual(0)

      await app.close()
      expect(storedUserRepository.disposeCounter).toEqual(1)
    })

    it('do not dispose app-scoped singletons on sending response', async () => {
      app = fastify({ logger: true })
      app.register(fastifyAwilixPlugin, { disposeOnClose: false, disposeOnResponse: true })
      diContainer.register({
        userRepository: asClass(UserRepository, {
          lifetime: Lifetime.SINGLETON,
          dispose: (service) => service.dispose(),
        }),
      })

      app.post('/', endpoint)
      await app.ready()

      const response = await app.inject().post('/').end()
      expect(response.statusCode).toEqual(200)
      expect(storedUserRepository.disposeCounter).toEqual(0)

      await app.close()
      expect(storedUserRepository.disposeCounter).toEqual(0)
    })

    it('dispose request-scoped singletons on sending response', async () => {
      app = fastify({ logger: true })
      app.register(fastifyAwilixPlugin, { disposeOnClose: false, disposeOnResponse: true })

      diContainer.register({
        userRepository: asClass(UserRepository, {
          lifetime: Lifetime.SINGLETON,
          dispose: (service) => service.dispose(),
        }),
      })
      app.addHook('onRequest', (request, reply, done) => {
        request.diScope.register({
          userRepositoryScoped: asClass(UserRepository, {
            lifetime: Lifetime.SCOPED,
            dispose: (service) => service.dispose(),
          }),
        })
        done()
      })

      app.post('/', endpointWithScope)
      await app.ready()

      const response = await app.inject().post('/').end()
      expect(response.statusCode).toEqual(200)
      expect(storedUserRepositoryScoped.disposeCounter).toEqual(1)
      expect(storedUserRepository.disposeCounter).toEqual(0)

      await app.close()
      expect(storedUserRepositoryScoped.disposeCounter).toEqual(1)
      expect(storedUserRepository.disposeCounter).toEqual(0)
    })

    it('do not dispose request-scoped singletons twice on closing app', async () => {
      app = fastify({ logger: true })
      app.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: true })

      diContainer.register({
        userRepository: asClass(UserRepository, {
          lifetime: Lifetime.SINGLETON,
          dispose: (service) => service.dispose(),
        }),
      })
      app.addHook('onRequest', (request, reply, done) => {
        request.diScope.register({
          userRepositoryScoped: asClass(UserRepository, {
            lifetime: Lifetime.SCOPED,
            dispose: (service) => service.dispose(),
          }),
        })
        done()
      })

      app.post('/', endpointWithScope)
      await app.ready()

      const response = await app.inject().post('/').end()
      expect(response.statusCode).toEqual(200)
      expect(storedUserRepositoryScoped.disposeCounter).toEqual(1)
      expect(storedUserRepository.disposeCounter).toEqual(0)

      await app.close()
      expect(storedUserRepositoryScoped.disposeCounter).toEqual(1)
      expect(storedUserRepository.disposeCounter).toEqual(1)
    })
  })
})

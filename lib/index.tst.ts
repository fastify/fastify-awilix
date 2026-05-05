import { asValue, AwilixContainer } from 'awilix'
import fastify, { FastifyInstance } from 'fastify'
import { diContainer, diContainerClassic, FastifyAwilixOptions, fastifyAwilixPlugin, Cradle, RequestCradle } from './index'
import { expect } from 'tstyche'

expect<FastifyAwilixOptions>().type.toBeAssignableFrom({})
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ disposeOnClose: false })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ container: diContainer })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ container: diContainerClassic })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ injectionMode: 'CLASSIC' } as const)
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ injectionMode: 'PROXY' } as const)
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ disposeOnResponse: false })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ asyncInit: false, asyncDispose: false })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ asyncInit: true, asyncDispose: true })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ eagerInject: true })

expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ strictBooleanEnforced: true })
expect<FastifyAwilixOptions>().type.toBeAssignableFrom({ strictBooleanEnforced: false })

interface MailService {
  greet(name: string): void
}
interface User {
  name: string
}

declare module './' {
  interface Cradle {
    mailService: MailService
  }
  interface RequestCradle {
    user: User
  }
}

expect(diContainer).type.toBe<AwilixContainer<Cradle>>()
expect(diContainerClassic).type.toBe<AwilixContainer<Cradle>>()

expect(diContainer).type.not.toBe<AwilixContainer<Cradle & RequestCradle>>()
expect(diContainer).type.not.toBe<AwilixContainer<RequestCradle>>()
expect(diContainerClassic).type.not.toBe<
  AwilixContainer<Cradle & RequestCradle>
>()
expect(diContainerClassic).type.not.toBe<AwilixContainer<RequestCradle>>()

expect(diContainer.cradle.mailService).type.toBe<MailService>()
expect(diContainer.resolve('mailService')).type.toBe<MailService>()

const app: FastifyInstance = fastify()

app.register(fastifyAwilixPlugin, {})

app.addHook('onRequest', (request, _reply, done) => {
  request.diScope.register({
    user: asValue({
      name: 'John Doe',
    }),
  })
  done()
})

app.get('/user', (request) => {
  expect(request.diScope).type.toBe<AwilixContainer<Cradle & RequestCradle>>()

  const mailService = request.diScope.cradle.mailService
  const user = request.diScope.cradle.user

  expect(mailService).type.toBe<MailService>()
  expect(user).type.toBe<User>()

  mailService.greet(user.name)
})

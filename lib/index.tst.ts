import { asValue, AwilixContainer } from 'awilix'
import fastify, { FastifyInstance } from 'fastify'
import { diContainer, diContainerClassic, FastifyAwilixOptions, fastifyAwilixPlugin, Cradle, RequestCradle } from './index'
import { expect } from 'tstyche'

expect({}).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ disposeOnClose: false }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ container: diContainer }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ container: diContainerClassic }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ injectionMode: 'CLASSIC' } as const).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ injectionMode: 'PROXY' } as const).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ disposeOnResponse: false }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ asyncInit: false, asyncDispose: false }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ asyncInit: true, asyncDispose: true }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ eagerInject: true }).type.toBeAssignableTo<FastifyAwilixOptions>()

expect({ strictBooleanEnforced: true }).type.toBeAssignableTo<FastifyAwilixOptions>()
expect({ strictBooleanEnforced: false }).type.toBeAssignableTo<FastifyAwilixOptions>()

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

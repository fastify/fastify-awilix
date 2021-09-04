import { asValue, AwilixContainer } from 'awilix'
import fastify, { FastifyInstance } from 'fastify'
import { diContainer, FastifyAwilixOptions, fastifyAwilixPlugin, Cradle, RequestCradle } from './index'
import { diContainer as diContainerClassic, fastifyAwilixPlugin as fastifyAwilixPluginClassic  } from './classic'

import { expectAssignable, expectNotType, expectType } from 'tsd'

expectAssignable<FastifyAwilixOptions>({})
expectAssignable<FastifyAwilixOptions>({ disposeOnClose: false })
expectAssignable<FastifyAwilixOptions>({ disposeOnResponse: false })

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

expectType<AwilixContainer<Cradle>>(diContainer)
expectType<AwilixContainer<Cradle>>(diContainerClassic)

expectNotType<AwilixContainer<Cradle & RequestCradle>>(diContainer)
expectNotType<AwilixContainer<RequestCradle>>(diContainer)
expectNotType<AwilixContainer<Cradle & RequestCradle>>(diContainerClassic)
expectNotType<AwilixContainer<RequestCradle>>(diContainerClassic)

expectType<MailService>(diContainer.cradle.mailService)
expectType<MailService>(diContainer.resolve('mailService'))

const app: FastifyInstance = fastify()

app.register(fastifyAwilixPlugin, {})

app.addHook('onRequest', (request, reply, done) => {
  request.diScope.register({
    user: asValue({
      name: 'John Doe',
    }),
  })
  done()
})

app.get('/user', (request) => {
  expectType<AwilixContainer<Cradle & RequestCradle>>(request.diScope)

  const mailService = request.diScope.cradle.mailService
  const user = request.diScope.cradle.user

  expectType<MailService>(mailService)
  expectType<User>(user)

  mailService.greet(user.name)
})

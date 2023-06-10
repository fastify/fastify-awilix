# @fastify/awilix

[![NPM Version][npm-image]][npm-url]
[![Build Status](https://github.com/fastify/fastify-awilix/workflows/ci/badge.svg)](https://github.com/fastify/fastify-awilix/actions)

Dependency injection support for fastify framework, using [awilix](https://github.com/jeffijoe/awilix)

## Getting started

First install the package and awilix:

```bash
npm i @fastify/awilix awilix
```

Next, set up the plugin:

```js
const { fastifyAwilixPlugin } = require('@fastify/awilix')
const fastify = require('fastify')

app = fastify({ logger: true })
app.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: true })
```

Then, register some modules for injection:

```js
const { diContainer } = require('@fastify/awilix')
const { asClass, asFunction, Lifetime } = require('awilix')

// Code from the previous example goes here

diContainer.register({
  userRepository: asClass(UserRepository, {
    lifetime: Lifetime.SINGLETON,
    dispose: (module) => module.dispose(),
  }),
})

app.addHook('onRequest', (request, reply, done) => {
  request.diScope.register({
    userService: asFunction(
      ({ userRepository }) => {
        return new UserService(userRepository, request.params.countryId)
      },
      {
        lifetime: Lifetime.SCOPED,
        dispose: (module) => module.dispose(),
      }
    ),
  })
  done()
})
```

Note that there is no strict requirement to use classes, it is also possible to register primitive values, using either `asFunction()`, or `asValue()`. Check [awilix documentation](https://github.com/jeffijoe/awilix) for more details.

After all the modules are registered, they can be resolved with their dependencies injected from app-scoped `diContainer` and request-scoped `diScope`. Note that `diScope` allows resolving all modules from the parent `diContainer` scope:

```js
app.post('/', async (req, res) => {
  const userRepositoryForReq = req.diScope.resolve('userRepository')
  const userRepositoryForApp = app.diContainer.resolve('userRepository') // This returns exact same result as the previous line
  const userService = req.diScope.resolve('userService')

  // Logic goes here

  res.send({
    status: 'OK',
  })
})
```

## Plugin options

`disposeOnClose` - automatically invoke configured `dispose` for app-level `diContainer` hooks when the fastify instance is closed.
Disposal is triggered within `onClose` fastify hook.
Default value is `true`

`disposeOnResponse` - automatically invoke configured `dispose` for request-level `diScope` hooks after the reply is sent.
Disposal is triggered within `onResponse` fastify hook.
Default value is `true`

`asyncInit` - whether to process `asyncInit` fields in DI resolver configuration. Note that all dependencies with asyncInit enabled are instantiated eagerly. Disabling this will make app startup slightly faster.
Default value is `false`

`asyncDispose` - whether to process `asyncDispose` fields in DI resolver configuration when closing the fastify app. Disabling this will make app closing slightly faster.
Default value is `false`

`eagerInject` - whether to process `eagerInject` fields in DI resolver configuration, which instantiates and caches module immediately. Disabling this will make app startup slightly faster.
Default value is `false`

## Defining classes

All dependency modules are resolved using either the constructor injection (for `asClass`) or the function argument (for `asFunction`), by passing the aggregated dependencies object, where keys
of the dependencies object match keys used in registering modules:

```js
class UserService {
  constructor({ userRepository }) {
    this.userRepository = userRepository
  }

  dispose() {
    // Disposal logic goes here
  }
}

class UserRepository {
  constructor() {
    // Constructor logic goes here
  }

  dispose() {
    // Disposal logic goes here
  }
}

diContainer.register({
  userService: asClass(UserRepository, {
    lifetime: Lifetime.SINGLETON,
    dispose: (module) => module.dispose(),
  }),
  userRepository: asClass(UserRepository, {
    lifetime: Lifetime.SINGLETON,
    dispose: (module) => module.dispose(),
  }),
})
```

## Typescript usage

By default `@fastify/awilix` is using generic empty `Cradle` and `RequestCradle` interfaces, it is possible extend them with your own types:

`awilix` defines Cradle as a proxy, and calling getters on it will trigger a container.resolve for an according module. [Read more](https://github.com/jeffijoe/awilix#containercradle)

```typescript
declare module '@fastify/awilix' {
  interface Cradle {
    userService: UserService
  }
  interface RequestCradle {
    user: User
  }
}
//later, type is inferred correctly
fastify.diContainer.cradle.userService
// or
app.diContainer.resolve('userService')
// request scope
request.diScope.resolve('userService')
request.diScope.resolve('user')
```

[Find more in tests](lib/index.test-d.ts) or in [example from awilix documentation](https://github.com/jeffijoe/awilix/blob/master/examples/typescript/src/index.ts)

## Asynchronous init, dispose and eager injection

`fastify-awilix` supports extended awilix resolver options, provided by [awilix-manager](https://github.com/kibertoad/awilix-manager#getting-started):

```js
const { diContainer, fastifyAwilixPlugin } = '@fastify/awilix'
const { asClass } = require('awilix')

diContainer.register(
  'dependency1',
  asClass(AsyncInitSetClass, {
    lifetime: 'SINGLETON',
    asyncInit: 'init',
    asyncDispose: 'dispose',
    eagerInject: true,
  })
)

app = fastify()
await app.register(fastifyAwilixPlugin, { asyncInit: true, asyncDispose: true, eagerInject: true })
await app.ready()
```

## Using classic injection mode

If you prefer [classic injection](https://github.com/jeffijoe/awilix#injection-modes), you can use it like this:

```javascript
const { fastifyAwilixPlugin } = require('@fastify/awilix/classic')
const fastify = require('fastify')

app = fastify({ logger: true })
app.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: true })
```

## Advanced DI configuration

For more advanced use-cases, check the official [awilix documentation](https://github.com/jeffijoe/awilix)

[npm-image]: https://img.shields.io/npm/v/@fastify/awilix.svg
[npm-url]: https://npmjs.org/package/@fastify/awilix
[downloads-image]: https://img.shields.io/npm/dm/@fastify/awilix.svg
[downloads-url]: https://npmjs.org/package/@fastify/awilix

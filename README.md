# fastify-awilix

[![NPM Version][npm-image]][npm-url]
[![Build Status](https://github.com/fastify/fastify-awilix/workflows/ci/badge.svg)](https://github.com/fastify/fastify-awilix/actions)

Dependency injection support for fastify framework, using [awilix](https://github.com/jeffijoe/awilix)

## Getting started

First install the package and awilix:

```bash
npm i fastify-awilix awilix
```

Next, set up the plugin:

```js
const { fastifyAwilixPlugin } = require('fastify-awilix')
const fastify = require('fastify')

app = fastify({ logger: true })
app.register(fastifyAwilixPlugin, { disposeOnClose: true, disposeOnResponse: true })
```

Then, register some modules for injection:

```js
const { diContainer } = require('fastify-awilix')
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
      ({ userRepository }) => { return new UserService(userRepository, request.params.countryId) }, {
      lifetime: Lifetime.SCOPED,
      dispose: (module) => module.dispose(),
    }),
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

By default `fastify-awilix` is using generic empty `Cradle` and `RequestCradle` interfaces, it is possible extend them with your own types:

`awilix` defines Cradle as a proxy, and calling getters on it will trigger a container.resolve for an according module. [Read more](https://github.com/jeffijoe/awilix#containercradle)

```typescript
declare module 'fastify-awilix' {
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

[Find more in tests](./index.test-d.ts) or in [example from awilix documentation](https://github.com/jeffijoe/awilix/blob/master/examples/typescript/src/index.ts)

## Advanced DI configuration

For more advanced use-cases, check the official [awilix documentation](https://github.com/jeffijoe/awilix)

[npm-image]: https://img.shields.io/npm/v/fastify-awilix.svg
[npm-url]: https://npmjs.org/package/fastify-awilix
[downloads-image]: https://img.shields.io/npm/dm/fastify-awilix.svg
[downloads-url]: https://npmjs.org/package/fastify-awilix

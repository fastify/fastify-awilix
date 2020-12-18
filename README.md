# fastify-awilix

[![NPM Version][npm-image]][npm-url]
[![Build Status](https://github.com/kibertoad/fastify-awilix/workflows/ci/badge.svg)](https://github.com/kibertoad/fastify-awilix/actions)

Dependency injection support for fastify framework

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

// <...> code from previous example goes here

diContainer.register({
  userRepository: asClass(UserRepository, {
    lifetime: Lifetime.SINGLETON,
    dispose: (module) => module.dispose(),
  }),
})

app.addHook('onRequest', (request, reply, done) => {
  request.diScope.register({
    userService: asFunction(
      () => { return new UserService(request.params.countryId) }, {
      lifetime: Lifetime.SCOPED,
      dispose: (module) => module.dispose(),
    }),
  })
  done()
})
```

Then you can resolve modules from app-scoped `diContainer` and request-scoped `diScope`. Note that `diScope` allows resolving all modules from the parent `diContainer` scope:

```js
app.post('/', async (req, res) => {
  const userRepositoryForReq = req.diScope.resolve('userRepository')
  const userRepositoryForApp = app.diContainer.resolve('userRepository') // This returns exact same result as the previous line
  const userService = req.diScope.resolve('userService')
  
  // Your logic goes here

  res.send({
    status: 'OK',
  })
})
```
      

## Plugin options

`disposeOnClose` - automatically invoke configured `dispose` for app-level `diContainer` hooks when fastify instance is closed. 
  Disposal is triggered within `onClose` fastify hook. 
  Default value is `true`

`disposeOnClose` - automatically invoke configured `dispose` for request-level `diScope` hooks after reply is sent.
  Disposal is triggered within `onResponse` fastify hook.
  Default value is `true`

## Advanced DI configuration

For more advanced use-cases, check the official [awilix documentation](https://github.com/jeffijoe/awilix)

[npm-image]: https://img.shields.io/npm/v/fastify-awilix.svg
[npm-url]: https://npmjs.org/package/fastify-awilix
[downloads-image]: https://img.shields.io/npm/dm/fastify-awilix.svg
[downloads-url]: https://npmjs.org/package/fastify-awilix

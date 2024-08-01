'use strict'

const awilix = require('awilix')
const { AwilixManager } = require('awilix-manager')
const fp = require('fastify-plugin')

const diContainerProxy = awilix.createContainer({
  injectionMode: 'PROXY',
})

const diContainerClassic = awilix.createContainer({
  injectionMode: 'CLASSIC',
})

function plugin(fastify, opts, next) {
  if (opts.container && opts.injectionMode) {
    return next(
      new Error(
        'If you are passing pre-created container explicitly, you cannot specify injection mode',
      ),
    )
  }

  const resolvedContainer = opts.container
    ? opts.container
    : opts.injectionMode === 'CLASSIC'
      ? diContainerClassic
      : diContainerProxy

  const awilixManager = new AwilixManager({
    diContainer: resolvedContainer,
    asyncDispose: opts.asyncDispose,
    asyncInit: opts.asyncInit,
    eagerInject: opts.eagerInject,
    strictBooleanEnforced: opts.strictBooleanEnforced,
  })
  const disposeOnResponse = opts.disposeOnResponse === true || opts.disposeOnResponse === undefined
  const disposeOnClose = opts.disposeOnClose === true || opts.disposeOnClose === undefined

  fastify.decorate('awilixManager', awilixManager)
  fastify.decorate('diContainer', resolvedContainer)
  fastify.decorateRequest('diScope', null)

  fastify.addHook('onRequest', (request, reply, done) => {
    request.diScope = resolvedContainer.createScope()
    done()
  })

  if (opts.asyncInit || opts.eagerInject) {
    fastify.addHook('onReady', (done) => {
      awilixManager.executeInit().then(done, done)
    })
  }

  if (disposeOnClose) {
    fastify.addHook('onClose', (instance, done) => {
      if (instance.awilixManager.config.asyncDispose) {
        instance.awilixManager
          .executeDispose()
          .then(() => {
            return instance.diContainer.dispose()
          })
          .then(done, done)
      } else {
        instance.diContainer.dispose().then(done, done)
      }
    })
  }

  if (disposeOnResponse) {
    fastify.addHook('onResponse', (request, reply, done) => {
      if (request.diScope) {
        request.diScope.dispose().then(done, done)
      }
    })
  }

  next()
}

const fastifyAwilixPlugin = fp(plugin, {
  fastify: '5.x',
  name: '@fastify/awilix',
})

module.exports = {
  diContainer: diContainerProxy,
  diContainerProxy,
  diContainerClassic,
  fastifyAwilixPlugin,
}

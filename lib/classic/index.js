'use strict'

const awilix = require('awilix')
const fp = require('fastify-plugin')
const { AwilixManager } = require('awilix-manager')

const diContainer = awilix.createContainer({
  injectionMode: 'CLASSIC',
})

function plugin(fastify, opts, next) {
  const awilixManager = new AwilixManager({
    diContainer,
    asyncDispose: opts.asyncDispose,
    asyncInit: opts.asyncInit,
    eagerInject: opts.eagerInject,
  })
  const disposeOnResponse = opts.disposeOnResponse === true || opts.disposeOnResponse === undefined
  const disposeOnClose = opts.disposeOnClose === true || opts.disposeOnClose === undefined

  fastify.decorate('awilixManager', awilixManager)
  fastify.decorate('diContainer', diContainer)
  fastify.decorateRequest('diScope', null)

  fastify.addHook('onRequest', (request, reply, done) => {
    request.diScope = diContainer.createScope()
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
  fastify: '4.x',
  name: '@fastify/awilix',
})

module.exports = {
  diContainer,
  fastifyAwilixPlugin,
}

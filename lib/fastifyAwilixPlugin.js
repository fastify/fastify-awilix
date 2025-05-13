'use strict'

const awilix = require('awilix')
const { AwilixManager } = require('awilix-manager')
const fp = require('fastify-plugin')

const diContainerProxy = awilix.createContainer({
  injectionMode: 'PROXY'
})

const diContainerClassic = awilix.createContainer({
  injectionMode: 'CLASSIC'
})

function plugin (fastify, opts, next) {
  const asyncInitEnabled = opts.asyncInit ?? true
  const eagerInjectEnabled = opts.eagerInject ?? true
  const asyncDisposeEnabled = opts.asyncDispose ?? true
  const strictBooleanEnforced = opts.strictBooleanEnforced ?? true

  if (opts.container && opts.injectionMode) {
    return next(
      new Error(
        'If you are passing pre-created container explicitly, you cannot specify injection mode'
      )
    )
  }

  const resolvedContainer = opts.container
    ? opts.container
    : opts.injectionMode === 'CLASSIC'
      ? diContainerClassic
      : diContainerProxy

  const awilixManager = new AwilixManager({
    diContainer: resolvedContainer,
    asyncInit: asyncInitEnabled,
    eagerInject: eagerInjectEnabled,
    asyncDispose: asyncDisposeEnabled,
    strictBooleanEnforced,
  })
  const disposeOnResponse = opts.disposeOnResponse === true || opts.disposeOnResponse === undefined
  const disposeOnClose = opts.disposeOnClose === true || opts.disposeOnClose === undefined

  fastify.decorate('awilixManager', awilixManager)
  fastify.decorate('diContainer', resolvedContainer)
  fastify.decorateRequest('diScope', null)

  fastify.addHook('onRequest', (request, _reply, done) => {
    request.diScope = resolvedContainer.createScope()
    done()
  })

  if (asyncInitEnabled || eagerInjectEnabled) {
    fastify.addHook('onReady', function awilixOnReady (done) {
      const startTime = Date.now()
      fastify.log.debug('Start async awilix init')
      awilixManager.executeInit().then(() => {
        const endTime = Date.now()
        fastify.log.debug(`Finished async awilix init in ${endTime - startTime} msecs`)
        done()
      }, (err) => {
        if (err) {
          fastify.log.error('Error during async awilix init')
          return done(err)
        }
        /* c8 ignore start */
        done()
        /* c8 ignore stop */
      })
    })
  }

  if (disposeOnClose) {
    fastify.addHook('onClose', function awilixOnClose (instance, done) {
      if (instance.awilixManager.config.asyncDispose) {
        instance.awilixManager
          .executeDispose()
          .then(() => instance.diContainer.dispose())
          .then(done, done)
      } else {
        instance.diContainer.dispose().then(done, done)
      }
    })
  }

  if (disposeOnResponse) {
    fastify.addHook('onResponse', function awilixOnResponse (request, _reply, done) {
      if (request.diScope) {
        request.diScope.dispose().then(done, done)
      }
    })
  }

  next()
}

const fastifyAwilixPlugin = fp(plugin, {
  fastify: '5.x',
  name: '@fastify/awilix'
})

module.exports = {
  diContainer: diContainerProxy,
  diContainerProxy,
  diContainerClassic,
  fastifyAwilixPlugin
}

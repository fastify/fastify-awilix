const awilix = require('awilix')
const fp = require('fastify-plugin')

const diContainer = awilix.createContainer({
  injectionMode: 'PROXY',
})

function plugin(fastify, opts, next) {
  const disposeOnResponse = opts.disposeOnResponse === true || opts.disposeOnResponse === undefined
  const disposeOnClose = opts.disposeOnClose === true || opts.disposeOnClose === undefined

  fastify.decorate('diContainer', diContainer)
  fastify.decorateRequest('diScope', null)

  fastify.addHook('onRequest', (request, reply, done) => {
    request.diScope = diContainer.createScope()
    done()
  })

  if (disposeOnClose) {
    fastify.addHook('onClose', (instance, done) => {
      return diContainer.dispose().then(done)
    })
  }

  if (disposeOnResponse) {
    fastify.addHook('onResponse', (request, reply, done) => {
      return request.diScope.dispose().then(done)
    })
  }

  next()
}

const fastifyAwilixPlugin = fp(plugin, {
  fastify: '3.x',
  name: 'fastify-awilix',
})

module.exports = {
  diContainer,
  fastifyAwilixPlugin,
}

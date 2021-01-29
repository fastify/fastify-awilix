import { AwilixContainer } from 'awilix'
import fastify, { FastifyInstance } from "fastify";
import { diContainer, FastifyAwilixOptions, fastifyAwilixPlugin, Cradle } from './'
import { expectAssignable, expectType } from 'tsd'

expectAssignable<FastifyAwilixOptions>({})
expectAssignable<FastifyAwilixOptions>({ disposeOnClose: false})
expectAssignable<FastifyAwilixOptions>({ disposeOnResponse: false})
expectType<AwilixContainer<Cradle>>(diContainer)

const app: FastifyInstance = fastify();
app.register(fastifyAwilixPlugin, {});

import { AwilixContainer } from 'awilix'
import fastify, { FastifyInstance } from "fastify";
import { diContainer, FastifyAwilixOptions, fastifyAwilixPlugin } from './'
import { expectAssignable, expectType } from 'tsd'

expectAssignable<FastifyAwilixOptions>({})
expectAssignable<FastifyAwilixOptions>({ disposeOnClose: false})
expectAssignable<FastifyAwilixOptions>({ disposeOnResponse: false})
expectType<AwilixContainer>(diContainer)

const app: FastifyInstance = fastify();
app.register(fastifyAwilixPlugin, {});

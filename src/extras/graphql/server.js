import { makeExecutableSchema } from "@graphql-tools/schema";
import gql from 'graphql-tag'
import { EventEmitterAsyncIterator } from 'event-emitter-async-iterator';
import createGraphQLHTTPServer from "graphql-http-ws-server";
import {StateModel} from "../../exports.js";
import SimpleLogger from "simple-utility-logger";
import InMemoryKeyedStateProvider from "../../providers/InMemoryKeyedStateProvider.js";
import StateSubscriptionModel from "./server/StateSubscriptionModel.js";

import createGraphQLSchema from "./server/schema/schema.js"

const logger = new SimpleLogger();

const stateModel = new StateModel({
    logger: logger
});

const stateSubscriptionModel = new StateSubscriptionModel(stateModel, {
    logger: logger
})


    /*
(async () => {
    const state = await stateModel.load("repository", "config-test");

    state.on('patch', (patch, options) => {
        console.log("Config patch:", patch, options);
    });

    await state.patch([
        {op: "add", path: "/key", value: "value"}
    ], {tag: "xx", source: "yy"})

    //state.value = {"key": "value"};
})();

 */


const schema = createGraphQLSchema(stateSubscriptionModel, logger).schema;

createGraphQLHTTPServer({
    schema,
    port: 80,
    playground: true,
    graphqlPath: '/graphql',
    subscriptionsPath: '/graphql',
    onConnect: async (params) => { // WS
        console.log("LEGACY WS CONNECT", params);
        return {connection: "Legacy WS Connect"};
    },
    wsContext: (params) => {
        console.log("WS CONNECT", params.connectionParams)
        return {connection: "New WS Connect"};
    },
    httpContext: async ({req}) => { // HTTP
        console.log("HTTP CONNECT", req.headers);
        return {connection: "HTTP Connect"};
    }
});
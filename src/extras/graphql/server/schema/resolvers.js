import { EventEmitterAsyncIterator } from "event-emitter-async-iterator";

// GraphQL Types
import GraphQLJSONType from "./types/GraphQLJSONType.js";
import GraphQLObjectOrPrimitiveType from "./types/GraphQLObjectOrPrimitiveType.js";

const resolvers = (stateSubscriptionModel, logger) => {
    return {
        JSON: GraphQLJSONType,
        ObjectOrPrimitive: GraphQLObjectOrPrimitiveType,

        Query: {
            state: (obj, args, context) => stateSubscriptionModel.loadState(args.provider, args.id, context),
            state_subscribers: (obj, args, context) => {
                return {
                    results: stateSubscriptionModel.stateSubscribers(args.provider, args.id, args.options, context),
                    count: stateSubscriptionModel.stateSubscribersCount(args.provider, args.id, args.options, context)
                }
            },
        },
        Mutation: {
            state_patch: (obj, args, context, info) => stateSubscriptionModel.patchState(args.provider, args.id, args.patch, args.options, context)
        },
        Subscription: {
            state_mutation: {
                subscribe: async (obj, args, context, info) => {
                    const asyncIterator = new EventEmitterAsyncIterator();

                    const cancelSubscription = await stateSubscriptionModel.subscribeStatePatches(args.provider, args.id, args.options, context, (patch, patchOptions) => {
                        asyncIterator.pushValue({
                            state_mutation: {
                                patch: patch,
                                state: patchOptions?.state,
                                reset: patchOptions?.reset ?? false,
                                source: patchOptions?.source,
                                tag: patchOptions?.tag
                            }
                        });
                    });

                    asyncIterator.once("return", () => {
                        cancelSubscription();
                    });

                    return asyncIterator;
                }
            },
            state_subscribers: {
                subscribe: async (obj, args, context, info) => {
                    const asyncIterator = new EventEmitterAsyncIterator();

                    const cancelSubscription = await stateSubscriptionModel.subscribeStateSubscribers(args.provider, args.id, args.options, context, () => {
                        asyncIterator.pushValue({
                            state_subscribers: {
                                results: stateSubscriptionModel.stateSubscribers(args.provider, args.id, args.options, context),
                                count: stateSubscriptionModel.stateSubscribersCount(args.provider, args.id, args.options, context)
                            }
                        });
                    });

                    asyncIterator.once("return", () => {
                        cancelSubscription();
                    });

                    return asyncIterator;
                }
            }
        }
    };
}

export default resolvers;
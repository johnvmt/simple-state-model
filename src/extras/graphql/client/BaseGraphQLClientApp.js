// BaseGraphQLClientApp v0.0.3
// Base for GraphQL-based specialized clients (ElementBuilder, ElementState, Elections, Markets etc.)

import { createGraphQLClient } from "graphql-http-ws-client";
import { BaseEventEmitterController } from "utility-base-controllers";
class BaseGraphQLClientApp extends BaseEventEmitterController {
    constructor(options = {}) {
        super(options);

        this._graphQLClientCallbacks = [];

        // TODO handle graphQLClient
        if(options.graphQLClient)
            this.setGraphQLClient(options.graphQLClient);
        else if(options.graphQLURL) {
            this._graphQLURL = options.graphQLURL;
            this._graphQLClientStatus = BaseGraphQLClientApp.STATUSES.INACTIVE;
        }
    }

    // TODO remove this
    setGraphQLClient(graphQLClient) {
        this._graphQLClient = graphQLClient;
    }

    /**
     * Get GraphQL client status
     * @returns {string}
     */
    get graphQLClientStatus() {
        return this._graphQLClientStatus;
    }

    /**
     * Set GraphQL client status
     * @param graphQLClientStatus
     * @private
     */
    _setGraphQLClientStatus(graphQLClientStatus) {
        if(graphQLClientStatus !== this._graphQLClientStatus) {
            if(graphQLClientStatus in BaseGraphQLClientApp.STATUSES) {
                this._graphQLClientStatus = graphQLClientStatus;
                this.emit('status', graphQLClientStatus);
            }
            else
                throw new Error(`Unknown GraphQL client status: ${graphQLClientStatus}`);
        }
    }

    get graphQLURL() {
        return this._graphQLURL;
    }

    set graphQLURL(graphQLURL) {
        if(graphQLURL !== this.graphQLURL) {
            this._graphQLURL = graphQLURL;

            if(this.graphQLClientStatus !== BaseGraphQLClientApp.STATUSES.INACTIVE)
                this.connect();
        }
    }
    get graphQLClient() {
        return this._graphQLClient;
    }

    get options() {
        return super.options;
    }

    set options(options) {
        if(options !== this.options) {
            // reconnect when addContext function changes
            super.options = {
                ...this.options,
                ...options
            };

            if(options?.addContext !== this.options?.addContext && this.graphQLClientStatus !== BaseGraphQLClientApp.STATUSES.INACTIVE)
                this.connect();
        }
    }
    
    get graphQLSubscriptionClient() {
        return this._graphQLSubscriptionClient;
    }

    _setGraphQLClient(graphQLClient) {
        if(graphQLClient !== this.graphQLClient) {
            this._graphQLClient = graphQLClient;

            // resolve all promises
            for(let callback of this._graphQLClientCallbacks) {
                callback(this._graphQLClient);
            }

            this._graphQLClientCallbacks = [];
        }
    }
    
    _setGraphQLSubscriptionClient(graphQLSubscriptionClient) {
        if(graphQLSubscriptionClient !== this.graphQLSubscriptionClient)
            this._graphQLSubscriptionClient = graphQLSubscriptionClient;
    }

    // TODO add force option
    async connect() {
        if(this._options.graphQLURL) { // only act if URL was set directly
            this.disconnect();

            if(this.graphQLURL) {
                const graphQLOptions = {
                    createHTTPLink: true,
                    createWSLink: true,
                    wsLinkOptions: {
                        webSocket: typeof window !== 'undefined' ? window.WebSocket : undefined,
                        reconnect: true
                    },
                    httpLinkOptions: {

                    },
                    ...this.options
                }

                if(this.options.addContext) {
                    graphQLOptions.wsLinkOptions.connectionParams = this.options.addContext;
                    graphQLOptions.httpLinkOptions.setContext = this.options.addContext;
                }

                const { client, subscriptionClient } = createGraphQLClient(this.graphQLURL, graphQLOptions);

                if(subscriptionClient) {
                    subscriptionClient.on('connected', () => {
                        this._setGraphQLClientStatus(BaseGraphQLClientApp.STATUSES.CONNECTED);
                    });

                    subscriptionClient.on('disconnected', () => {
                        this._setGraphQLClientStatus(BaseGraphQLClientApp.STATUSES.DISCONNECTED);
                    });

                    subscriptionClient.on('reconnected', () => {
                        this._setGraphQLClientStatus(BaseGraphQLClientApp.STATUSES.CONNECTED);
                    });
                }

                this._setGraphQLClient(client);
                this._setGraphQLSubscriptionClient(subscriptionClient);
            }
            else
                throw new Error("graphQLURL not set");
        }
    }

    disconnect() {
        if(this._options.graphQLURL) { // only act if URL was set directly
            if (this.graphQLSubscriptionClient)
                this.graphQLSubscriptionClient.close();

            delete this._graphQLClient;
            delete this._graphQLSubscriptionClient;
        }
    }

    async getGraphQLClient() {
        if(this.graphQLClient)
            return this.graphQLClient;

        let externalResolve;

        const graphQLClientPromise = new Promise((resolve) => {
            externalResolve = resolve;
        });

        this._graphQLClientCallbacks.push(externalResolve);

        return graphQLClientPromise;
    }

    static STATUSES = {
        INACTIVE: "INACTIVE",
        CONNECTING: "CONNECTING",
        CONNECTED: "CONNECTED",
        DISCONNECTED: "DISCONNECTED"
    }
}

export default BaseGraphQLClientApp;
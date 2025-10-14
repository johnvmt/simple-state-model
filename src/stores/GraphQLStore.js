// GraphQLStore v1.0.0 - Example implementation
import BaseStore from "./BaseStore.js";

class GraphQLStore extends BaseStore {
    constructor(options = {}) {
        super(options);

        this._endpoint = options.endpoint;
        this._subscriptions = new Map();

        if (!this._endpoint) {
            throw new Error("GraphQL endpoint is required");
        }
    }

    /**
     * Get data from GraphQL endpoint
     * @param {string} id - Data identifier
     * @param {Object} options - Query options
     * @returns {Promise<*>} Data from server
     */
    async get(id, options = {}) {
        const query = options.query || `
            query GetData($id: ID!) {
                getData(id: $id) {
                    id
                    data
                }
            }
        `;

        try {
            const response = await this._graphQLRequest(query, { id });
            return response.data?.getData?.data;
        } catch (error) {
            this._log('error', 'GraphQL get failed:', error.message);
            throw error;
        }
    }

    /**
     * Apply patch via GraphQL mutation
     * @param {string} id - Data identifier
     * @param {Array} patch - Patch operations
     * @param {Object} options - Mutation options
     * @returns {Promise<*>} Mutation result
     */
    async patch(id, patch, options = {}) {
        const mutation = options.mutation || `
            mutation PatchData($id: ID!, $patch: [PatchOp!]!, $source: String, $tag: String) {
                patchData(id: $id, patch: $patch, source: $source, tag: $tag) {
                    success
                    data
                }
            }
        `;

        try {
            const variables = {
                id,
                patch,
                source: options.source,
                tag: options.tag
            };

            const response = await this._graphQLRequest(mutation, variables);
            return response.data?.patchData;
        } catch (error) {
            this._log('error', 'GraphQL patch failed:', error.message);
            throw error;
        }
    }

    /**
     * Subscribe to data changes via GraphQL subscription
     * @param {string} id - Data identifier
     * @param {Object} options - Subscription options
     * @param {Function} callback - Change callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(id, options = {}, callback) {
        const subscription = options.subscription || `
            subscription DataChanged($id: ID!, $source: String) {
                dataChanged(id: $id, excludeSource: $source) {
                    patch
                    tag
                    reset
                }
            }
        `;

        // Simulate subscription - in real implementation, use WebSocket or Server-Sent Events
        const subscriptionId = `${id}-${Math.random()}`;

        // Store subscription for cleanup
        this._subscriptions.set(subscriptionId, {
            id,
            callback,
            active: true
        });

        this._log('info', `GraphQL subscription started for ${id}`);

        // Return unsubscribe function
        return () => {
            const sub = this._subscriptions.get(subscriptionId);
            if (sub) {
                sub.active = false;
                this._subscriptions.delete(subscriptionId);
                this._log('info', `GraphQL subscription stopped for ${id}`);
            }
        };
    }

    /**
     * Make GraphQL request
     * @param {string} query - GraphQL query/mutation/subscription
     * @param {Object} variables - Query variables
     * @returns {Promise<*>} Response data
     * @private
     */
    async _graphQLRequest(query, variables = {}) {
        const response = await fetch(this._endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this._options.headers
            },
            body: JSON.stringify({
                query,
                variables
            })
        });

        if (!response.ok) {
            throw new Error(`GraphQL request failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors) {
            throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
        }

        return result;
    }

    /**
     * Clean up subscriptions
     */
    destroy() {
        for (const [subscriptionId] of this._subscriptions) {
            const sub = this._subscriptions.get(subscriptionId);
            if (sub) {
                sub.active = false;
            }
        }
        this._subscriptions.clear();
    }
}

export default GraphQLStore;

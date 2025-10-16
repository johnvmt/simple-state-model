// GraphQLStateAdapter v1.0.0 - GraphQL adapter implementation
import BaseStateAdapter from "./BaseStateAdapter.js";

class GraphQLStateAdapter extends BaseStateAdapter {
    constructor(options = {}) {
        super(options);

        this._endpoint = options.endpoint;
        this._subscriptions = new Map();
        this._stateInstances = new Map(); // Track StateType instances managed by this adapter

        if (!this._endpoint) {
            throw new Error("GraphQL endpoint is required");
        }
    }

    /**
     * Get StateType instance by ID (creates if doesn't exist and loads data from GraphQL)
     * @param {string} id - State identifier
     * @param {Object} options - StateType options
     * @returns {Promise<StateType>} StateType instance
     */
    async get(id, options = {}) {
        this.log("debug", "GraphQLStateAdapter.get:", id);

        // Check if we already have an instance for this ID
        if (this._stateInstances.has(id)) {
            return this._stateInstances.get(id);
        }

        // Dynamic import to avoid circular dependency
        const { default: StateType } = await import("../types/StateType.js");

        // Create new StateType instance WITHOUT passing adapter reference
        const stateInstance = new StateType({
            id: id,
            logger: this.options.logger,
            ...options
        });

        // Listen for patch events from the StateType
        stateInstance.on('patch', (patch, metadata) => {
            this._handleStatePatch(id, patch, metadata).catch(error => {
                this.log('error', 'Error handling state patch:', error.message);
            });
        });

        // Store the instance
        this._stateInstances.set(id, stateInstance);

        // Load data from GraphQL if not already loaded
        if (!stateInstance.data.value || Object.keys(stateInstance.data.value).length === 0) {
            try {
                const data = await this._fetchData(id, options);
                if (data) {
                    stateInstance.data.value = data;
                }
            } catch (error) {
                this.log('error', 'Failed to load data from GraphQL:', error.message);
            }
        }

        return stateInstance;
    }

    /**
     * Handle patch events from StateType instances
     * @param {string} id - State identifier
     * @param {Array} patch - RFC6902 patch operations
     * @param {Object} metadata - Patch metadata
     * @returns {Promise<void>}
     * @private
     */
    async _handleStatePatch(id, patch, metadata) {
        try {
            // Apply the patch using the adapter's patchValue method
            await this.patchValue(id, patch, {
                ...metadata,
                fromStateType: true
            });
        } catch (error) {
            this.log('error', 'Failed to handle state patch:', error.message);
            throw error;
        }
    }

    /**
     * Set value for a state via GraphQL mutation
     * @param {string} id - State identifier
     * @param {*} value - New value
     * @param {Object} options - Set options
     * @returns {Promise<*>} Set result
     */
    async setValue(id, value, options = {}) {
        this.log("debug", "GraphQLStateAdapter.setValue:", id, value);

        try {
            const result = await this._setDataMutation(id, value, options);

            // Update StateType instance if it exists
            this._updateStateInstance(id, value, options);

            this.log("debug", "GraphQLStateAdapter.setValue completed for:", id);
            return result;

        } catch (error) {
            this.log("error", "GraphQLStateAdapter.setValue failed:", error.message);
            throw error;
        }
    }

    /**
     * Apply patch via GraphQL mutation
     * @param {string} id - Data identifier
     * @param {Array} patch - Patch operations
     * @param {Object} options - Patch options
     * @returns {Promise<*>} Patch result
     */
    async patchValue(id, patch, options = {}) {
        this.log("debug", "GraphQLStateAdapter.patchValue:", id, patch);

        try {
            const result = await this._patchDataMutation(id, patch, options);

            // Update StateType instance if it exists (only if not coming from StateType to avoid loops)
            if (!options.fromStateType && result.data) {
                this._updateStateInstance(id, result.data, options);

                // Emit patch event on StateType instance
                const stateInstance = this._stateInstances.get(id);
                if (stateInstance) {
                    stateInstance.emit('patch', patch, {
                        patch: patch,
                        tag: options.tag,
                        source: options.source,
                        reset: false,
                        status: options.status || 'success'
                    });
                }
            }

            this.log("debug", "GraphQLStateAdapter.patchValue completed for:", id);
            return result;

        } catch (error) {
            this.log("error", "GraphQLStateAdapter.patchValue failed:", error.message);
            throw error;
        }
    }

    /**
     * Fetch data from GraphQL endpoint
     * @param {string} id - Data identifier
     * @param {Object} options - Query options
     * @returns {Promise<*>} Data from server
     * @private
     */
    async _fetchData(id, options = {}) {
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
            this.log('error', 'GraphQL get failed:', error.message);
            throw error;
        }
    }

    /**
     * Set data via GraphQL mutation
     * @param {string} id - Data identifier
     * @param {*} value - New value
     * @param {Object} options - Mutation options
     * @returns {Promise<*>} Mutation result
     * @private
     */
    async _setDataMutation(id, value, options = {}) {
        const mutation = options.setMutation || `
            mutation SetData($id: ID!, $data: JSON!, $source: String, $tag: String) {
                setData(id: $id, data: $data, source: $source, tag: $tag) {
                    id
                    data
                    success
                }
            }
        `;

        return await this._graphQLRequest(mutation, {
            id,
            data: value,
            source: options.source,
            tag: options.tag
        });
    }

    /**
     * Apply patch via GraphQL mutation
     * @param {string} id - Data identifier
     * @param {Array} patch - Patch operations
     * @param {Object} options - Mutation options
     * @returns {Promise<*>} Mutation result
     * @private
     */
    async _patchDataMutation(id, patch, options = {}) {
        const mutation = options.mutation || `
            mutation PatchData($id: ID!, $patch: [PatchOp!]!, $source: String, $tag: String) {
                patchData(id: $id, patch: $patch, source: $source, tag: $tag) {
                    id
                    data
                    success
                }
            }
        `;

        return await this._graphQLRequest(mutation, {
            id,
            patch,
            source: options.source,
            tag: options.tag
        });
    }

    /**
     * Make GraphQL request
     * @param {string} query - GraphQL query/mutation
     * @param {Object} variables - Query variables
     * @returns {Promise<*>} Response data
     * @private
     */
    async _graphQLRequest(query, variables = {}) {
        const response = await fetch(this._endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.options.headers
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
     * Subscribe to GraphQL data changes
     * @param {string} id - Data identifier
     * @param {Function} callback - Change callback
     * @param {Object} options - Subscription options
     * @returns {Function} Unsubscribe function
     */
    subscribe(id, callback, options = {}) {
        // Implementation would depend on GraphQL subscription support
        // This is a placeholder for WebSocket or Server-Sent Events based subscriptions
        this.log("debug", "GraphQL subscription not implemented yet for:", id);
        return () => {}; // Return empty unsubscribe function
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clean up any active subscriptions
        this._subscriptions.clear();
        super.destroy && super.destroy();
    }

    /**
     * Update a StateType instance with new data (called by adapter implementations)
     * @param {string} id - State identifier
     * @param {*} newData - New data value
     * @param {Object} options - Update options
     * @protected
     */
    _updateStateInstance(id, newData, options = {}) {
        const stateInstance = this._stateInstances.get(id);
        if (stateInstance && !options.fromStateType) {
            // Update the StateType's data without causing a loop
            stateInstance.data.value = newData;
        }
    }
}

export default GraphQLStateAdapter;

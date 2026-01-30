import BaseGraphQLClientApp from './BaseGraphQLClientApp.js';

class ElementStateGraphQLClient extends BaseGraphQLClientApp {
    constructor(options = {}) {
        super({
            createHTTPLink: false,
            createWSLink: true,
            ...options
        });
    }

    /**
     * Patch the state on the server
     * Adds a source ID if one is set in the options or the instance
     * @param stateID
     * @param patch
     * @param options
     * @returns {Promise<void>}
     */
    async patch(stateID, patch, options = {}) {
        const graphQLClient = await this.getGraphQLClient();

        this.log("debug", `Patching state with ID: ${stateID}`);

        // will throw an error if it fails
        await graphQLClient.mutate({
            mutation: `mutation($id: ID!, $patch: JSON!, $options: StateMutationOptionsInput) {
                state_patch(id: $id, patch: $patch, options: $options) {
                    tag
                }
            }`,
            variables: {
                id: stateID,
                patch: patch,
                options: options
            }
        });
    }

    /**
     * Subscribe to mutations on state object. First item returned will be a mutation for the full state.
     * @param stateID
     * @param options
     * @param callback
     * @returns {Promise<(function(): void)|*>}
     */
    async subscribe(stateID, options = {}, callback) {
        const graphQLClient = await this.getGraphQLClient();

        this.log("debug", `Subscribing to state with ID: ${stateID}`);

        const subscription = graphQLClient.subscribe({
            query: `subscription($id: ID!, $options: StateMutationSubscriptionOptionsInput) {
                state_mutation(id: $id, options: $options) {
                    tag
                    reset
                    patch
                }
            }`,
            variables: {
                id: stateID,
                options: options
            }
        })
        .subscribe({
            next({data}) {
                callback(null, data.state_mutation);
            },
            error(error) {
                callback(error, null);
            }
        });

        // cancel subscription
        return () => {
            if(subscription)
                subscription.unsubscribe();
        }
    }
}

export default ElementStateGraphQLClient;
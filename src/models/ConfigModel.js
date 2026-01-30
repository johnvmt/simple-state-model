import { BaseEventEmitterController } from "utility-base-controllers";
import InMemoryKeyedConfigProvider from "../providers/InMemoryKeyedConfigProvider.js";

class ConfigModel extends BaseEventEmitterController {
    constructor(options = {}) {
        super({
            providers: {
                "inmemory": new InMemoryKeyedConfigProvider({
                    logger: options.logger
                })
            },
            defaultProviderID: "inmemory",
            ...options
        });
    }

    /**
     * Get a StateController instance by ID - delegates to adapter
     * @returns {Promise<StateController>} - StateController instance managed by adapter
     * @param providerIDOrUndefined
     * @param providerOptions
     */
    load(providerIDOrUndefined, providerOptions = {}) {
        const providerID = this.providerID(providerIDOrUndefined);
        this.validateProvider(providerID);
        const provider = this.getProvider(providerID);
        return provider.load(providerOptions);
    }

    /**
     * Get providers by ID
     * @returns {{inmemory: InMemoryKeyedStateProvider}}
     */
    get providersByID() {
        return this.options.providers;
    }

    /**
     * Check if a provider exists by ID
     * @param providerID
     * @returns {boolean}
     */
    hasProvider(providerID) {
        return !!this.providersByID[providerID];
    }

    /**
     * Get a provider by ID
     * @param providerID
     * @returns {*}
     */
    getProvider(providerID) {
        return this.providersByID[providerID];
    }

    /**
     * Returns default provider ID if none provided
     * @param providerID
     */
    providerID(providerID = undefined) {
        if(providerID === undefined)
            return this.options.defaultProviderID;
        return providerID;
    }

    /**
     * Validate that a provider exists by ID
     * @param providerID
     * @private
     */
    validateProvider(providerID) {
        if(!this.hasProvider(providerID))
            throw new Error(`Provider with ID "${providerID}" does not exist`);
    }
}

export default ConfigModel;

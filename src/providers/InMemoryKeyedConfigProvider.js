// InMemoryKeyedConfigProvider v1.0.0 - Simple ConfigController registry
import BaseConfigProvider from "./BaseConfigProvider.js";
import ControllerStatuses from "../controllers/ControllerStatuses.js";

class InMemoryKeyedConfigProvider extends BaseConfigProvider {
    constructor(options = {}) {
        super({
            create: true, // default: create if it doesn't exist
            ...options
        });
        this._configInstances = new Map(); // Track ConfigController instances
    }

    /**
     * Get ConfigController instance by ID (creates if doesn't exist)
     * @param {Object} options - ConfigController options
     * @returns {Promise<ConfigController>} ConfigController instance
     */
    async load(options) {
        const { id: configID, options: configOptions} = InMemoryKeyedConfigProvider.configIDOptionsFromOptions(options);

        if(!this._configInstances.has(configID)) {
            if(!this.options.create)
                throw new Error(`Config with id "${configID}" does not exist`);
            else {
                this.log("debug", `Creating new config with id "${configID}"`);
                this._configInstances.set(
                    configID,
                    new this.controllerClass({
                        logger: this.options.logger,
                        status: ControllerStatuses.OK, // set ok status by default
                        provider: this,
                        ...configOptions
                    })
                );
            }
        }

        return this._configInstances.get(configID);
    }

    /**
     * Check if ConfigController instance exists for the given ID
     * @returns {boolean} True if instance exists
     * @param options
     */
    async has(options) {
        const { id: configID} = InMemoryKeyedConfigProvider.configIDOptionsFromOptions(options);
        return this._configInstances.has(configID);
    }

    /**
     * Remove ConfigController instance for the given ID
     * @returns {Promise<boolean>} True if instance was removed
     * @param options
     */
    async delete(options) {
        const hasConfig = await this.has(options);
        if(hasConfig) {
            const { id: configID} = InMemoryKeyedConfigProvider.configIDOptionsFromOptions(options);
            this.log("debug", `Deleting config with id "${configID}"`);
            return this._configInstances.delete(configID);
        }
    }

    /**
     * Parse config ID and options from input
     * @param options
     * @returns {{id: {}, options: {}}|{id, options: {}}}
     */
    static configIDOptionsFromOptions(options = {}) {
        if(typeof options === "object") {
            return {
                id: options.id,
                options: options
            };
        }
        else {
            return {
                id: options,
                options: {}
            }
        }
    }
}

export default InMemoryKeyedConfigProvider;

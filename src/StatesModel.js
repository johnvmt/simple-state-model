// StatesModel v1.0.0
import InMemoryStateAdapter from "./adapters/InMemoryStateAdapter.js";
import { BaseEventEmitterController } from "utility-base-controllers";

class StatesModel extends BaseEventEmitterController {
    constructor(options = {}) {
        super({
            // default adapter: in-memory adapter
            adapter: new InMemoryStateAdapter({
                logger: options.logger
            }),
            ...options
        });
    }

    /**
     * Returns the configured adapter
     * @returns {*}
     */
    get adapter() {
        return this.options.adapter;
    }

    /**
     * Get a StateType instance by ID - delegates to adapter
     * @param {string} id - State identifier
     * @param {Object} options - StateType options
     * @returns {Promise<StateType>} - StateType instance managed by adapter
     */
    get(id, options = {}) {
        return this.adapter.get(id, options);
    }

    /**
     * Check if data exists in adapter (async)
     * @param {string} id - State identifier
     * @returns {Promise<boolean>} - True if data exists
     */
    has(id) {
        return this.adapter.has(id);
    }

    /**
     * Remove a state by ID from adapter
     * @param {string} id - State identifier
     * @returns {Promise<boolean>} - True if state was removed
     */
    delete(id) {
        return this.adapter.delete(id);
    }
}

export default StatesModel;

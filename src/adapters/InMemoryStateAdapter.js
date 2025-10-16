// InMemoryStateAdapter v1.0.0 - Simple StateType registry
import BaseStateAdapter from "./BaseStateAdapter.js";
import StateType from "../types/StateType.js";

class InMemoryStateAdapter extends BaseStateAdapter {
    constructor(options = {}) {
        super(options);
        this._stateInstances = new Map(); // Track StateType instances
    }

    /**
     * Get StateType instance by ID (creates if doesn't exist)
     * @param {string} id - State identifier
     * @param {Object} options - StateType options
     * @returns {Promise<StateType>} StateType instance
     */
    async get(id, options = {}) {
        if(!this._stateInstances.has(id)) {
            this._stateInstances.set(
                id,
                new StateType({
                    logger: this.options.logger,
                    ...options
                })
            );
        }

        return this._stateInstances.get(id);
    }

    /**
     * Check if StateType instance exists for the given ID
     * @param {string} id - State identifier
     * @returns {boolean} True if instance exists
     */
    has(id) {
        return this._stateInstances.has(id);
    }

    /**
     * Remove StateType instance for the given ID
     * @param {string} id - State identifier
     * @returns {Promise<boolean>} True if instance was removed
     */
    async delete(id) {
        return this._stateInstances.delete(id);
    }
}

export default InMemoryStateAdapter;

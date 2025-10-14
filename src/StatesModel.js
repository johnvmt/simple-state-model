// StatesModel v1.0.0
import StateType from "./types/StateType.js";

class StatesModel {
    constructor(options = {}) {
        this._options = {
            logger: console, // default logger
            ...options
        };
        this._statesByID = new Map();
    }

    /**
     * Get or create a state by ID
     * @param {string} id - State identifier
     * @returns {StateType} - State instance
     */
    get(id) {
        if(!this._statesByID.has(id)) {
            this._statesByID.set(id, new StateType({
                ...this._options,
                id: id
            }));
        }

        return this._statesByID.get(id);
    }

    /**
     * Check if a state exists
     * @param {string} id - State identifier
     * @returns {boolean}
     */
    has(id) {
        return this._statesByID.has(id);
    }

    /**
     * Remove a state by ID
     * @param {string} id - State identifier
     * @returns {boolean} - True if state was removed, false if it didn't exist
     */
    remove(id) {
        const state = this._statesByID.get(id);
        if (state) {
            state.destroy?.();
            return this._statesByID.delete(id);
        }
        return false;
    }

    /**
     * Get all state IDs
     * @returns {string[]} - Array of state IDs
     */
    getStateIds() {
        return Array.from(this._statesByID.keys());
    }

    /**
     * Clear all states
     */
    clear() {
        for (const state of this._statesByID.values()) {
            state.destroy?.();
        }
        this._statesByID.clear();
    }
}

export default StatesModel;

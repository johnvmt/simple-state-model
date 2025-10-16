// BaseStateAdapter v1.0.0
import { BaseController } from "utility-base-controllers";
import NotImplementedError from "../utils/errors/NotImplementedError.js";

class BaseStateAdapter extends BaseController {
    /**
     * Get StateType instance by ID (creates if doesn't exist)
     * @param {string} id - State identifier
     * @param {Object} options - StateType options
     * @returns {Promise<StateType>} StateType instance
     */
    async get(id, options = {}) {
        throw new NotImplementedError("get method must be implemented by subclass");
    }

    /**
     * Check if a state exists by ID
     * Default implementation uses get()
     * @param id
     * @returns {Promise<boolean>}
     */
    async has(id) {
        const state = await this.get(id);
        return !!state;
    }

    /**
     * Remove a state by ID
     * @param {string} id - State identifier
     * @returns {Promise<boolean>} True if removed
     */
    async delete(id) {
        throw new NotImplementedError("delete method must be implemented by subclass");
    }
}

export default BaseStateAdapter;

// BaseStore v1.0.0
class NotImplementedError extends Error {
    constructor(message = "Not implemented") {
        super(message);
    }
}

class BaseStore {
    constructor(options = {}) {
        this._options = {
            logger: console,
            ...options
        };
    }

    /**
     * Get data by ID
     * @param {string} id - Data identifier
     * @param {Object} options - Get options
     * @returns {Promise<*>} Data value
     */
    async get(id, options = {}) {
        throw new NotImplementedError("get method must be implemented by subclass");
    }

    /**
     * Apply patch to data
     * @param {string} id - Data identifier
     * @param {Array} patch - RFC6902 patch operations
     * @param {Object} options - Patch options
     * @returns {Promise<*>} Patch result
     */
    async patch(id, patch, options = {}) {
        throw new NotImplementedError("patch method must be implemented by subclass");
    }

    /**
     * Subscribe to data changes
     * @param {string} id - Data identifier
     * @param {Object} options - Subscription options
     * @param {Function} callback - Change callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(id, options = {}, callback) {
        throw new NotImplementedError("subscribe method must be implemented by subclass");
    }

    /**
     * Create a unique instance of this store (for per-state isolation)
     * @returns {BaseStore} New store instance
     */
    unique() {
        return new this.constructor(this._options);
    }

    /**
     * Log a message using the configured logger
     * @param {string} level - Log level
     * @param {...any} messageParts - Message parts
     * @protected
     */
    _log(level, ...messageParts) {
        if (this._options.logger && typeof this._options.logger[level] === 'function') {
            this._options.logger[level](...messageParts);
        }
    }
}

export default BaseStore;
export { BaseStore, NotImplementedError };

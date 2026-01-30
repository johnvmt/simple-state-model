// BaseConfigProvider v1.0.0
import NotImplementedError from "../utils/errors/NotImplementedError.js";
import ConfigController from "../controllers/ConfigController.js";
import ProviderStatuses from "./ProviderStatuses.js";
import BaseStatusEventEmitterController from "../utils/BaseStatusEventEmitterController.js";

class BaseConfigProvider extends BaseStatusEventEmitterController {
    constructor(options = {}) {
        super(
            {
                controllerClass: ConfigController,
                ...options
            },
            BaseConfigProvider.STATUSES
        );
    }

    /**
     * Get ConfigController class managed by this provider
     * @returns {*|ConfigController}
     */
    get controllerClass() {
        return this.options.controllerClass;
    }

    /**
     * Get StateController instance by ID (creates if doesn't exist)
     * @param {Object} options - StateController options
     * @returns {Promise<StateController>} StateController instance
     */
    async load(options = {}) {
        throw new NotImplementedError("Load method must be implemented by subclass");
    }

    /**
     * Clean up resources
     */
    destroy(reason = undefined) {
        this.setStatus(ControllerStatuses.DESTROYED, reason);
        this.emit('destroy', reason);
        super.destroy();
    }

    /**
     * Check if a state exists by ID
     * Default implementation uses get()
     * @param options
     * @returns {Promise<boolean>}
     */
    async has(options) {
        const config = await this.load(options);
        return !!config;
    }

    /**
     * Remove a state by ID
     * @param options - State identifier
     * @returns {Promise<boolean>} True if removed
     */
    async delete(options) {
        throw new NotImplementedError("delete method must be implemented by subclass");
    }

    static STATUSES = ProviderStatuses;
}

export default BaseConfigProvider;

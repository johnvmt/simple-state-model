// InMemoryKeyedStateProvider v1.0.0 - Simple StateController registry
import BaseConfigProvider from "./BaseConfigProvider.js";
import ControllerStatuses from "../controllers/ControllerStatuses.js";

class InMemoryAnonymousConfigProvider extends BaseConfigProvider {
    /**
     * Get StateController instance by ID (creates if doesn't exist)
     * @param {Object} options - StateController options
     * @returns {Promise<StateController>} StateController instance
     */
    async load(options = {}) {
        return new this.controllerClass({
            logger: this.options.logger,
            status: ControllerStatuses.OK,
            provider: this,
            ...options
        });
    }
}

export default InMemoryAnonymousConfigProvider;

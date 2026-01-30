import StateController from "../controllers/StateController.js";
import InMemoryKeyedConfigProvider from "./InMemoryKeyedConfigProvider.js";

/**
 * In-memory keyed StateController provider
 * @extends InMemoryKeyedConfigProvider
 */
class InMemoryKeyedStateProvider extends InMemoryKeyedConfigProvider {
    constructor(options = {}) {
        super({
            controllerClass: StateController,
            ...options,
        });
    }
}

export default InMemoryKeyedStateProvider;
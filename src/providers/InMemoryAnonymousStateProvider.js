import StateController from "../controllers/StateController.js";
import InMemoryAnonymousConfigProvider from "./InMemoryAnonymousConfigProvider.js";

/**
 * In-memory anonymous StateController provider
 * @extends InMemoryAnonymousConfigProvider
 */
class InMemoryAnonymousStateProvider extends InMemoryAnonymousConfigProvider {
    constructor(options = {}) {
        super({
            controllerClass: StateController,
            ...options,
        });
    }
}

export default InMemoryAnonymousStateProvider;
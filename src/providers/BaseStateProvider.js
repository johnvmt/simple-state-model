import BaseConfigProvider from "./BaseConfigProvider.js";
import StateController from "../controllers/StateController.js";

class BaseStateProvider extends BaseConfigProvider {
    constructor(options = {}) {
        super({
            controllerClass: StateController,
            ...options
        });
    }
}
 export default BaseStateProvider;
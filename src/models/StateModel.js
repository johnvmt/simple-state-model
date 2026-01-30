import ConfigModel from "./ConfigModel.js";
import InMemoryKeyedStateProvider from "../providers/InMemoryKeyedStateProvider.js";

class StateModel extends ConfigModel {
    constructor(options = {}) {
        super({
            // override default config provider
            providers: {
                "inmemory": new InMemoryKeyedStateProvider({
                    logger: options.logger
                }),
                defaultProviderID: "inmemory",
            },
            ...options
        });
    }

    /**
     * Patch state via provider
     * @param providerID
     * @param providerOptions
     * @param patch
     * @returns {Promise<StateControllerPatchMutation>}
     */
    async patch(providerID, providerOptions = {}, patch) {
        const stateController = await this.load(providerID, providerOptions);
        return stateController.patch(patch);
    }
}

export default StateModel;

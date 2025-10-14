// StatePatchMutationType v1.0.0
import StateMutationType from "../StateMutationType.js";
import patchStateData from "../../mutators/patchStateData.js";

class StatePatchMutationType extends StateMutationType {
    constructor(patch, state, options = {}) {
        super(state, options);
        this._patch = patch;
    }

    get patch() {
        return this._patch;
    }

    /**
     * Apply a patch mutation to data
     * @param data
     * @param options
     */
    applyData(data, options = {}) {
        const result = patchStateData(data, this.patch, options);

        // Don't emit patch here - let the queue handle emission after status is set

        return result;
    }

    /**
     * Save patch to store
     * Accept or reject on result
     * @returns {Promise<void>}
     */
    async save() {
        await super.save();

        try {
            await this.state.store.patch(
                this.state.id,
                this._patch,
                {
                    tag: this.tag,
                    source: this.source
                }
            );

            this.accept();
        } catch (error) {
            this._log('error', 'Failed to save patch mutation:', error.message);
            this.reject({ error });
        }
    }
}

export default StatePatchMutationType;

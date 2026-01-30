// StateController v1.0.0
import ConfigController from "./ConfigController.js";
import StateControllerMutationQueue from "./mutations/StateControllerMutationQueue.js";
import StateControllerPatchMutation from "./mutations/StateControllerPatchMutation.js";

class StateController extends ConfigController {
    constructor(options = {}) {
        super(options);

        // Determine the mode for patch handling (AUTHORITATIVE = immediately applied, CLIENT = provisional)
        this._mode = options.mode || StateController.MODES.AUTHORITATIVE;

        this._mutationQueue = new StateControllerMutationQueue({
            logger: this.options.logger,
            value: this.options.value // initial value
        });

        // when running in authoritative mode, immediately apply mutations added to the queue
        if(this.mode === StateController.MODES.AUTHORITATIVE) {
            this._mutationQueue.on('mutation-added', (mutation) => {
                console.log(mutation);
                this.log("debug", `Accepting mutation added to queue: ${mutation.key}`);
                mutation.accept();
            });
        }

        this._mutationQueue.on('provisionalValue', (provisionalValue, options) => {
            const patchEmitOptions = {
                new: provisionalValue,
                ...options?.mutation?.options,
                ...options
            }

            if(options?.mutation?.patch) // patch is included in mutation
                this.emit('patch', options.mutation.patch, patchEmitOptions);
            else // generate a patch
                this.emit('patch', StateController.patchFromValue(provisionalValue), patchEmitOptions);

            this.emit('value', provisionalValue, options);
        });
    }

    /**
     * Apply a patch to the state
     * @param {Array} patch - RFC6902 JSON patch operations
     * @param {Object} options - Patch options
     * @returns {StateControllerPatchMutation} The created mutation
     */
    patch(patch, options = {}) {
        this.validateNotDestroyed()

        const mergedOptions = {
            logger: this.options.logger,
            ...options
        };

        this.log("debug", "Applying patch to state:", patch);

        const mutation = new StateControllerPatchMutation(patch, mergedOptions);
        this._mutationQueue.add(mutation);

        this.log("debug", "Patch mutation created and added to queue:", mutation.tag);

        return mutation;
    }

    /**
     * Returns current value (delegates to mutation queue)
     * @returns {*}
     */
    get value() {
        return this._mutationQueue.provisionalValue;
    }

    /**
     * Set value with default options
     * @param value
     */
    set value(value) {
        this.setValue(value);
    }

    /**
     * Set value with custom options
     * @param value
     * @param options
     */
    setValue(value, options = {}) {
        return this.patch(
            StateController.patchFromValue(value),
            options
        );
    }

    /**
     * Returns the current mode (AUTHORITATIVE or CLIENT)
     * @returns {string}
     */
    get mode() {
        return this._mode;
    }

    /**
     * Set the mode for patch handling
     * @param {string} mode - MODE value (AUTHORITATIVE or CLIENT)
     */
    set mode(mode) {
        if(!(mode in StateController.MODES))
            throw new Error(`Invalid mode: ${mode}. Must be one of: ${Object.values(StateController.MODES).join(', ')}`);

        this._mode = mode;
    }

    /**
     * Clears queue, sets value to {}
     */
    reset(options = {}) {
        const mergedOptions = {
            emit: true,
            ...options
        };

        // Clear mutation queue
        if(this._mutationQueue)
            this._mutationQueue.empty();

        this.status = StateController.STATUSES.OK;

        if(mergedOptions.emit) {
            this.emit("value", this.value);
            this.emit("status", this.status);
        }
    }

    static patchFromValue(value) {
        return [
            {
                op: 'replace',
                path: '',
                value: value
            }
        ];
    }

    static MODES = {
        AUTHORITATIVE: "AUTHORITATIVE", // patches applied immediately
        CLIENT: "CLIENT" // patches default applied as provisional
    }
}

export default StateController;

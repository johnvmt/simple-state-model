// StateType v1.0.0
import { BaseEventEmitterController } from "utility-base-controllers";

// types
import StateMutationQueueType from "./StateMutationQueueType.js";
import StatePatchMutationType from "./mutations/StatePatchMutationType.js";

class StateType extends BaseEventEmitterController {
    constructor(options = {}) {
        super(options);

        // Determine the mode for patch handling (AUTHORITATIVE = immediately applied, CLIENT = provisional)
        this._mode = options.mode || StateType.MODES.AUTHORITATIVE;

        this._mutationQueue = new StateMutationQueueType({
            logger: this.options.logger,
            value: this.options.value // initial value
        });

        // when running in authoritative mode, immediately apply mutations added to the queue
        if(this.options.mode === StateType.MODES.AUTHORITATIVE) {
            this._mutationQueue.on('mutation-added', (mutation) => {
                this.log("debug", `Mutation added to queue: ${mutation.key}`);
                mutation.accept();
            });
        }

        this._mutationQueue.on('provisionalValue', (provisionalValue, options) => {
            console.log("PVAL", provisionalValue)

            const patchEmitOptions = {
                new: provisionalValue,
                ...options?.mutation?.options,
                ...options
            }

            if(options?.mutation?.patch) // patch is included in mutation
                this.emit('patch', options.mutation.patch, patchEmitOptions);
            else // generate a patch
                this.emit('patch', StateType.patchFromValue(provisionalValue), patchEmitOptions);

            this.emit('value', provisionalValue, options);
        });
    }

    /**
     * Apply a patch to the state
     * @param {Array} patch - RFC6902 JSON patch operations
     * @param {Object} options - Patch options
     * @returns {StatePatchMutationType} The created mutation
     */
    patch(patch, options = {}) {
        const mergedOptions = {
            logger: this.options.logger,
            ...options
        };

        this.log("debug", "Applying patch to state:", patch);

        const mutation = new StatePatchMutationType(patch, mergedOptions);
        this._mutationQueue.add(mutation);

        this.log("debug", "Patch mutation created and added to queue:", mutation.tag);

        return mutation;
    }

    /**
     * Returns current value (delegates to mutation queue)
     * @returns {*}
     */
    get value() {
        console.log("GET VALU")
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
            StateType.patchFromValue(value),
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
        if(!(mode in StateType.MODES))
            throw new Error(`Invalid mode: ${mode}. Must be one of: ${Object.values(StateType.MODES).join(', ')}`);

        this._mode = mode;
    }

    /**
     * Returns state status (OK, LOADING, ERROR)
     * @returns {string}
     */
    get status() {
        return this._status;
    }

    /**
     * Set state status with default options
     * @param status
     */
    set status(status) {
        this.setStatus(status);
    }

    /**
     * Set state status with custom options
     * @param status
     * @param options
     */
    setStatus(status, options = {}) {
        const mergedOptions = {
            emit: true,
            ...options
        };

        if(status !== this._status) {
            this._status = status;

            if(mergedOptions.emit) {
                this.emit("status", this._status);
            }
        }
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

        this.status = StateType.STATUSES.OK;

        if(mergedOptions.emit) {
            this.emit("value", this.value);
            this.emit("status", this.status);
        }
    }

    /**
     * Clean up resources
     */
    destroy(reason = undefined) {
        this.emit('destroy', reason);
        super.destroy();
    }

    static patchFromValue(value) {
        return [{ op: 'replace', path: '', value: value }];
    }

    static MODES = {
        AUTHORITATIVE: "AUTHORITATIVE", // patches applied immediately
        CLIENT: "CLIENT" // patches default applied as provisional
    }

    static STATUSES = {
        OK: "OK",
        LOADING: "LOADING",
        ERROR: "ERROR"
    }
}

export default StateType;

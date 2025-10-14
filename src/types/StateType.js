// StateType v1.0.0
import SimpleEventEmitter from "simple-utility-event-emitter";

// types
import StateMutationType from "./StateMutationType.js";
import StateMutationQueueType from "./StateMutationQueueType.js";
import StatePatchMutationType from "./mutations/StatePatchMutationType.js";
import StateDataType from "./StateDataType.js";

class StateType extends SimpleEventEmitter {
    constructor(options = {}) {
        super();

        this._options = {
            logger: null, // no default logger - only log when explicitly provided
            authoritative: false, // new option for authoritative mode
            ...options
        };

        this._mutationQueue = new StateMutationQueueType(this, {
            logger: this._options.logger,
            authoritative: this._options.authoritative
        });

        this.reset();

        // set initial value
        if('value' in options)
            this.data.value = options.value;
    }

    get id() {
        return this._options.id;
    }

    /**
     * Return object of merged options
     * @returns {*}
     */
    get options() {
        return this._options;
    }

    /**
     * Returns data (StateDataType instance)
     * @returns {StateDataType}
     */
    get data() {
        return this._data;
    }

    /**
     * Returns value from data
     */
    get value() {
        return this.data?.value;
    }

    /**
     * Set store data object (StateDataType instance) with default options
     * @param data
     */
    set data(data) {
        this.setData(data);
    }

    /**
     * Set store data object (StateDataType instance) with custom options
     * @param data
     * @param options
     */
    setData(data, options = {}) {
        if(!data)
            throw new Error("Missing data");

        const mergedOptions = {
            emit: true,
            ...options
        };

        this._data = data;

        if(mergedOptions.emit) {
            this.emit("value", this._data.value);
            this.emit("data", this._data);
        }
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
     * Returns external store, if it is set
     * @returns {*}
     */
    get store() {
        return this._store;
    }

    /**
     * Returns whether this state is in authoritative mode
     * @returns {boolean}
     */
    get isAuthoritative() {
        return this._options.authoritative;
    }

    /**
     * Clears queue, sets value to {}
     */
    reset(options = {}) {
        const mergedOptions = {
            emit: true,
            subscribe: true,
            ...options
        };

        if(this._mutationQueue)
            this._mutationQueue.empty();

        this.setData(new StateDataType(), {emit: mergedOptions.emit === true || mergedOptions.emit?.data});

        if(this._options.store && mergedOptions.subscribe) {
            this._storeSubscribe();
            this.setStatus(StateType.STATUSES.LOADING, {emit: false});
        }
        else
            this.setStatus(StateType.STATUSES.OK, {emit: false});

        if(mergedOptions.emit === true || mergedOptions.emit?.state)
            this.setStatus(this.status, {emit: true});
    }

    /**
     * Apply a patch to the state
     * @param {Array} patch - RFC6902 JSON patch operations
     * @param {Object} options - Patch options
     * @returns {StatePatchMutationType} The created mutation
     */
    patch(patch, options = {}) {
        const mergedOptions = {
            logger: this._options.logger,
            authoritative: this._options.authoritative,
            ...options
        };

        this._log("debug", "Applying patch to state:", patch);

        const mutation = new StatePatchMutationType(patch, this, mergedOptions);
        this._mutationQueue.add(mutation);

        this._log("debug", "Patch mutation created and added to queue:", mutation.tag);

        return mutation;
    }

    /**
     * Subscribe to external store (GraphQL server, LocalStorage etc.)
     * @private
     */
    _storeSubscribe() {
        this._storeUnsubscribe();

        if(!this._options.store)
            throw new Error("No store");

        if(!this.id)
            throw new Error("Missing ID");

        if(this._options.store.unique)
            this._store = this._options.store.unique();
        else
            this._store = this._options.store;

        this._cancelStoreSubscription = this._store.subscribe(this.id, {}, (error, storeMutationProps) => {
            if(error) {
                this._log("error", "Store subscription error:", error.message);
                this.setStatus(StateType.STATUSES.ERROR);
                return;
            }

            if(storeMutationProps.reset) {
                if(this._mutationQueue.size > 0)
                    this._log("warn", "Reset requested with non-empty queue. Some mutations will be lost.");

                this.reset({
                    emit: false,
                    subscribe: false
                });
            }

            // Emit patches from store subscriptions
            this.emit('patch', storeMutationProps.patch, {
                tag: storeMutationProps.tag,
                reset: storeMutationProps.reset,
                source: 'store',
                ...storeMutationProps
            });

            // Create and add mutation from store
            const mutation = new StatePatchMutationType(storeMutationProps.patch, this, {
                status: this.isAuthoritative ? StateMutationType.STATUSES.ACCEPTED : StateMutationType.STATUSES.ACCEPTED,
                tag: storeMutationProps.tag,
                logger: this._options.logger,
                authoritative: this._options.authoritative
            });

            this._mutationQueue.add(mutation);
        });
    }

    /**
     * Unsubscribe from external store
     * @private
     */
    _storeUnsubscribe() {
        if(this._cancelStoreSubscription) {
            this._cancelStoreSubscription();
            this._cancelStoreSubscription = null;
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        this._storeUnsubscribe();
        if(this._mutationQueue) {
            this._mutationQueue.empty();
        }
        this.removeAllListeners();
    }

    /**
     * Log a message using the configured logger
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {...any} messageParts - Message parts to log
     * @private
     */
    _log(level, ...messageParts) {
        if (this._options.logger && typeof this._options.logger[level] === 'function') {
            this._options.logger[level](...messageParts);
        }
    }

    static STATUSES = {
        OK: "OK",
        LOADING: "LOADING",
        ERROR: "ERROR"
    }
}

export default StateType;

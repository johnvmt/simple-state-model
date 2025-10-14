// StateMutationType v1.0.0 - Simplified authoritative patch handling
import SimpleEventEmitter from "simple-utility-event-emitter";

class StateMutationTypeError extends Error {
    constructor(message, props = {}) {
        super(message);

        const mergedProps = {
            mutated: true,
            ...props
        }

        Object.assign(this, mergedProps);
    }
}

class StateMutationType extends SimpleEventEmitter{
    constructor(state, options = {}) {
        super();
        this._state = state;
        this._options = {
            save: true,
            logger: console, // default logger
            authoritative: false, // patch-level: true = immediately accepted/rejected, false = provisional
            ...options
        };
        this._dependentMutations = new Set();

        // Determine initial status based on authoritative flag
        const defaultStatus = this._options.authoritative
            ? StateMutationType.STATUSES.IDLE
            : StateMutationType.STATUSES.PROVISIONAL;

        this._setStatus(this._options.status ?? defaultStatus);

        // add tag if tag is not specified
        if(!this._options.tag)
            this._options.tag = StateMutationType.uniqueID();
    }

    /**
     * Returns object of merged options
     * @returns {*|{save: boolean}}
     */
    get options() {
        return this._options;
    }

    /**
     * Return data object from passed data object or state
     * @returns {*}
     */
    get data() {
        if('data' in this.options)
            return this.options.data;
        else if('state' in this.options)
            return this.options.state.data;
    }

    /**
     * Return the state this applies to
     * @returns {*}
     */
    get state() {
        return this._state;
    }

    get status() {
        return this._status;
    }

    get closed() {
        return StateMutationType.closedStatus(this.status);
    }

    /**
     * Returns rejection error, if one is set
     * @returns {*}
     */
    get error() {
        return this._error;
    }

    /**
     * Returns the source ID (allows client to not receive mutations it sent)
     * @returns {*}
     */
    get source() {
        return this._options.source;
    }

    /**
     * Returns the mutation tag (allows tracking through the server)
     * @returns {*}
     */
    get tag() {
        return this._options.tag;
    }

    /**
     * Returns whether this patch is authoritative (immediately accepted/rejected)
     * @returns {boolean}
     */
    get authoritative() {
        return this._options.authoritative || false;
    }

    /**
     * Accept the change and close out the mutation
     */
    accept(options = {}) {
        if(this.closed)
            throw new Error("Mutation is already closed");

        this._setStatus(StateMutationType.STATUSES.ACCEPTED);
    }

    /**
     * Reject the change and close out the mutation
     * @param options
     */
    reject(options = {}) {
        if(this.closed)
            throw new Error("Mutation is already closed");

        const mergedOptions = {
            dependency: false,
            ...options
        };

        if(mergedOptions.error)
            this._error = mergedOptions.error;

        // reject all dependent mutations
        for(let dependentMutation of this._dependentMutations) {
            dependentMutation.reject({
                ...mergedOptions,
                dependency: true
            });
        }

        this._setStatus(StateMutationType.STATUSES.REJECTED, mergedOptions);
    }

    /**
     * Apply the mutation to a data object (passed here, or in the constructor)
     * Also saves the data, if not previously saved
     * @param options
     * @returns {*}
     */
    apply(options = {}) {
        const mergedOptions = {
            ...options
        };

        const data = mergedOptions.data ?? this.data;

        if(!data)
            throw new Error("No target data available")

        if(this.options.conditions)
            data.validateConditions(this.options.conditions);

        try {
            this.applyData(data, options);

            // If this patch is authoritative, successful application means acceptance
            if (this.authoritative && this.status === StateMutationType.STATUSES.IDLE) {
                this.accept();
            }

            // If this patch is authoritative but was provisional, accept it now
            if (this.authoritative && this.status === StateMutationType.STATUSES.PROVISIONAL) {
                this.accept();
            }
        } catch (error) {
            // If authoritative patch fails, immediately reject
            if (this.authoritative) {
                this._options.logger.error('Authoritative patch failed to apply:', error.message);
                this.reject({ error });
                throw error;
            }

            throw error;
        }

        const save = ('save' in mergedOptions)
            ? mergedOptions.save
            : this.options.save;

        if(save)
            this.saveOnce()
    }

    /**
     * Placeholder for child mutation types to override
     * @param data
     * @param options
     */
    applyData(data, options = {}) {
        throw new Error("Not implemented");
    }

    /**
     * Returns true if save has started (or finished, or failed), false otherwise
     * @returns {boolean}
     */
    get saveRequested() {
        return this._saveRequested ?? false;
    }

    async saveOnce() {
        if(!this.closed && !this.saveRequested && this.state.store)
            await this.save();
    }

    async save() {
        if(this.saveRequested)
            throw new Error("Already saved");

        if(!this.state.store)
            throw new Error("No store to save");

        this._saveRequested = true;
    }

    /**
     * Add a dependent mutation that will be rejected if this one is rejected
     * @param mutation
     */
    addDependentMutation(mutation) {
        if(this.status === StateMutationType.STATUSES.REJECTED)
            throw new Error("Mutation already rejected");

        this._dependentMutations.add(mutation);
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

    /**
     * Validate, set and emit status
     * @param status
     * @param emitOptions
     * @private
     */
    _setStatus(status, emitOptions = {}) {
        if(!(status in StateMutationType.STATUSES))
            throw new Error("Invalid status");

        if(status !== this._status) {
            this._status = status;

            this.emit("status", this._status);

            if(StateMutationType.closedStatus(this._status))
                this.emit("close", this._status, emitOptions);
        }
    }

    /**
     * Returns true if the passed status is a final type (ACCEPTED or REJECTED)
     * @param status
     * @returns {boolean}
     */
    static closedStatus(status) {
        return (
            status === StateMutationType.STATUSES.ACCEPTED
            || status === StateMutationType.STATUSES.REJECTED
        );
    }

    static uniqueID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    static STATUSES = {
        IDLE: "IDLE", // not yet applied
        PROVISIONAL: "PROVISIONAL", // applied provisionally (default for non-authoritative patches)
        ACCEPTED: "ACCEPTED", // applied and accepted
        REJECTED: "REJECTED" // rejected
    }
}

export default StateMutationType;
export {StateMutationType, StateMutationTypeError};

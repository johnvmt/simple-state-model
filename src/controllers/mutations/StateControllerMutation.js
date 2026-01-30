// StateControllerMutation v1.0.0 - Simplified mutation base class
import { BaseEventEmitterController } from "utility-base-controllers";
import NotImplementedError from "../../utils/errors/NotImplementedError.js";
import { uniqueID as generateUniqueID } from "../../utils/uniqueID.js";

class StateControllerMutation extends BaseEventEmitterController {
    constructor(options = {}) {
        super({
            tag: generateUniqueID(),
            ...options
        });

        // All mutations start as PROVISIONAL by default
        // The queue will decide whether to accept/reject based on the state's mode
        this._setStatus(this.options.status ?? StateControllerMutation.STATUSES.PROVISIONAL);
    }

    get tag() {
        return this.options.tag;
    }

    get status() {
        return this._status;
    }

    get closed() {
        return StateControllerMutation.closedStatus(this.status);
    }

    get error() {
        return this._error;
    }

    /**
     * Accept the mutation and close it
     */
    accept(options = {}) {
        if(this.closed)
            throw new Error("Mutation is already closed");
        this._setStatus(StateControllerMutation.STATUSES.ACCEPTED);
    }

    /**
     * Reject the mutation and close it
     */
    reject(options = {}) {
        if(this.closed)
            throw new Error("Mutation is already closed");

        if (options.error)
            this._error = options.error;

        this._setStatus(StateControllerMutation.STATUSES.REJECTED, options);
    }

    /**
     * Apply the mutation to a value - override in subclasses
     * @param {*} value - The value to apply the mutation to
     * @param {Object} options - Application options
     * @returns {*} The new modified value
     */
    apply(value, options = {}) {
        throw new NotImplementedError("apply method must be implemented by subclass");
    }

    /**
     * Set status and emit events
     */
    _setStatus(status, emitOptions = {}) {
        if (!(status in StateControllerMutation.STATUSES))
            throw new Error("Invalid status");

        if (status !== this._status) {
            this._status = status;
            this.emit("status", this._status);

            if(StateControllerMutation.closedStatus(this._status))
                this.emit("close", this._status, emitOptions);
        }
    }

    /**
     * Check if status is final (accepted or rejected)
     */
    static closedStatus(status) {
        return (
            status === StateControllerMutation.STATUSES.ACCEPTED ||
            status === StateControllerMutation.STATUSES.REJECTED
        );
    }

    static STATUSES = {
        IDLE: "IDLE",           // not yet applied
        PROVISIONAL: "PROVISIONAL", // applied provisionally
        ACCEPTED: "ACCEPTED",   // applied and accepted
        REJECTED: "REJECTED"    // rejected
    }
}

export default StateControllerMutation;

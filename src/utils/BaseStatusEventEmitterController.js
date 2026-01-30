import {BaseEventEmitterController} from "utility-base-controllers";

class BaseStatusEventEmitterController extends BaseEventEmitterController {
    constructor(options, statuses = BaseStatusEventEmitterController.STATUSES) {
        super(options);

        this._statuses = statuses;
        this._status = this.options.status ?? BaseStatusEventEmitterController.STATUSES.OK;
    }

    /**
     * Returns the provider, if it is set
     * @returns {*}
     */
    get provider() {
        return this.options.provider;
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
        this.validateNotDestroyed();

        if(!(status in this._statuses))
            throw new Error(`Invalid status: ${status}`);

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
     * Returns whether config is destroyed
     * @returns {boolean}
     */
    get destroyed() {
        return this.status === this._statuses.DESTROYED;
    }

    /**
     * Clean up resources
     */
    destroy(reason = undefined) {
        this.setStatus(this._statuses.DESTROYED, reason);
        this.emit('destroy', reason);
        super.destroy();
    }

    /**
     * Ensure config is active
     * @private
     */
    validateNotDestroyed() {
        if(this.destroyed)
            throw new Error("Config is destroyed");
    }
    
    /**
     * Returns possible statuses
     * @type {{UNKNOWN: string, OK: string, ERROR: string, DESTROYED: string}}
     */
    static STATUSES = {
        UNKNOWN: "UNKNOWN",
        OK: "OK",
        ERROR: "ERROR",
        DESTROYED: "DESTROYED"
    }
}

export default BaseStatusEventEmitterController;
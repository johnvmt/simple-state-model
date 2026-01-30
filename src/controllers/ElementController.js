import { BaseEventEmitterController } from 'utility-base-controllers';
import StateController from './StateController.js';
import ConfigController from './ConfigController.js';
import ControllerStatuses from "./ControllerStatuses.js";
import debounce from 'simple-utility-debounce';

/**
 * Parent element controller
 */
class ElementController extends BaseEventEmitterController {
    constructor(options) {
        super(options);

        this._subscriptions = new Set();

        this._debouncedEmitStatus = debounce(() => {
            this.emit('status', this.status);
        }, 0, false);

        // config
        this._configController = options?.configController ?? new ConfigController({
            logger: this.logger
        });

        this.addSubscription(
            this._configController.on('status', () => {
                this._debouncedEmitStatus();
            })
        );

        // state
        this._stateController = options?.stateController ?? new StateController({
            logger: this.logger
        });

        this.addSubscription(
            this._stateController.on('status', () => {
                this._debouncedEmitStatus();
            })
        );
    }

    /**
     * Gets a combined status from the subcontrollers
     * @returns {string}
     */
    get status() {
        const configStatus = this._configController.status;
        const stateStatus = this._stateController.status;

        const statuses = [configStatus, stateStatus];

        // Check in priority order
        if (statuses.includes(ControllerStatuses.DESTROYED))
            return ControllerStatuses.DESTROYED;

        if (statuses.includes(ControllerStatuses.ERROR))
            return ControllerStatuses.ERROR;

        if (statuses.includes(ControllerStatuses.LOADING))
            return ControllerStatuses.LOADING;

        // If all are OK, return OK
        return ControllerStatuses.OK;
    }

    /**
     * Gets the config controller
     * @returns {*|(function(): *)|F extends (<V, _>(value: V, ...args: _) => any) ? Awaited<V> : never|ConfigController}
     */
    get configController() {
        return this._configController;
    }

    /**
     * Gets the state controller
     * @returns {*|(function(): *)|F extends (<V, _>(value: V, ...args: _) => any) ? Awaited<V> : never|StateController}
     */
    get stateController() {
        return this._stateController;
    }

    /**
     * Add a subscription (cancel function) to call when destroyed
     * @param cancelSubscription
     */
    addSubscription(cancelSubscription) {
        this._subscriptions.add(cancelSubscription);
    }

    /**
     * Remove a subscription (cancel function) if it is no longer needed
     * @param cancelSubscription
     */
    removeSubscription(cancelSubscription) {
        this._subscriptions.delete(cancelSubscription);
    }

    /**
     * Cancel all subscriptions when the controller is removed from the DOM
     */
    destroy() {
        for(let cancelSubscription of this._subscriptions) {
            try {
                cancelSubscription();
            }
            catch(error) {
                this.log("error", `Error in callback during store controller destruction: ${error.message}`);
            }
        }

        super.destroy();
    }
}

export default ElementController;
import BaseStatusEventEmitterController from "../utils/BaseStatusEventEmitterController.js";
import ControllerStatuses from "./ControllerStatuses.js";

class ConfigController extends BaseStatusEventEmitterController {
    constructor(options = {}) {
        super(
            options,
            ConfigController.STATUSES
        );
        this._value = this.options.value ?? undefined;
    }

    /**
     * Returns current value (delegates to mutation queue)
     * @returns {*}
     */
    get value() {
        return this._value;
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
        this.validateNotDestroyed();

        if(this._value !== value) {
            this._value = value;

            if(options.emit !== false)
                this.emit('value', this._value, options);
        }
    }

    static STATUSES = ControllerStatuses;
}

export default ConfigController
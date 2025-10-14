// StateDataType v1.0.0
import {objectClone} from "object-path-utilities";

class StateDataType {
    constructor(props = {}) {
        this._value = props.value ?? {};
    }

    /**
     * Returns current value of data
     * @returns {*}
     */
    get value() {
        return this._value;
    }

    /**
     * Sets current value of data
     * @param value
     */
    set value(value) {
        this._value = value;
    }

    /**
     * Return a copy of the data with a cloned value
     * @returns {StateDataType}
     */
    clone() {
        return new StateDataType({
            value: objectClone(this.value)
        });
    }

    /**
     * Validate conditions against the current data
     * @param {Object} conditions - Conditions to validate
     * @throws {Error} If conditions are not met
     */
    validateConditions(conditions) {
        if (!conditions || typeof conditions !== 'object') {
            return;
        }

        // Example condition validation - can be extended
        for (const [key, expectedValue] of Object.entries(conditions)) {
            const actualValue = this.getValueAtPath(key);
            if (actualValue !== expectedValue) {
                throw new Error(`Condition failed: expected ${key} to be ${expectedValue}, but got ${actualValue}`);
            }
        }
    }

    /**
     * Get value at a specific path (supports dot notation)
     * @param {string} path - Path to the value (e.g., "user.name")
     * @returns {*} Value at path
     */
    getValueAtPath(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this._value);
    }

    /**
     * Set value at a specific path (supports dot notation)
     * @param {string} path - Path to set the value (e.g., "user.name")
     * @param {*} value - Value to set
     */
    setValueAtPath(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => {
            if (!(key in obj)) {
                obj[key] = {};
            }
            return obj[key];
        }, this._value);

        target[lastKey] = value;
    }
}

export default StateDataType;

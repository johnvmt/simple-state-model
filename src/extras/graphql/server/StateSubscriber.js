import uniqueID from "../../../utils/uniqueID.js";

class StateSubscriber {
    constructor(options) {
        this._id = uniqueID();
        this._options = options;
    }

    /**
     * Return true if no name is set
     * @returns {boolean}
     */
    get anonymous() {
        return this.options.name === undefined;
    }

    get id() {
        return this._id;
    }

    /**
     * Return true if subscriber is active (default: true, use false for listeners that shouldn't be counted -- eg: subscribers to the subscribers list)
     * @returns {*|boolean|number|ServiceWorker|boolean}
     */
    get count() {
        return this.options.count ?? true;
    }

    get name() {
        return this.options.name;
    }

    get options() {
        return this._options;
    }
}

export default StateSubscriber;
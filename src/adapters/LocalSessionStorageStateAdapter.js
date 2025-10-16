// LocalSessionStorageStateAdapter v1.0.0 - Local/Session Storage adapter implementation
import BaseStateAdapter from "./BaseStateAdapter.js";
import { createPatch, applyPatch } from "../utils/ObjectPatcher.js";

class LocalSessionStorageStateAdapter extends BaseStateAdapter {
    constructor(options = {}) {
        super(options);

        this._storage = options.storage || localStorage; // or sessionStorage
        this._prefix = options.prefix || 'simple-state-model:';
        this._listeners = new Map();
        this._stateInstances = new Map(); // Track StateType instances managed by this adapter

        // Listen for storage events from other tabs/windows
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', this._handleStorageEvent.bind(this));
        }
    }

    /**
     * Get StateType instance by ID (creates if doesn't exist and loads existing data)
     * @param {string} id - State identifier
     * @param {Object} options - StateType options
     * @returns {Promise<StateType>} StateType instance
     */
    async get(id, options = {}) {
        this.log("debug", "LocalSessionStorageStateAdapter.get:", id);

        // Check if we already have an instance for this ID
        if (this._stateInstances.has(id)) {
            return this._stateInstances.get(id);
        }

        // Dynamic import to avoid circular dependency
        const { default: StateType } = await import("../types/StateType.js");

        // Create new StateType instance WITHOUT passing adapter reference
        const stateInstance = new StateType({
            id: id,
            logger: this.options.logger,
            ...options
        });

        // Listen for patch events from the StateType
        stateInstance.on('patch', (patch, metadata) => {
            this._handleStatePatch(id, patch, metadata).catch(error => {
                this.log('error', 'Error handling state patch:', error.message);
            });
        });

        // Store the instance
        this._stateInstances.set(id, stateInstance);

        // Load existing data from storage if available
        try {
            const key = this._getStorageKey(id);
            const stored = this._storage.getItem(key);

            if (stored !== null && (!stateInstance.data.value || Object.keys(stateInstance.data.value).length === 0)) {
                const parsedData = JSON.parse(stored);
                stateInstance.data.value = parsedData;
            }
        } catch (error) {
            this.log('error', 'LocalStorage get failed:', error.message);
        }

        return stateInstance;
    }

    /**
     * Handle patch events from StateType instances
     * @param {string} id - State identifier
     * @param {Array} patch - RFC6902 patch operations
     * @param {Object} metadata - Patch metadata
     * @returns {Promise<void>}
     * @private
     */
    async _handleStatePatch(id, patch, metadata) {
        try {
            // Apply the patch using the adapter's patchValue method
            await this.patchValue(id, patch, {
                ...metadata,
                fromStateType: true
            });
        } catch (error) {
            this.log('error', 'Failed to handle state patch:', error.message);
            throw error;
        }
    }

    /**
     * Set value for a state
     * @param {string} id - State identifier
     * @param {*} value - New value
     * @param {Object} options - Set options
     * @returns {Promise<*>} Set result
     */
    async setValue(id, value, options = {}) {
        this.log("debug", "LocalSessionStorageStateAdapter.setValue:", id, value);

        try {
            // Store the value in localStorage/sessionStorage
            const key = this._getStorageKey(id);
            this._storage.setItem(key, JSON.stringify(value));

            // Update StateType instance if it exists
            this._updateStateInstance(id, value, options);

            this.log("debug", "LocalSessionStorageStateAdapter.setValue completed for:", id);
            return value;

        } catch (error) {
            this.log("error", "LocalSessionStorageStateAdapter.setValue failed:", error.message);
            throw error;
        }
    }

    /**
     * Apply patch to data in storage
     * @param {string} id - Data identifier
     * @param {Array} patch - Patch operations
     * @param {Object} options - Patch options
     * @returns {Promise<*>} Patch result
     */
    async patchValue(id, patch, options = {}) {
        this.log("debug", "LocalSessionStorageStateAdapter.patchValue:", id, patch);

        try {
            const key = this._getStorageKey(id);
            let currentData = {};

            // Get current data from storage
            const stored = this._storage.getItem(key);
            if (stored !== null) {
                currentData = JSON.parse(stored);
            }

            // Apply patch to create new data
            const patchedData = applyPatch(currentData, patch, {
                immutable: true,
                create: true,
                nest: false
            });

            // Store the patched data
            this._storage.setItem(key, JSON.stringify(patchedData));

            // Update StateType instance if it exists (only if not coming from StateType to avoid loops)
            if (!options.fromStateType) {
                this._updateStateInstance(id, patchedData, options);

                // Emit patch event on StateType instance
                const stateInstance = this._stateInstances.get(id);
                if (stateInstance) {
                    stateInstance.emit('patch', patch, {
                        patch: patch,
                        tag: options.tag,
                        source: options.source,
                        reset: false,
                        status: options.status || 'success'
                    });
                }
            }

            this.log("debug", "LocalSessionStorageStateAdapter.patchValue completed for:", id);
            return patchedData;

        } catch (error) {
            this.log("error", "LocalSessionStorageStateAdapter.patchValue failed:", error.message);
            throw error;
        }
    }

    /**
     * Update a StateType instance with new data (called by adapter implementations)
     * @param {string} id - State identifier
     * @param {*} newData - New data value
     * @param {Object} options - Update options
     * @protected
     */
    _updateStateInstance(id, newData, options = {}) {
        const stateInstance = this._stateInstances.get(id);
        if (stateInstance && !options.fromStateType) {
            // Update the StateType's data without causing a loop
            stateInstance.data.value = newData;
        }
    }

    /**
     * Remove data for the given ID
     * @param {string} id - Data identifier
     * @returns {Promise<boolean>} True if data was removed
     */
    async remove(id) {
        const key = this._getStorageKey(id);

        try {
            this._storage.removeItem(key);
            const instanceRemoved = this._stateInstances.delete(id);
            return true;
        } catch (error) {
            this.log("error", "LocalSessionStorageStateAdapter.remove failed:", error.message);
            return false;
        }
    }

    /**
     * Get storage key for a given ID
     * @param {string} id - Data identifier
     * @returns {string} Storage key
     * @private
     */
    _getStorageKey(id) {
        return `${this._prefix}${id}`;
    }

    /**
     * Handle storage events from other tabs/windows
     * @param {StorageEvent} event - Storage event
     * @private
     */
    _handleStorageEvent(event) {
        if (!event.key || !event.key.startsWith(this._prefix)) {
            return;
        }

        const id = event.key.substring(this._prefix.length);
        const stateInstance = this._stateInstances.get(id);

        if (stateInstance && event.newValue !== null) {
            try {
                const newData = JSON.parse(event.newValue);
                this._updateStateInstance(id, newData, { fromStorage: true });
            } catch (error) {
                this.log('error', 'Failed to parse storage event data:', error.message);
            }
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', this._handleStorageEvent.bind(this));
        }
        super.destroy && super.destroy();
    }
}

export default LocalSessionStorageStateAdapter;

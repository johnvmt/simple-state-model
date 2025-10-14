// LocalSessionStorageStore v1.0.0 - Local/Session Storage implementation
import BaseStore from "./BaseStore.js";
import { createPatch, applyPatch } from "../utils/ObjectPatcher.js";

class LocalSessionStorageStore extends BaseStore {
    constructor(options = {}) {
        super(options);

        this._storage = options.storage || localStorage; // or sessionStorage
        this._prefix = options.prefix || 'simple-state-model:';
        this._listeners = new Map();

        // Listen for storage events from other tabs/windows
        if (typeof window !== 'undefined') {
            window.addEventListener('storage', this._handleStorageEvent.bind(this));
        }
    }

    /**
     * Get data from local/session storage
     * @param {string} id - Data identifier
     * @param {Object} options - Get options
     * @returns {Promise<*>} Data from storage
     */
    async get(id, options = {}) {
        try {
            const key = this._getStorageKey(id);
            const stored = this._storage.getItem(key);

            if (stored === null) {
                return options.defaultValue || {};
            }

            return JSON.parse(stored);
        } catch (error) {
            this._log('error', 'LocalStorage get failed:', error.message);
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
    async patch(id, patch, options = {}) {
        try {
            const key = this._getStorageKey(id);
            let currentData = {};

            const stored = this._storage.getItem(key);
            if (stored !== null) {
                currentData = JSON.parse(stored);
            }

            // Apply patch
            const patchedData = applyPatch(currentData, patch, {
                immutable: true
            });

            // Store the patched data
            this._storage.setItem(key, JSON.stringify(patchedData));

            // Notify subscribers (same tab/window)
            this._notifySubscribers(id, {
                patch,
                tag: options.tag,
                source: options.source || 'local',
                reset: false
            });

            this._log('debug', `LocalStorage patch applied to ${id}:`, patch);

            return { success: true, data: patchedData };
        } catch (error) {
            this._log('error', 'LocalStorage patch failed:', error.message);
            throw error;
        }
    }

    /**
     * Subscribe to data changes in storage
     * @param {string} id - Data identifier
     * @param {Object} options - Subscription options
     * @param {Function} callback - Change callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(id, options = {}, callback) {
        const subscriptionId = `${id}-${Math.random()}`;

        this._listeners.set(subscriptionId, {
            id,
            callback,
            options
        });

        this._log('info', `LocalStorage subscription started for ${id}`);

        // Return unsubscribe function
        return () => {
            this._listeners.delete(subscriptionId);
            this._log('info', `LocalStorage subscription stopped for ${id}`);
        };
    }

    /**
     * Set data directly (bypass patching)
     * @param {string} id - Data identifier
     * @param {*} data - Data to store
     * @param {Object} options - Set options
     * @returns {Promise<*>} Set result
     */
    async set(id, data, options = {}) {
        try {
            const key = this._getStorageKey(id);
            this._storage.setItem(key, JSON.stringify(data));

            // Notify subscribers of reset
            this._notifySubscribers(id, {
                patch: [], // Empty patch for reset
                tag: options.tag,
                source: options.source || 'local',
                reset: true
            });

            return { success: true, data };
        } catch (error) {
            this._log('error', 'LocalStorage set failed:', error.message);
            throw error;
        }
    }

    /**
     * Remove data from storage
     * @param {string} id - Data identifier
     * @returns {Promise<boolean>} True if removed
     */
    async remove(id) {
        try {
            const key = this._getStorageKey(id);
            this._storage.removeItem(key);

            // Notify subscribers of removal
            this._notifySubscribers(id, {
                patch: [{ op: 'replace', path: '', value: {} }],
                source: 'local',
                reset: true
            });

            return true;
        } catch (error) {
            this._log('error', 'LocalStorage remove failed:', error.message);
            return false;
        }
    }

    /**
     * Get storage key for data ID
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
        const oldData = event.oldValue ? JSON.parse(event.oldValue) : {};
        const newData = event.newValue ? JSON.parse(event.newValue) : {};

        // Create patch from old to new data
        const patch = createPatch(oldData, newData);

        this._notifySubscribers(id, {
            patch,
            source: 'external',
            reset: event.oldValue === null || event.newValue === null
        });
    }

    /**
     * Notify all subscribers for a given ID
     * @param {string} id - Data identifier
     * @param {Object} changeInfo - Change information
     * @private
     */
    _notifySubscribers(id, changeInfo) {
        for (const [subscriptionId, listener] of this._listeners) {
            if (listener.id === id) {
                try {
                    listener.callback(null, changeInfo);
                } catch (error) {
                    this._log('error', 'Subscriber callback error:', error.message);
                }
            }
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('storage', this._handleStorageEvent.bind(this));
        }
        this._listeners.clear();
    }
}

export default LocalSessionStorageStore;

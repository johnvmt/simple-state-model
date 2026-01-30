// StateControllerPatchMutation v1.0.0 - Simplified patch mutation
import StateControllerMutation from "./StateControllerMutation.js";
import { applyPatch } from "../../utils/ObjectPatcher.js";

class StateControllerPatchMutation extends StateControllerMutation {
    constructor(patch, options = {}) {
        super(options);

        // validate patch
        if (!Array.isArray(patch))
            throw new Error("Patch must be an array of operations");

        this._patch = patch;
    }

    /**
     * Get the patch operations
     * @returns {Array} The patch operations
     */
    get patch() {
        return this._patch;
    }

    /**
     * Apply patch mutation to value, returning the new value
     * @param {*} value - The value to patch
     * @param {Object} options - Patching options
     * @returns {*} The new patched value
     */
    apply(value, options = {}) {
        return applyPatch(
            value,
            this._patch,
            {
                nest: true, // re-map to allow mutations on root element
                immutable: true, // clone and apply to cloned object
                create: true, // create structure if needed (ie: allows setting nested value whose parent object does not exist)
                ...this.options,
                ...options
            }
        );
    }
}

export default StateControllerPatchMutation;

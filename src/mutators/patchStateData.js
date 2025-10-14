// patchStateData v1.0.0
import { applyPatch } from "../utils/ObjectPatcher.js";

/**
 * Apply a patch to state data
 * @param {StateDataType} stateData - The state data to patch
 * @param {Array} patch - RFC6902 JSON patch operations
 * @param {Object} options - Patching options
 * @returns {*} The result of the patch operation
 */
function patchStateData(stateData, patch, options = {}) {
    if (!stateData || !stateData.value) {
        throw new Error("Invalid state data provided");
    }

    if (!Array.isArray(patch)) {
        throw new Error("Patch must be an array of operations");
    }

    const mergedOptions = {
        immutable: false, // modify in place by default
        create: true, // create structure if needed
        ...options
    };

    try {
        // Apply patch to the state data's value
        const result = applyPatch(stateData.value, patch, mergedOptions);

        // If not immutable, the value was modified in place
        if (!mergedOptions.immutable) {
            stateData.value = result;
        }

        return result;
    } catch (error) {
        throw new Error(`Failed to apply patch: ${error.message}`);
    }
}

export default patchStateData;

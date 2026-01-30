// Object RFC6902 Patcher v0.0.2
import { applyPatch as rfc6902ApplyPatch, createPatch as rfc6902CreatePatch } from "rfc6902";
import { objectClone, pathPartsFromPath, objectCreatePath } from "object-path-utilities";

class PatchError extends Error {
    constructor(message, props) {
        super(message);
        Object.assign(this, props);
    }
}

/**
 * Apply patch parts one at a time, failing immediately if one part fails
 * @param value
 * @param patch
 * @returns {*}
 */
const patchApplyOrError = (value, patch) => {
    let mutated = false;
    for(let patchPart of patch) {
        if(!mutated && patchPart.op !== "test")
            mutated = true;
        const patchResultErrors = rfc6902ApplyPatch(value, [patchPart]);

        if(patchResultErrors[0] instanceof Error)
            throw new PatchError(patchResultErrors[0].message, {patch: patchPart, mutated: mutated});
    }

    return value;
}

const createPatchParents = (document, patchPart) => {
    if(patchPart?.op === 'add') {
        const pathParts = pathPartsFromPath(patchPart?.path, '/');
        if(pathParts.length > 1)
            return objectCreatePath(document, pathParts.slice(0, pathParts.length - 1));
    }

    return document;
}

const applyPatch = (document, patch, options = {}) => {
    const mergedOptions = {
        nest: true, // re-map to allow mutations on root element
        immutable: false, // clone and apply to cloned object
        create: true, // create structure if needed (ie: allows setting nested value whose parent object does not exist)
        ...options
    };

    // if immutable, clone the source before modifying the clone in-place
    const patchDocument = mergedOptions.immutable
        ? objectClone(document ?? {})
        : document;

    if(mergedOptions.create) {
        for(let patchPart of patch)
            createPatchParents(patchDocument, patchPart);
    }

    if(mergedOptions.nest) {
        // put value inside an object to be able to keep value by reference when patching
        let nestedPatchDocument = {
            value: patchDocument
        };

        // map the patches to the value inside the object
        const nestedPatch = patch.map(patchPart => {
            return {
                ...patchPart,
                path: `/value${patchPart.path}`
            };
        });

        return patchApplyOrError(nestedPatchDocument, nestedPatch).value;
    }
    else
        return patchApplyOrError(patchDocument, patch);
}

const createPatch = (document1, document2) => {
    return rfc6902CreatePatch(document1, document2);
}

export { applyPatch, createPatch, PatchError };

// StateMutationQueueType v1.0.0 - Simplified mutation processing
import { BaseEventEmitterController } from "utility-base-controllers";
import MapLinkedList from "../utils/MapLinkedList/MapLinkedList.js";
import StateMutationType from "./StateMutationType.js";
import { objectDeepEqual } from "object-path-utilities";

class StateMutationQueueType extends BaseEventEmitterController {
    constructor(options = {}) {
        super({
            ordered: false, // ordered mode processing - see comments below
            ...options
        });

        this._provisionalValue = options.value ?? {}; // set initial provisional value
        this._acceptedValue = this._provisionalValue; // set initial accepted value from provisional value
        this._mutationsByTag = new MapLinkedList();
        this._status = options.status ?? StateMutationQueueType.STATUSES.OK;
    }

    /**
     * Get current status
     * @returns {*|string}
     */
    get status() {
        return this._status;
    }

    /**
     * Set status and emit event if changed
     * @param newStatus
     */
    set status(newStatus) {
        if(newStatus !== this._status) {
            this._status = newStatus;
            if(this._status === StateMutationQueueType.STATUSES.OK)
                delete this._error;

            this.emit('status', this._status);
        }
    }

    /**
     * Get current error
     * @returns {*}
     */
    get error() {
        return this._error;
    }

    /**
     * Current state value including all mutations (accepted + provisional)
     * This is the "live" value users see with optimistic updates
     */
    get provisionalValue() {
        return this._provisionalValue;
    }

    /**
     * Set provisional value directly (bypassing mutations)
     * @param newValue
     */
    set provisionalValue(newValue) {
        this._provisionalValue = newValue;
    }

    /**
     * Set provisional value and optionally emit event
     * @param newValue
     * @param options
     */
    setProvisionalValue(newValue, options = {}) {
        const previousProvisionalValue = this._provisionalValue;

        if(newValue !== this._provisionalValue) {
            this._provisionalValue = newValue;

            if(options.emit !== false) {
                this.emit('provisionalValue', this._provisionalValue, {
                    previous: previousProvisionalValue,
                    ...options
                });
            }
        }
    }

    /**
     * Current state value including only accepted mutations
     * This is the "live" value users see with optimistic updates
     */
    get acceptedValue() {
        return this._acceptedValue;
    }

    /**
     * Set accepted value directly (bypassing mutations)
     * @param newValue
     */
    set acceptedValue(newValue) {
        this._acceptedValue = newValue;
    }

    /**
     * Set accepted value and optionally emit event
     * @param newValue
     * @param options
     */
    setAcceptedValue(newValue, options = {}) {
        const previousAcceptedValue = this._acceptedValue;

        if(newValue !== this._acceptedValue) {
            this._acceptedValue = newValue;

            if(options.emit !== false) {
                this.emit('acceptedValue', this._acceptedValue, {
                    previous: previousAcceptedValue,
                    ...options
                });
            }
        }
    }

    /**
     * Add a mutation to the queue
     */
    add(mutation) {
        // Handle existing mutations with same tag
        if(this.hasMutationTag(mutation.tag))
            this._updateMutationInQueue(mutation);
        else {
            try {
                const mutatedProvisionalValue = mutation.apply(this._provisionalValue);

                this._mutationsByTag.append(mutation.tag, mutation);

                // Listen for status changes
                mutation.once("close", (status) => {
                    if (status === StateMutationType.STATUSES.REJECTED) { // rejecting a mutation that was already in the queue
                        // TODO handle multiple simultaneous closures
                        this._mutationsByTag.remove(mutation.tag);
                        this._recalculateProvisionalValue({ mutation: mutation});
                    }
                    else if(status === StateMutationType.STATUSES.ACCEPTED) {
                        this._recalculateAcceptedValue({ mutation: mutation});
                    }
                });


                this.setProvisionalValue(mutatedProvisionalValue, {
                    mutation: mutation,
                    trigger: StateMutationQueueType.MUTATIONTRIGGERS.MUTATION
                });

                this.emit('mutation-added', mutation);
            }
            catch(error) {
                // TODO handle case where accepted mutation (from server) is rejected locally
                this.log("error", "Failed to apply mutation:", error.message);
                mutation.reject(error);
                throw error;
            }
        }
    }

    /**
     * Check if a mutation with the given tag exists
     * @param tag
     * @returns {*}
     */
    hasMutationTag(tag) {
        return this._mutationsByTag.has(tag);
    }

    /**
     * Clear all mutations and reset to accepted value
     */
    empty() {
        // Reject all open mutations
        for (let mutation of this._mutationsByTag.values) {
            if(!mutation.closed)
                mutation.reject({ dependency: true });
        }

        this._mutationsByTag.empty();
        this.setProvisionalValue(this._acceptedValue);
    }

    /**
     * Rebuild the entire state value from accepted value + all mutations in order
     */
    _recalculateProvisionalValue(options = {}) {
        // Start with accepted value
        let mutatedProvisionalValue = this._acceptedValue;

        // Apply all mutations in order
        for (let mutation of this._mutationsByTag.values) {
            try {
                mutatedProvisionalValue = mutation.apply(this._provisionalValue); // applies immutably
            }
            catch (error) {
                // TODO enter error state
                this.log("error", "Failed to apply mutation during rebuild:", error.message);
                // Continue with other mutations
            }
        }

        this.setProvisionalValue(mutatedProvisionalValue, {
            trigger: StateMutationQueueType.MUTATIONTRIGGERS.RECALCULATE
        }); // TODO add a reason
    }

    /**
     * Update accepted value by applying only accepted mutations
     */
    _recalculateAcceptedValue() {
        // TODO check if we need a recalculation

        let mutatedAcceptedValue = this._acceptedValue;

        // Find all accepted mutations and apply them to accepted value
        for (let mutation of this._mutationsByTag.values) {
            if (mutation.status === StateMutationType.STATUSES.ACCEPTED) {
                try {
                    mutatedAcceptedValue = mutation.apply(mutatedAcceptedValue);
                }
                catch (error) {
                    this.log("error", "Failed to apply accepted mutation:", error.message);
                }
            }
        }

        // Remove processed accepted mutations from queue
        const mutationsToRemove = [];
        for (let [mutationTag, mutation] of this._mutationsByTag.entries) {
            if (mutation.status === StateMutationType.STATUSES.ACCEPTED) {
                mutationsToRemove.push(mutationTag);
            }
        }
        mutationsToRemove.forEach(mutationTag => this._mutationsByTag.remove(mutationTag));

        this.setAcceptedValue(mutatedAcceptedValue, {
            trigger: StateMutationQueueType.MUTATIONTRIGGERS.RECALCULATE
        })
    }

    /**
     * Handle adding mutation when tag already exists
     */
    _updateMutationInQueue(newMutation) {
        const existing = this._mutationsByTag.get(newMutation.tag);

        // If same content, handle status transitions
        if(this._samePatch(existing.patch, newMutation.patch)) {
            if (existing.status === StateMutationType.STATUSES.PROVISIONAL) {
                if (newMutation.status === StateMutationType.STATUSES.ACCEPTED) {
                    existing.accept();
                    return;
                }
                else if (newMutation.status === StateMutationType.STATUSES.REJECTED) {
                    existing.reject();
                    return;
                }
            }
            throw new Error(`Mutation already exists with status ${existing.status}`);
        }

        // Different content - replace the mutation
        const replacedMutation = existing;
        this._mutationsByTag.remove(existing.tag);
        if (!existing.closed) {
            existing.reject({
                error: new Error("Mutation replaced by updated version"),
                dependency: true
            });
        }

        // Emit mutation replaced event
        this.emit('mutation-replaced', { old: replacedMutation, new: newMutation });
    }

    static STATUSES = {
        "OK": "OK",
        "ERROR": "ERROR",
        "LOADING": "LOADING"
    }

    static MUTATIONTRIGGERS = {
        "RESET": "RESET",
        "RECALCULATE": "RECALCULATE",
        "MUTATION": "MUTATION",
    }

    /**
     * Simple deep clone using structuredClone
     */
    _cloneValue(value) {
        if (value === null || value === undefined || typeof value !== 'object')
            return value;
        else
            return structuredClone(value);
    }

    /**
     * Compare two patches for equality using deep comparison
     */
    _samePatch(patch1, patch2) {
        return objectDeepEqual(patch1, patch2);
    }
}

export default StateMutationQueueType;

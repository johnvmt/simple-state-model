// StateMutationQueueType v1.0.0 - Updated to use 'authoritative'
import {StateMutationType, StateMutationTypeError} from "./StateMutationType.js";
import MapLinkedList from "../utils/MapLinkedList/MapLinkedList.js";
import SimpleEventEmitter from "simple-utility-event-emitter";

class StateMutationQueueType extends SimpleEventEmitter {
    constructor(state, options = {}) {
        super();
        this._state = state;
        this._options = {
            ordered: false, // ordered mode, default off
            logger: null, // no default logger - only log when explicitly provided
            authoritative: false, // authoritative mode
            ...options
        }

        this._mutationsByTag = new MapLinkedList(); // mutations in added order, by tag
    }

    get data() {
        return this._state.data;
    }

    get acceptedData() {
        if(!this._acceptedData)
            this._acceptedData = this.data.clone();

        return this._acceptedData;
    }

    get size() {
        return this._mutationsByTag.size;
    }

    hasTag(tag) {
        return this._mutationsByTag.has(tag);
    }

    empty() {
        for(let mutation of this._mutationsByTag.values) {
            if(!mutation.closed)
                mutation.reject({dependency: true});
        }

        this._mutationsByTag.empty();
    }

    add(mutation) {
        if(!mutation.tag)
            throw new Error("Mutation missing tag");

        if(this.hasTag(mutation.tag))
            throw new Error("Mutation already in queue");

        this._log("debug", "Adding mutation to queue:", mutation.tag, "authoritative:", mutation.authoritative, "status:", mutation.status);

        // Handle authoritative patches (immediately accepted/rejected)
        if (mutation.authoritative) {
            this._log("debug", "Processing authoritative patch:", mutation.tag);
            return this._addAuthoritativePatch(mutation);
        }

        // Handle mutations based on status
        if(mutation.status === StateMutationType.STATUSES.PROVISIONAL) {
            this._log("debug", "Processing provisional mutation:", mutation.tag);
            this._addProvisionalMutation(mutation);
        }
        else if(mutation.status === StateMutationType.STATUSES.ACCEPTED) {
            this._log("debug", "Processing accepted mutation:", mutation.tag);
            this._addAcceptedMutation(mutation);
        }
        else if(mutation.status === StateMutationType.STATUSES.IDLE) {
            this._log("debug", "Processing IDLE mutation as provisional:", mutation.tag);
            // Non-authoritative IDLE mutations should be treated as provisional
            this._addProvisionalMutation(mutation);
        }
    }

    /**
     * Handle authoritative patches (immediately accepted/rejected)
     * @param {StateMutationType} mutation
     * @private
     */
    _addAuthoritativePatch(mutation) {
        try {
            // Apply the patch directly to the data
            const result = mutation.applyData(this.data);

            // Add to queue
            this._mutationsByTag.append(mutation.tag, mutation);

            // Accept the mutation immediately
            mutation.accept();

            // Update state data
            this._state.setData(this._state.data, {emit: true});

            // Emit patch event immediately with ACCEPTED status
            this._state.emit('patch', mutation.patch, {
                tag: mutation.tag,
                status: StateMutationType.STATUSES.ACCEPTED,
                source: mutation.source,
                authoritative: true
            });

        } catch(error) {
            // Reject the mutation
            mutation.reject({ error });

            // Emit patch event with REJECTED status
            this._state.emit('patch', mutation.patch, {
                tag: mutation.tag,
                status: StateMutationType.STATUSES.REJECTED,
                source: mutation.source,
                authoritative: true,
                error: error
            });
        }
    }

    /**
     * Handle mutations in local mode
     * @param {StateMutationType} mutation
     * @private
     */
    _addLocalMutation(mutation) {
        try {
            mutation.apply({
                data: this.data
            });

            this._mutationsByTag.append(mutation.tag, mutation);
            this._state.setData(this._state.data, {emit: true});

            // In local mode, successful application means it's accepted
            if (mutation.status === StateMutationType.STATUSES.IDLE) {
                mutation.accept();
            }

        } catch(error) {
            this._log("error", "Mutation application failed in local mode:", error.message);
            mutation.reject({ error });

            if(!(error instanceof StateMutationTypeError && !error.mutated)) {
                this._applyQueueToAcceptedDataOrdered();
            }
        }
    }

    /**
     * Handle provisional mutations (legacy mode)
     * @param {StateMutationType} mutation
     * @private
     */
    _addProvisionalMutation(mutation) {
        try {
            mutation.apply({
                data: this.data
            });

            // Emit patch event for provisional mutations
            if (this._state && typeof this._state.emit === 'function') {
                this._state.emit('patch', mutation.patch, {
                    tag: mutation.tag,
                    status: mutation.status,
                    source: mutation.source,
                    authoritative: mutation.authoritative
                });
            }

            mutation.once("close", (status, options) => {
                if(status === StateMutationType.STATUSES.REJECTED) {
                    this._mutationsByTag.remove(mutation.tag);

                    if(!options.dependency)
                        this._applyQueueToAcceptedDataOrdered();
                }
                else if(status === StateMutationType.STATUSES.ACCEPTED)
                    this._mergeLeadingAcceptedMutations();
            });

            this._mutationsByTag.append(mutation.tag, mutation);
            this._state.data = this.data;

        } catch(error) {
            this._log("error", "Provisional mutation application failed:", error.message);
            mutation.reject({ error });

            // Emit patch event for failed provisional mutations
            if (this._state && typeof this._state.emit === 'function') {
                this._state.emit('patch', mutation.patch, {
                    tag: mutation.tag,
                    status: mutation.status,
                    source: mutation.source,
                    authoritative: mutation.authoritative,
                    error: error
                });
            }

            if(!(error instanceof StateMutationTypeError && !error.mutated))
                this._applyQueueToAcceptedDataOrdered();
        }
    }

    /**
     * Handle accepted mutations (legacy mode)
     * @param {StateMutationType} mutation
     * @private
     */
    _addAcceptedMutation(mutation) {
        if(!this._options.ordered) {
            try {
                mutation.apply({data: this.data});

                this._mutationsByTag.append(mutation.tag, mutation);
                this._mergeLeadingAcceptedMutations();

                // Emit patch event for accepted mutations
                if (this._state && typeof this._state.emit === 'function') {
                    this._state.emit('patch', mutation.patch, {
                        tag: mutation.tag,
                        status: mutation.status,
                        source: mutation.source,
                        authoritative: mutation.authoritative
                    });
                }

                this._state.setData(this._state.data, {emit: true});
                return;
            }
            catch(error) {
                this._log("warn", "Unordered mutation application failed, retrying in ordered mode:", error.message);
            }
        }

        // Ordered mode fallback
        this._mutationsByTag.append(mutation.tag, mutation);
        this._applyQueueToAcceptedDataOrdered();

        // Emit patch event for ordered accepted mutations
        if (this._state && typeof this._state.emit === 'function') {
            this._state.emit('patch', mutation.patch, {
                tag: mutation.tag,
                status: mutation.status,
                source: mutation.source,
                authoritative: mutation.authoritative
            });
        }
    }

    _mergeLeadingAcceptedMutations() {
        let leadingMutation = this._mutationsByTag.first;

        while(leadingMutation && leadingMutation.status === StateMutationType.STATUSES.ACCEPTED) {
            try {
                leadingMutation.apply({data: this.acceptedData});
                this._mutationsByTag.removeFirst();
                leadingMutation = this._mutationsByTag.first;
            }
            catch(error) {
                this._log("error", "ERROR STATE! Accepted mutation failed to apply in leading:", error.message);
                break;
            }
        }
    }

    _applyQueueToAcceptedDataOrdered() {
        this._acceptedData = this.data.clone();

        for(let mutation of this._mutationsByTag.values) {
            if(mutation.status === StateMutationType.STATUSES.ACCEPTED) {
                try {
                    mutation.apply({
                        data: this._acceptedData,
                        save: false
                    });
                }
                catch(error) {
                    this._log("error", "ERROR STATE! Accepted mutation failed to apply:", error.message);
                }
            }
            else if(mutation.status === StateMutationType.STATUSES.PROVISIONAL) {
                try {
                    mutation.apply({
                        data: this._acceptedData,
                        save: false
                    });
                }
                catch(error) {
                    if(mutation.status === StateMutationType.STATUSES.PROVISIONAL) {
                        this._log("warn", "Non-provisional mutation found in the queue");
                    }
                }
            }
        }

        try {
            this._state.setData(this._acceptedData.clone(), {emit: true});
        }
        catch(error) {
            this._log("error", "Error while attempting to apply provisional queue:", error.message);
        }
    }

    /**
     * Log a message using the configured logger
     * @param {string} level - Log level (info, warn, error, debug)
     * @param {...any} messageParts - Message parts to log
     * @private
     */
    _log(level, ...messageParts) {
        if (this._options.logger && typeof this._options.logger[level] === 'function') {
            this._options.logger[level](...messageParts);
        }
    }
}

export default StateMutationQueueType;

import SimpleEventEmitter from "simple-utility-event-emitter";
import StateSubscriber from "./StateSubscriber.js";
import StateSubscriberManager from "./StateSubscriberManager.js";

class StateSubscriptionModel extends SimpleEventEmitter {
    constructor(stateModel) {
        super();
        this._stateModel = stateModel;

        this._stateSubscriberManagersByProviderStateID = new Map();
    }

    /**
     * Check if a state subscriber manager exists for the given provider and state ID
     * @param providerID
     * @param stateID
     * @returns {*|boolean}
     * @private
     */
    _hasStateSubscriberManager(providerID, stateID) {
        if(!this._stateSubscriberManagersByProviderStateID.has(providerID))
            return false;

        return this._stateSubscriberManagersByProviderStateID.get(providerID).has(stateID);
    }

    /**
     * Load or create the state subscriber manager for the given provider and state ID
     * @param providerID
     * @param stateID
     * @returns {*}
     * @private
     */
    _loadStateSubscriberManager(providerID, stateID) {
        // provider isn't being tracked
        if(!this._stateSubscriberManagersByProviderStateID.has(providerID))
            this._stateSubscriberManagersByProviderStateID.set(providerID, new Map());

        // state isn't being tracked for provider
        if(!this._stateSubscriberManagersByProviderStateID.get(providerID).has(stateID)) {
            const stateSubscriberManager = new StateSubscriberManager();

            stateSubscriberManager.on('subscriber-add', (stateSubscriber) => {
                this.emit('subscriber-add', providerID, stateID, stateSubscriber);
            });

            stateSubscriberManager.on('subscriber-remove', (stateSubscriber) => {
                this.emit('subscriber-remove', providerID, stateID, stateSubscriber);
            });
            
            stateSubscriberManager.on('destroy', () => {
                this._stateSubscriberManagersByProviderStateID.get(providerID).delete(stateID);
            });

            this._stateSubscriberManagersByProviderStateID.get(providerID).set(stateID, stateSubscriberManager);
        }
        
        return this._stateSubscriberManagersByProviderStateID.get(providerID).get(stateID);
    }

    /**
     * Get the state model
     * @returns {*}
     */
    get stateModel() {
        return this._stateModel;
    }

    async subscribeStatePatches(providerIDOrUndefined, stateID, options, context, callback) {
        const providerID = this.stateModel.providerID(providerIDOrUndefined); // resolve the provider ID (falls back to default)

        // add subscriber to tracker set
        const stateSubscriberManager = this._loadStateSubscriberManager(providerID, stateID);
        const stateSubscriber = new StateSubscriber(options?.subscriber);
        const removeSubscriber = stateSubscriberManager.addSubscriber(stateSubscriber);

        const stateController = await this.stateModel.load(providerID, stateID); // stateID passed as providerOptions

        const cancelStatePatchSubscription = stateController.on('patch', (patch, patchOptions) => {
            if(options.exclude_source === undefined || patchOptions?.source !== options.exclude_source) // no exclusions, or source doesn't match excluded source
                callback(patch, patchOptions);
        });

        // send current value in the same format as a patch
        callback(
            [
                {
                    op: "replace",
                    path: "",
                    value: stateController.value
                }
            ],
            {
                reset: true,
                state: stateController
            }
        );

        // returns cancel function
        return () => {
            cancelStatePatchSubscription();
            removeSubscriber();
        }
    }

    stateSubscribers(providerIDOrUndefined, stateID, options, context) {
        const providerID = this.stateModel.providerID(providerIDOrUndefined); // resolve the provider ID (falls back to default)
        if(this._hasStateSubscriberManager(providerID, stateID)) {
            const stateSubscriberManager = this._loadStateSubscriberManager(providerID, stateID);
            return stateSubscriberManager.subscribers(options)
        }
        else
            return [];
    }

    subscribeStateSubscribers(providerIDOrUndefined, stateID, options, context, callback) {
        const providerID = this.stateModel.providerID(providerIDOrUndefined); // resolve the provider ID (falls back to default)

        // add subscriber to tracker set
        const stateSubscriberManager = this._loadStateSubscriberManager(providerID, stateID);
        const stateSubscriber = new StateSubscriber({
            count: false, // default = don't count subscribers to the subscriber list
            ...options?.subscriber ?? {}
        });
        const removeSubscriber = stateSubscriberManager.addSubscriber(stateSubscriber);

        const cancelSubscribersSubscription = stateSubscriberManager.on('subscribers-change', callback);

        return () => {
            removeSubscriber();
            cancelSubscribersSubscription();
        }
    }

    /**
     * Get the count of state subscribers for the given provider and state ID
     * @param providerIDOrUndefined
     * @param stateID
     * @param options
     * @param context
     * @returns {number|*}
     */
    stateSubscribersCount(providerIDOrUndefined, stateID, options, context) {
        const providerID = this.stateModel.providerID(providerIDOrUndefined); // resolve the provider ID (falls back to default)
        if(this._hasStateSubscriberManager(providerID, stateID)) {
            const stateSubscriberManager = this._loadStateSubscriberManager(providerID, stateID);
            return stateSubscriberManager.subscribersCount;
        }
        else
            return 0;
    }



    async patchState(providerIDOrUndefined, stateID, patch, options, context) {
        const providerID = this.stateModel.providerID(providerIDOrUndefined); // resolve the provider ID (falls back to default)
        const stateController = await this.stateModel.load(providerID, stateID); // stateID passed as providerOptions
        return stateController.patch(patch, options);
    }

    async loadState(providerIDOrUndefined, stateID, context) {
        const providerID = this.stateModel.providerID(providerIDOrUndefined); // resolve the provider ID (falls back to default)
        return await this.stateModel.load(providerID, stateID); // stateID passed as providerOptions
    }
}

export default StateSubscriptionModel;
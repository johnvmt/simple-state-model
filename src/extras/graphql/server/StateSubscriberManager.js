import debounce from "simple-utility-debounce";
import { BaseEventEmitterController } from "utility-base-controllers";

class StateSubscriberManager extends BaseEventEmitterController {
    constructor(options = {}) {
        super({
            destroyOnEmpty: true,
            subscriberStatsDebounce: 500,
            ...options
        });

        this._subscribers = new Set();
        this._debouncedEmitSubscribersStats = debounce(() => {
            this.emit('subscribers-change');
        }, this.options.subscriberStatsDebounce);

        this.on('subscriber-add', () => this._debouncedEmitSubscribersStats());
        this.on('subscriber-remove', () => this._debouncedEmitSubscribersStats());
    }

    /**
     * Get count of subscribers
     * @returns {number}
     */
    get subscribersCount() {
        let count = 0;
        for(const subscriber of this._subscribers) {
            if(subscriber.count)
                count += 1;
        }
        return count;
    }

    /**
     * Get subscribers, with options to include/exclude anonymous subscribers
     * @param options
     * @returns {*[]}
     */
    subscribers(options = {}) {
        let filteredSubscribers = [];

        for(let subscriber of this._subscribers) {
            if(
                subscriber.count // only incluce countable subscribers (subscribers listening for mutations)
                && (!subscriber.anonymous || (options.include_anonymous || options.include_anonymous === undefined)) // handle anonymous flag
            )
                filteredSubscribers.push(subscriber);
        }

        return filteredSubscribers;
    }

    addSubscriber(subscriber) {
         if(!this._subscribers.has(subscriber)) {
            this._subscribers.add(subscriber);
            this.emit('subscriber-add', subscriber);
         }

         return () => {
             this.removeSubscriber(subscriber);
         }
    }

    removeSubscriber(subscriber) {
        if(this._subscribers.has(subscriber)) {
            this._subscribers.delete(subscriber);
            this.emit('subscriber-remove', subscriber);
        }

        if(this._subscribers.size === 0 && this.options.destroyOnEmpty)
            this.destroy()
    }

    destroy() {
        this.emit('destroy');
        super.destroy();
    }
}

export default StateSubscriberManager;
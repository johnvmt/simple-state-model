// MapLinkedListNode v0.0.1
class MapLinkedListNode {
    constructor(key, value) {
        this._key = key;
        this._value = value;
    }

    get key() {
        return this._key;
    }

    set value(value) {
        this._value = value;
    }

    get value() {
        return this._value;
    }

    get hasNext() {
        return this.next !== undefined;
    }

    get hasPrev() {
        return this.prev !== undefined;
    }

    get next() {
        return this._nextNode;
    }

    get prev() {
        return this._prevNode;
    }
}

export default MapLinkedListNode;

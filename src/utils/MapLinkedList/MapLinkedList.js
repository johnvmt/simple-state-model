// MapLinkedList v0.0.1

import MapLinkedListNode from "./MapLinkedListNode.js";

class MapLinkedList {
    constructor() {
        this.empty(); // creates new map
    }

    *[Symbol.iterator]() {
        let node = this._headNode;

        while(node) {
            yield node;
            node = node.next;
        }
    }

    get nodes() {
        const nodes = [];
        let node = this._headNode;

        while(node) {
            nodes.push(node);
            node = node.next;
        }

        return nodes;
    }

    get keys() {
        const keys = [];
        let node = this._headNode;

        while(node) {
            keys.push(node.key);
            node = node.next;
        }

        return keys;
    }

    get values() {
        const values = [];
        let node = this._headNode;

        while(node) {
            values.push(node.value);
            node = node.next;
        }

        return values;
    }

    get entries() {
        const entries = [];
        let node = this._headNode;

        while(node) {
            entries.push([node.key, node.value]);
            node = node.next;
        }

        return entries;
    }

    empty() {
        // TODO option to disconnect all nodes from each other
        this._nodes = new Map();
        delete this._headNode;
        delete this._tailNode;
    }

    get size() {
        return this._nodes.size;
    }

    get head() {
        return this._headNode;
    }

    get tail() {
        return this._tailNode;
    }

    has(key) {
        return this._nodes.has(key);
    }

    append(key, value) {
        if(this.has(key))
            throw new Error("Node with key exists. Remove it before inserting.");

        const node = new MapLinkedListNode(key, value);

        if(this._tailNode) { // if there's a tail
            this._tailNode._nextNode = node; // set the tail's next to the new node
            node._prevNode = this._tailNode; // set the new node's prev to the tail node
        }
        else // no tail, list of 1
            this._headNode = node; // set the head to the new node

        this._tailNode = node; // set the tail to the new node

        this._nodes.set(key, node); // add to the node set
    }

    prepend(key, value) {
        if(this.has(key))
            throw new Error("Node with key exists. Remove it before inserting.");

        const node = new MapLinkedListNode();

        if(this._headNode) { // if there's a head
            this._headNode._prevNode = node; // set the head's prev to the new node
            node._nextNode = this._headNode; // set the new node's next to the head node
        }
        else // no head, list of 1
            this._tailNode = node; // set the tail to the new node

        this._headNode = node; // set the head to the new node

        this._nodes.set(key, node); // add to the node set
    }

    value(key) {
        if(!this.has(key))
            throw new Error("Node with key does not exist");

        return this._nodes.get(key).value;
    }

    remove(key) {
        if(!this.has(key))
            throw new Error("Node with key does not exist");

        const node = this._nodes.get(key);

        if(node.hasPrev) // node has a node before it
            node.prev._nextNode = node.next; // set previous node's next ref to node's next

        if(node.hasNext) // node has a node after it
            node.next._prevNode = node.prev // set next node's prev ref to node's prev

        if(this._headNode === node) // node was at head
            this._headNode = node.next; // set head to next node

        if(this._tailNode === node) // node was at tail
            this._tailNode = node.prev;

        this._nodes.delete(key);
    }
}

export default MapLinkedList;

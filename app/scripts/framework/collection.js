import EventEmitter from 'events';

const SymbolEvents = Symbol('events');

function emitSet(target, property, value, receiver, prevValue) {
    const emitter = target[SymbolEvents];
    if (!emitter.paused) {
        const updates = { added: [], removed: [] };
        if (prevValue) {
            emitter.emit('remove', prevValue, receiver);
            updates.removed.push(prevValue);
        }
        if (value) {
            emitter.emit('add', value, receiver);
            updates.added.push(value);
        }
        emitter.emit('change', updates, this);
    }
}

function emitRemoved(target, removed, receiver) {
    const emitter = target[SymbolEvents];
    if (!emitter.paused) {
        for (const item of removed) {
            emitter.emit('remove', item, receiver);
        }
        emitter.emit('change', { added: [], removed }, this);
    }
}

const ProxyDef = {
    set(target, property, value, receiver) {
        if (property === 'length') {
            if (value < target.length) {
                const removed = target.slice(value);
                emitRemoved(target, removed, receiver);
            }
            target.length = value;
            return true;
        }
        const numProp = parseInt(property);
        if (isNaN(numProp)) {
            return false;
        }
        const modelClass = target.constructor.model;
        if (!modelClass) {
            throw new Error(`Model type not defined for ${receiver.constructor.name}`);
        }
        if (value && !(value instanceof modelClass)) {
            throw new Error(
                `Attempt to write ${value.constructor.name} into ${receiver.constructor.name}`
            );
        }
        const prevValue = target[property];
        if (prevValue !== value) {
            target[property] = value;
            emitSet(target, property, value, receiver, prevValue);
        }
        return true;
    }
};

class Collection extends Array {
    constructor(...args) {
        super(...args);

        const emitter = new EventEmitter();
        emitter.setMaxListeners(100);

        const properties = {
            [SymbolEvents]: { value: emitter }
        };

        Object.defineProperties(this, properties);

        return new Proxy(this, ProxyDef);
    }

    push(...items) {
        if (items.length) {
            this[SymbolEvents].paused = true;
            super.push(...items);
            this[SymbolEvents].paused = false;
            for (const item of items) {
                this[SymbolEvents].emit('add', item, this);
            }
            this[SymbolEvents].emit('change', { added: items, removed: [] }, this);
        }
    }

    pop() {
        this[SymbolEvents].paused = true;
        const item = super.pop();
        this[SymbolEvents].paused = false;
        if (item) {
            this[SymbolEvents].emit('remove', item, this);
            this[SymbolEvents].emit('change', { added: [], removed: [item] }, this);
        }
    }

    shift() {
        this[SymbolEvents].paused = true;
        const item = super.shift();
        this[SymbolEvents].paused = false;
        if (item) {
            this[SymbolEvents].emit('remove', item, this);
            this[SymbolEvents].emit('change', { added: [], removed: [item] }, this);
        }
    }

    unshift(...items) {
        if (items.length) {
            this[SymbolEvents].paused = true;
            super.unshift(...items);
            this[SymbolEvents].paused = false;
            for (const item of items) {
                this[SymbolEvents].emit('add', item, this);
            }
            this[SymbolEvents].emit('change', { added: items, removed: [] }, this);
        }
    }

    splice(start, deleteCount, ...items) {
        this[SymbolEvents].paused = true;
        const removed = super.splice(start, deleteCount, ...items);
        this[SymbolEvents].paused = false;
        for (const item of removed) {
            this[SymbolEvents].emit('remove', item, this);
        }
        for (const item of items) {
            this[SymbolEvents].emit('add', item, this);
        }
        if (removed.length || items.length) {
            this[SymbolEvents].emit('change', { added: items, removed }, this);
        }
    }

    on(eventName, listener) {
        this[SymbolEvents].on(eventName, listener);
    }

    once(eventName, listener) {
        this[SymbolEvents].once(eventName, listener);
    }

    off(eventName, listener) {
        this[SymbolEvents].off(eventName, listener);
    }

    get(id) {
        return this.find(model => model.id === id);
    }

    remove(idOrModel) {
        for (let i = 0; i < this.length; i++) {
            while (i < this.length && (this[i].id === idOrModel || this[i] === idOrModel)) {
                this.splice(i, 1);
            }
        }
    }
}

export { Collection };

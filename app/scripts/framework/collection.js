import EventEmitter from 'events';

const SymbolEvents = Symbol('events');
const SymbolArray = Symbol('array');

function emitSet(target, value, prevValue) {
    const emitter = target[SymbolEvents];
    if (!emitter.paused) {
        const updates = { added: [], removed: [] };
        if (prevValue) {
            emitter.emit('remove', prevValue, target);
            updates.removed.push(prevValue);
        }
        if (value) {
            emitter.emit('add', value, target);
            updates.added.push(value);
        }
        emitter.emit('change', updates, target);
    }
}

function emitRemoved(target, removed) {
    const emitter = target[SymbolEvents];
    if (!emitter.paused) {
        for (const item of removed) {
            emitter.emit('remove', item, target);
        }
        emitter.emit('change', { added: [], removed }, target);
    }
}

function checkType(target, value) {
    const modelClass = target.constructor.model;
    if (!modelClass) {
        throw new Error(`Model type not defined for ${target.constructor.name}`);
    }
    if (!(value instanceof modelClass)) {
        const valueType = value && value.constructor ? value.constructor.name : typeof value;
        throw new Error(`Attempt to write ${valueType} into ${target.constructor.name}`);
    }
}

const ProxyDef = {
    set(target, property, value) {
        const numProp = parseInt(property);
        if (isNaN(numProp)) {
            target[property] = value;
            return true;
        }
        checkType(target, value);
        const array = target[SymbolArray];
        const prevValue = array[property];
        if (prevValue !== value) {
            array[property] = value;
            emitSet(target, value, prevValue);
        }
        return true;
    },

    get(target, property) {
        if (typeof property !== 'string') {
            return target[property];
        }
        const numProp = parseInt(property);
        if (isNaN(numProp)) {
            return target[property];
        }
        return target[SymbolArray][property];
    }
};

class Collection {
    constructor(items) {
        const emitter = new EventEmitter();
        emitter.setMaxListeners(100);

        const properties = {
            [SymbolEvents]: { value: emitter },
            [SymbolArray]: { value: [] }
        };

        Object.defineProperties(this, properties);

        if (items) {
            this.push(...items);
        }

        return new Proxy(this, ProxyDef);
    }

    get length() {
        return this[SymbolArray].length;
    }

    set length(value) {
        const array = this[SymbolArray];
        let removed;
        if (value < array.length) {
            removed = array.slice(value);
        }
        array.length = value;
        if (removed) {
            emitRemoved(this, removed);
        }
    }

    push(...items) {
        if (items.length) {
            for (const item of items) {
                checkType(this, item);
            }
            this[SymbolEvents].paused = true;
            this[SymbolArray].push(...items);
            this[SymbolEvents].paused = false;
            for (const item of items) {
                this[SymbolEvents].emit('add', item, this);
            }
            this[SymbolEvents].emit('change', { added: items, removed: [] }, this);
        }
    }

    pop() {
        this[SymbolEvents].paused = true;
        const item = this[SymbolArray].pop();
        this[SymbolEvents].paused = false;
        if (item) {
            this[SymbolEvents].emit('remove', item, this);
            this[SymbolEvents].emit('change', { added: [], removed: [item] }, this);
        }
        return item;
    }

    shift() {
        this[SymbolEvents].paused = true;
        const item = this[SymbolArray].shift();
        this[SymbolEvents].paused = false;
        if (item) {
            this[SymbolEvents].emit('remove', item, this);
            this[SymbolEvents].emit('change', { added: [], removed: [item] }, this);
        }
        return item;
    }

    unshift(...items) {
        if (items.length) {
            for (const item of items) {
                checkType(this, item);
            }
            this[SymbolEvents].paused = true;
            this[SymbolArray].unshift(...items);
            this[SymbolEvents].paused = false;
            for (const item of items) {
                this[SymbolEvents].emit('add', item, this);
            }
            this[SymbolEvents].emit('change', { added: items, removed: [] }, this);
        }
    }

    splice(start, deleteCount, ...items) {
        for (const item of items) {
            checkType(this, item);
        }
        this[SymbolEvents].paused = true;
        const removed = this[SymbolArray].splice(start, deleteCount, ...items);
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
        return this.find((model) => model.id === id);
    }

    remove(idOrModel) {
        for (let i = 0; i < this.length; i++) {
            while (i < this.length && (this[i].id === idOrModel || this[i] === idOrModel)) {
                this.splice(i, 1);
            }
        }
    }

    sort() {
        return this[SymbolArray].sort(this.comparator);
    }

    fill() {
        throw new Error('Not implemented');
    }

    copyWithin() {
        throw new Error('Not implemented');
    }

    toJSON() {
        return this[SymbolArray].concat();
    }
}

const ProxiedArrayMethods = [
    Symbol.iterator,
    'concat',
    'entries',
    'every',
    'filter',
    'find',
    'findIndex',
    'flat',
    'flatMap',
    'forEach',
    'includes',
    'indexOf',
    'join',
    'keys',
    'lastIndexOf',
    'map',
    'reduce',
    'reduceRight',
    'reverse',
    'slice',
    'some',
    'values'
];

for (const method of ProxiedArrayMethods) {
    Object.defineProperty(Collection.prototype, method, {
        value: function proxyMethod(...args) {
            return this[SymbolArray][method](...args);
        }
    });
}

export { Collection };

import EventEmitter from 'events';

const SymbolEvents = Symbol('events');
const SymbolDefaults = Symbol('defaults');

function emitPropChange(target, property, value, receiver) {
    const emitter = target[SymbolEvents];
    if (!emitter.paused) {
        emitter.emit('change:' + property, receiver, value);
        if (!emitter.noChange) {
            emitter.emit('change', receiver, { [property]: value });
        }
    }
}

const ProxyDef = {
    deleteProperty(target, property, receiver) {
        if (Object.prototype.hasOwnProperty.call(target, property)) {
            const value = target[SymbolDefaults][property];
            if (target[property] !== value) {
                target[property] = value;
                emitPropChange(target, property, value, receiver);
            }
            return false;
        }
        return false;
    },
    set(target, property, value, receiver) {
        if (Object.prototype.hasOwnProperty.call(target, property)) {
            if (target[property] !== value) {
                target[property] = value;
                emitPropChange(target, property, value, receiver);
            }
            return true;
        }
        return false;
    }
};

class Model {
    constructor() {
        const emitter = new EventEmitter();
        emitter.setMaxListeners(100);

        const properties = {
            [SymbolEvents]: { value: emitter }
        };
        for (const [propName, defaultValue] of Object.entries(this[SymbolDefaults])) {
            properties[propName] = {
                enumerable: true,
                writable: true,
                value: defaultValue
            };
        }
        Object.defineProperties(this, properties);

        return new Proxy(this, ProxyDef);
    }

    set(props, { silent } = {}) {
        const emitter = this[SymbolEvents];
        if (silent) {
            emitter.paused = true;
        }
        emitter.noChange = true;
        for (const [prop, value] of Object.entries(props)) {
            this[prop] = value;
        }
        emitter.noChange = false;
        if (silent) {
            emitter.paused = false;
        } else {
            emitter.emit('change', this, props);
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

    static defineModelProperties(properties) {
        this.prototype[SymbolDefaults] = properties;
    }
}

export { Model };

import EventEmitter from 'events';
import { Logger } from 'util/logger';

const SymbolEvents = Symbol('events');
const SymbolDefaults = Symbol('defaults');
const SymbolExtensions = Symbol('extensions');

function emitPropChange(target, property, value, prevValue) {
    const emitter = target[SymbolEvents];
    if (!emitter.paused) {
        emitter.emit('change:' + property, target, value, prevValue);
        if (!emitter.noChange) {
            emitter.emit('change', target, { [property]: value });
        }
    }
}

const ProxyDef = {
    deleteProperty(target, property) {
        if (Object.prototype.hasOwnProperty.call(target, property)) {
            const defaults = target[SymbolDefaults];
            const value = defaults[property];
            const prevValue = target[property];
            if (prevValue !== value) {
                if (Object.prototype.hasOwnProperty.call(defaults, property)) {
                    target[property] = value;
                } else {
                    delete target[property];
                }
                emitPropChange(target, property, value, prevValue);
            }
            return true;
        }
        return true;
    },
    set(target, property, value, receiver) {
        if (Object.prototype.hasOwnProperty.call(target, property) || target[SymbolExtensions]) {
            if (target[property] !== value) {
                const prevValue = target[property];
                target[property] = value;
                emitPropChange(target, property, value, prevValue);
            }
            return true;
        } else {
            new Logger(receiver.constructor.name).warn(
                `Unknown property: ${property}`,
                new Error().stack
            );
        }
        return false;
    }
};

class Model {
    constructor(data) {
        const emitter = new EventEmitter();
        emitter.setMaxListeners(100);

        const properties = {
            [SymbolEvents]: { value: emitter }
        };
        for (const [propName, defaultValue] of Object.entries(this[SymbolDefaults])) {
            properties[propName] = {
                configurable: true,
                enumerable: true,
                writable: true,
                value: defaultValue
            };
        }
        Object.defineProperties(this, properties);

        const object = new Proxy(this, ProxyDef);

        if (data) {
            object.set(data, { silent: true });
        }

        return object;
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

    emit(eventName, ...args) {
        this[SymbolEvents].emit(eventName, ...args);
    }

    static defineModelProperties(properties, options) {
        this.prototype[SymbolDefaults] = { ...this.prototype[SymbolDefaults], ...properties };
        if (options && options.extensions) {
            this.prototype[SymbolExtensions] = true;
        }
    }

    static set(properties) {
        this.prototype[SymbolDefaults] = properties;
    }
}

export { Model };

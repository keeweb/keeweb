import Handlebars from 'hbs';

/**
 * Replacements for methods that are bloated in lodash, as well as other useful helpers.
 * Lodash contains some very well written functions like throttle and debounce.
 * However we don't want to load extra 20kb of code for simple pick, shuffle, or escape.
 */

const escape = Handlebars.escapeExpression;

export { escape };

export function noop() {}

export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function pick(obj, props) {
    if (!obj) {
        return obj;
    }
    const result = {};
    for (const prop of props) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            result[prop] = obj[prop];
        }
    }
    return result;
}

export function omit(obj, props) {
    if (!obj) {
        return obj;
    }
    const result = { ...obj };
    for (const prop of props) {
        delete result[prop];
    }
    return result;
}

export function omitEmpty(obj) {
    if (!obj) {
        return obj;
    }
    return Object.entries(obj).reduce((result, [key, value]) => {
        if (value) {
            result[key] = value;
        }
        return result;
    }, {});
}

export function mapObject(obj, fn) {
    return Object.entries(obj).reduce((result, [key, value]) => {
        result[key] = fn(value);
        return result;
    }, {});
}

export function isEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (a instanceof Date) {
        return +a === +b;
    }
    if (a instanceof Array && b instanceof Array) {
        return a.join(',') === b.join(',');
    }
    return false;
}

export function minmax(val, min, max) {
    return Math.min(max, Math.max(min, val));
}

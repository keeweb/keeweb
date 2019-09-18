import Handlebars from 'hbs';

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

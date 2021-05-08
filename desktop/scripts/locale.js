const { EventEmitter } = require('events');

class Locale extends EventEmitter {}

const locale = new Locale();

let localeValues;

function setLocale(values) {
    localeValues = values;

    let changed = false;
    for (const [key, value] of Object.entries(values)) {
        if (locale[key] !== value) {
            changed = true;
            locale[key] = value;
        }
    }

    if (changed) {
        locale.emit('changed');
    }
}

function getLocaleValues() {
    return localeValues;
}

module.exports = { locale, setLocale, getLocaleValues };

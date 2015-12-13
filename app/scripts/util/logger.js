'use strict';

/* globals console */
/* globals performance */

var Logger = function(name, id) {
    this.prefix = (name ? name + (id ? ':' + id : '') : 'default');
};

Logger.prototype.ts = function(ts) {
    if (ts) {
        return Math.round(performance.now() - ts) + 'ms';
    } else {
        return performance.now();
    }
};

Logger.prototype.getPrefix = function() {
    return new Date().toISOString() + ' [' + this.prefix + '] ';
};

Logger.prototype.debug = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    console.debug.apply(console, arguments);
};

Logger.prototype.info = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    console.log.apply(console, arguments);
};

Logger.prototype.warn = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    console.warn.apply(console, arguments);
};

Logger.prototype.error = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    console.error.apply(console, arguments);
};

module.exports = Logger;

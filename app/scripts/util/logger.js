'use strict';

/* globals console */
/* globals performance */

var Level = {
    Off: 0,
    Error: 1,
    Warn: 2,
    Info: 3,
    Debug: 4,
    All: 5
};

var Logger = function(name, id) {
    this.prefix = (name ? name + (id ? ':' + id : '') : 'default');
    this.level = Level.All;
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
    if (this.level > Level.Debug) {
        console.debug.apply(console, arguments);
    }
};

Logger.prototype.info = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    if (this.level > Level.Info) {
        console.log.apply(console, arguments);
    }
};

Logger.prototype.warn = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    if (this.level > Level.Warn) {
        console.warn.apply(console, arguments);
    }
};

Logger.prototype.error = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    if (this.level > Level.Error) {
        console.error.apply(console, arguments);
    }
};

Logger.prototype.setLevel = function(level) {
    this.level = level;
};

Logger.prototype.getLevel = function() {
    return this.level;
};

Logger.Level = Level;

module.exports = Logger;

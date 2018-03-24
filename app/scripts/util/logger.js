const Level = {
    Off: 0,
    Error: 1,
    Warn: 2,
    Info: 3,
    Debug: 4,
    All: 5
};

const MaxLogsToSave = 100;

const lastLogs = [];

const Logger = function(name, id) {
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
    if (this.level >= Level.Debug) {
        Logger.saveLast('debug', arguments);
        console.log.apply(console, arguments); // eslint-disable-line no-console
    }
};

Logger.prototype.info = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    if (this.level >= Level.Info) {
        Logger.saveLast('info', arguments);
        console.info.apply(console, arguments); // eslint-disable-line no-console
    }
};

Logger.prototype.warn = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    if (this.level >= Level.Warn) {
        Logger.saveLast('warn', arguments);
        console.warn.apply(console, arguments); // eslint-disable-line no-console
    }
};

Logger.prototype.error = function() {
    arguments[0] = this.getPrefix() + arguments[0];
    if (this.level >= Level.Error) {
        Logger.saveLast('error', arguments);
        console.error.apply(console, arguments); // eslint-disable-line no-console
    }
};

Logger.prototype.setLevel = function(level) {
    this.level = level;
};

Logger.prototype.getLevel = function() {
    return this.level;
};

Logger.saveLast = function(level, args) {
    lastLogs.push({ level: level, args: Array.prototype.slice.call(args) });
    if (lastLogs.length > MaxLogsToSave) {
        lastLogs.shift();
    }
};

Logger.getLast = function() {
    return lastLogs;
};

Logger.Level = Level;

module.exports = Logger;

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

const Logger = function (name, id, level = Level.All) {
    this.prefix = name ? name + (id ? ':' + id : '') : 'default';
    this.level = level;
};

Logger.prototype.ts = function (ts) {
    if (ts) {
        return Math.round(performance.now() - ts) + 'ms';
    } else {
        return performance.now();
    }
};

Logger.prototype.getPrefix = function () {
    return new Date().toISOString() + ' [' + this.prefix + '] ';
};

Logger.prototype.debug = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Debug) {
        Logger.saveLast('debug', args);
        console.log(...args); // eslint-disable-line no-console
    }
};

Logger.prototype.info = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Info) {
        Logger.saveLast('info', args);
        console.info(...args); // eslint-disable-line no-console
    }
};

Logger.prototype.warn = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Warn) {
        Logger.saveLast('warn', args);
        console.warn(...args); // eslint-disable-line no-console
    }
};

Logger.prototype.error = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Error) {
        Logger.saveLast('error', args);
        console.error(...args); // eslint-disable-line no-console
    }
};

Logger.prototype.setLevel = function (level) {
    this.level = level;
};

Logger.prototype.getLevel = function () {
    return this.level;
};

Logger.saveLast = function (level, args) {
    lastLogs.push({ level, args: Array.prototype.slice.call(args) });
    if (lastLogs.length > MaxLogsToSave) {
        lastLogs.shift();
    }
};

Logger.getLast = function () {
    return lastLogs;
};

Logger.Level = Level;

export { Logger };

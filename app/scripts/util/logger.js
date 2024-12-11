import { RuntimeInfo } from 'const/runtime-info';

/*
    Log Levels > Define
*/

const Level = {
    Off: 0,
    Error: 1,
    Warn: 2,
    Info: 3,
    Debug: 4,
    All: 5,
    Dev: 6
};

function getKeyByValue(object, value) {
    return Object.keys(object).find((key) => object[key] === value);
}

/*
    Max number of logs to save to file before overwrite begins
*/

const MaxLogsToSave = 100;
const lastLogs = [];

const Logger = function (name, id, level = Level.All) {
    this.prefix = name ? name + (id ? ':' + id : '') : 'default';
    this.level = level;
};

/*
    Timestamp (performance in milliseconds)
    track performance time with

        const ts = logger.ts();
        <ACTIONS TO COMPLETE>
        logger.debug('Complete', logger.ts(ts));
*/

Logger.prototype.ts = function (ts) {
    if (ts) {
        return Math.round(performance.now() - ts) + 'ms';
    } else {
        return performance.now();
    }
};

/*
    Get log type prefix
*/

Logger.prototype.getPrefix = function () {
    return (
        new Date().toISOString() +
        ' [' +
        this.prefix +
        '] (' +
        getKeyByValue(Level, this.level) +
        ') '
    );
};

/*
    Log Level > Dev

    specialized log level. really shouldn't be needed by users. helps output more
    technical logs. log level needs manually set since Level.All (5) is technically the highest.
*/

Logger.prototype.dev = function (...args) {
    this.level = Level.Dev;
    args[0] = this.getPrefix() + args[0];
    if (RuntimeInfo.devMode) {
        Logger.saveLast('dev', args);
        console.log(...args);
    }
    this.level = Level.All;
};

/*
    Log Level > Debug
*/

Logger.prototype.debug = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Debug) {
        Logger.saveLast('debug', args);
        console.log(...args);
    }
};

/*
    Log Level > Info
*/

Logger.prototype.info = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Info) {
        Logger.saveLast('info', args);
        console.info(...args);
    }
};

/*
    Log Level > Warn
*/

Logger.prototype.warn = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Warn) {
        Logger.saveLast('warn', args);
        console.warn(...args);
    }
};

/*
    Log Level > Error
*/

Logger.prototype.error = function (...args) {
    args[0] = this.getPrefix() + args[0];
    if (this.level >= Level.Error) {
        Logger.saveLast('error', args);
        console.error(...args);
    }
};

/*
    Log Level > Action > Set
*/

Logger.prototype.setLevel = function (level) {
    this.level = level;
};

/*
    Log Level > Action > Get
*/

Logger.prototype.getLevel = function () {
    return this.level;
};

/*
    Log Level > Action > Save Last
*/

Logger.saveLast = function (level, args) {
    lastLogs.push({ level, args: Array.prototype.slice.call(args) });
    if (lastLogs.length > MaxLogsToSave) {
        lastLogs.shift();
    }
};

/*
    Log Level > Action > Get Last
*/

Logger.getLast = function () {
    return lastLogs;
};

Logger.Level = Level;

export { Logger };

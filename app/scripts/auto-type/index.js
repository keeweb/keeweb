'use strict';

var AutoTypeParser = require('./auto-type-parser'),
    AutoTypeHelperFactory = require('./auto-type-helper-factory'),
    Launcher = require('../comp/launcher'),
    Logger = require('../util/logger'),
    Timeouts = require('../const/timeouts');

var logger = new Logger('auto-type');
var clearTextAutoTypeLog = localStorage.autoTypeDebug;

var AutoType = {
    helper: AutoTypeHelperFactory.create(),

    enabled: !!Launcher,

    run: function(entry, callback) {
        var sequence = entry.getEffectiveAutoTypeSeq();
        logger.debug('Start', sequence);
        var ts = logger.ts();
        try {
            var parser = new AutoTypeParser(sequence);
            var runner = parser.parse();
            logger.debug('Parsed', this.printOps(runner.ops));
            runner.resolve(entry, err => {
                if (err) {
                    logger.error('Resolve error', err);
                    return callback && callback(err);
                }
                logger.debug('Resolved', this.printOps(runner.ops));
                if (entry.autoTypeObfuscation) {
                    try {
                        runner.obfuscate();
                    } catch (e) {
                        logger.error('Obfuscate error', e);
                        return callback && callback(e);
                    }
                    logger.debug('Obfuscated');
                }
                runner.run(err => {
                    if (err) {
                        logger.error('Run error', err);
                        return callback && callback(err);
                    }
                    logger.debug('Complete', logger.ts(ts));
                    return callback && callback();
                });
            });
        } catch (ex) {
            logger.error('Parse error', ex);
            return callback && callback(ex);
        }
    },

    validate: function(entry, sequence, callback) {
        try {
            var parser = new AutoTypeParser(sequence);
            var runner = parser.parse();
            runner.resolve(entry, callback);
        } catch (ex) {
            return callback(ex);
        }
    },

    printOps: function(ops) {
        return '[' + ops.map(this.printOp, this).join(',') + ']';
    },

    printOp: function(op) {
        var mod = op.mod ? Object.keys(op.mod).join('') : '';
        if (op.type === 'group') {
            return mod + this.printOps(op.value);
        }
        if (op.type === 'text') {
            var value = op.value;
            if (!clearTextAutoTypeLog) {
                value = value.replace(/./g, '*');
            }
            return mod + value;
        }
        return mod + op.type + ':' + op.value;
    },

    hideWindow: function(callback) {
        logger.debug('Hide window');
        if (Launcher.hideWindowIfActive()) {
            setTimeout(callback, Timeouts.AutoTypeAfterHide);
        } else {
            callback();
        }
    },

    getActiveWindowTitle: function(callback) {
        logger.debug('Get window title');
        return this.helper.getActiveWindowTitle((err, title, url) => {
            if (err) {
                logger.error('Error get window title', err);
            } else {
                logger.debug('Window title', title, url);
            }
            return callback(err, title);
        });
    }
};

module.exports = AutoType;

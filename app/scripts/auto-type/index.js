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

    run: function(entry, sequence, obfuscate, callback) {
        logger.debug('Start', sequence);
        var that = this;
        try {
            var parser = new AutoTypeParser(sequence);
            var runner = parser.parse();
            logger.debug('Parsed', that.printOps(runner.ops));
            runner.resolve(entry, function(err) {
                if (err) {
                    logger.error('Resolve error', err);
                    return callback(err);
                }
                logger.debug('Resolved', that.printOps(runner.ops));
                if (obfuscate) {
                    try {
                        runner.obfuscate();
                    } catch (e) {
                        logger.error('Obfuscate error', e);
                        return callback(e);
                    }
                    logger.debug('Obfuscated');
                }
                runner.run(function(err) {
                    if (err) {
                        logger.error('Run error', err);
                        return callback(err);
                    }
                    logger.debug('Complete');
                    return callback();
                });
            });
        } catch (ex) {
            logger.error('Parse error', ex);
            return callback(ex);
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
        return this.helper.getActiveWindowTitle(function(err, title, url) {
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

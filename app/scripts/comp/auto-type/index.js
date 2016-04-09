'use strict';

var AutoTypeParser = require('./auto-type-parser');
var Logger = require('../../util/logger');

var logger = new Logger('auto-type');

var clearTextAutoTypeLog = localStorage.clearTextAutoTypeLog;

var AutoType = {
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
                    runner.obfuscate();
                    logger.debug('Obfuscated', that.printOps(runner.ops));
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
            runner.run();
        } catch (ex) {
            logger.error('Parse error', ex);
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
    }
};

module.exports = AutoType;

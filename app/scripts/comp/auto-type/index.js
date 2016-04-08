'use strict';

var AutoTypeParser = require('./auto-type-parser');
var Logger = require('../../util/logger');

var logger = new Logger('auto-type');

var AutoType = {
    run: function(entry, sequence, callback) {
        logger.debug('Start', sequence);
        try {
            var parser = new AutoTypeParser(sequence);
            var runner = parser.parse();
            logger.debug('Parsed', runner.ops.length);
            runner.resolve(entry, function(err) {
                if (err) {
                    logger.error('Error', err);
                    return callback(err);
                }
                logger.debug('Running', runner.ops);
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
    }
};

module.exports = AutoType;

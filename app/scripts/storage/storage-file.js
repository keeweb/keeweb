'use strict';

var Launcher = require('../comp/launcher'),
    Logger = require('../util/logger');

var logger = new Logger('storage-file');

var StorageFile = {
    name: 'file',
    enabled: !!Launcher,

    load: function(path, callback) {
        logger.debug('Load', path);
        var ts = logger.ts();
        try {
            var data = Launcher.readFile(path);
            logger.debug('Loaded', path, logger.ts(ts));
            if (callback) { callback(null, data.buffer); }
        } catch (e) {
            logger.error('Error reading local file', path, e);
            if (callback) { callback(e, null); }
        }
    },

    save: function(path, data, callback) {
        logger.debug('Save', path);
        var ts = logger.ts();
        try {
            Launcher.writeFile(path, data);
            logger.debug('Saved', path, logger.ts(ts));
            if (callback) { callback(); }
        } catch (e) {
            logger.error('Error writing local file', path, e);
            if (callback) { callback(e); }
        }
    }
};

module.exports = StorageFile;

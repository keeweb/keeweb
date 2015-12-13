'use strict';

var Launcher = require('../comp/launcher'),
    Logger = require('../util/logger');

var logger = new Logger('storage-file-cache');

var StorageFileCache = {
    name: 'cache',
    enabled: !!Launcher,

    path: null,

    getPath: function(id) {
        return Launcher.req('path').join(this.path, id);
    },

    init: function(callback) {
        if (this.path) {
            return callback && callback();
        }
        try {
            var path = Launcher.getUserDataPath('OfflineFiles');
            var fs = Launcher.req('fs');
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
            this.path = path;
            callback();
        } catch (e) {
            logger.error('Error opening local offline storage', e);
            if (callback) { callback(e); }
        }
    },

    save: function(id, data, callback) {
        logger.debug('Save', id);
        this.init((function(err) {
            if (err) {
                return callback && callback(err);
            }
            var ts = logger.ts();
            try {
                Launcher.writeFile(this.getPath(id), data);
                logger.debug('Saved', id, logger.ts(ts));
                if (callback) { callback(); }
            } catch (e) {
                logger.error('Error saving to cache', id, e);
                if (callback) { callback(e); }
            }
        }).bind(this));
    },

    load: function(id, callback) {
        logger.debug('Load', id);
        this.init((function(err) {
            if (err) {
                return callback && callback(null, err);
            }
            var ts = logger.ts();
            try {
                var data = Launcher.readFile(this.getPath(id));
                logger.debug('Loaded', id, logger.ts(ts));
                if (callback) { callback(null, data.buffer); }
            } catch (e) {
                logger.error('Error loading from cache', id, e);
                if (callback) { callback(e, null); }
            }
        }).bind(this));
    },

    remove: function(id, callback) {
        logger.debug('Remove', id);
        this.init((function(err) {
            if (err) {
                return callback && callback(err);
            }
            var ts = logger.ts();
            try {
                var path = this.getPath(id);
                if (Launcher.fileExists(path)) {
                    Launcher.deleteFile(path);
                }
                logger.debug('Removed', id, logger.ts(ts));
                if (callback) { callback(); }
            } catch(e) {
                logger.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        }).bind(this));
    }
};

module.exports = StorageFileCache;

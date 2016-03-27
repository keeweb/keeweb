'use strict';

var StorageBase = require('./storage-base'),
    Launcher = require('../comp/launcher');

var StorageFileCache = StorageBase.extend({
    name: 'cache',
    enabled: !!Launcher,
    system: true,

    path: null,

    getPath: function(id) {
        return Launcher.req('path').join(this.path, id);
    },

    initFs: function(callback) {
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
            this.logger.error('Error opening local offline storage', e);
            if (callback) { callback(e); }
        }
    },

    save: function(id, opts, data, callback) {
        var that = this;
        that.logger.debug('Save', id);
        that.initFs(function(err) {
            if (err) {
                return callback && callback(err);
            }
            var ts = logger.ts();
            try {
                Launcher.writeFile(that.getPath(id), data);
                logger.debug('Saved', id, logger.ts(ts));
                if (callback) { callback(); }
            } catch (e) {
                logger.error('Error saving to cache', id, e);
                if (callback) { callback(e); }
            }
        });
    },

    load: function(id, opts, callback) {
        var that = this;
        that.logger.debug('Load', id);
        that.initFs(function(err) {
            if (err) {
                return callback && callback(null, err);
            }
            var ts = that.logger.ts();
            try {
                var data = Launcher.readFile(that.getPath(id));
                that.logger.debug('Loaded', id, that.logger.ts(ts));
                if (callback) { callback(null, data.buffer); }
            } catch (e) {
                that.logger.error('Error loading from cache', id, e);
                if (callback) { callback(e, null); }
            }
        });
    },

    remove: function(id, opts, callback) {
        var that = this;
        that.logger.debug('Remove', id);
        that.initFs(function(err) {
            if (err) {
                return callback && callback(err);
            }
            var ts = that.logger.ts();
            try {
                var path = that.getPath(id);
                if (Launcher.fileExists(path)) {
                    Launcher.deleteFile(path);
                }
                that.logger.debug('Removed', id, that.logger.ts(ts));
                if (callback) { callback(); }
            } catch(e) {
                that.logger.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        });
    }
});

module.exports = StorageFileCache;

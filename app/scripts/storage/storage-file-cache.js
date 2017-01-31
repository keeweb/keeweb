'use strict';

const StorageBase = require('./storage-base');
const Launcher = require('../comp/launcher');

const StorageFileCache = StorageBase.extend({
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
            const path = Launcher.getUserDataPath('OfflineFiles');
            const fs = Launcher.req('fs');
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
        this.logger.debug('Save', id);
        this.initFs(err => {
            if (err) {
                return callback && callback(err);
            }
            const ts = this.logger.ts();
            try {
                Launcher.writeFile(this.getPath(id), data);
                this.logger.debug('Saved', id, this.logger.ts(ts));
                if (callback) { callback(); }
            } catch (e) {
                this.logger.error('Error saving to cache', id, e);
                if (callback) { callback(e); }
            }
        });
    },

    load: function(id, opts, callback) {
        this.logger.debug('Load', id);
        this.initFs(err => {
            if (err) {
                return callback && callback(null, err);
            }
            const ts = this.logger.ts();
            try {
                const data = Launcher.readFile(this.getPath(id));
                this.logger.debug('Loaded', id, this.logger.ts(ts));
                if (callback) { callback(null, data.buffer); }
            } catch (e) {
                this.logger.error('Error loading from cache', id, e);
                if (callback) { callback(e, null); }
            }
        });
    },

    remove: function(id, opts, callback) {
        this.logger.debug('Remove', id);
        this.initFs(err => {
            if (err) {
                return callback && callback(err);
            }
            const ts = this.logger.ts();
            try {
                const path = this.getPath(id);
                if (Launcher.fileExists(path)) {
                    Launcher.deleteFile(path);
                }
                this.logger.debug('Removed', id, this.logger.ts(ts));
                if (callback) { callback(); }
            } catch (e) {
                this.logger.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        });
    }
});

module.exports = new StorageFileCache();

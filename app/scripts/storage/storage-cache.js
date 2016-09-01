'use strict';

var StorageBase = require('./storage-base');

var idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

var StorageCache = StorageBase.extend({
    name: 'cache',
    enabled: !!idb,
    system: true,

    db: null,
    errorOpening: null,

    initDb: function(callback) {
        if (this.db) {
            return callback && callback();
        }
        try {
            var req = idb.open('FilesCache');
            req.onerror = e => {
                this.logger.error('Error opening indexed db', e);
                this.errorOpening = e;
                if (callback) { callback(e); }
            };
            req.onsuccess = e => {
                this.db = e.target.result;
                if (callback) { callback(); }
            };
            req.onupgradeneeded = e => {
                var db = e.target.result;
                db.createObjectStore('files');
            };
        } catch (e) {
            this.logger.error('Error opening indexed db', e);
            if (callback) { callback(e); }
        }
    },

    save: function(id, opts, data, callback) {
        this.logger.debug('Save', id);
        this.initDb(err => {
            if (err) {
                return callback && callback(err);
            }
            try {
                var ts = this.logger.ts();
                var req = this.db.transaction(['files'], 'readwrite').objectStore('files').put(data, id);
                req.onsuccess = () => {
                    this.logger.debug('Saved', id, this.logger.ts(ts));
                    if (callback) { callback(); }
                };
                req.onerror = () => {
                    this.logger.error('Error saving to cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch (e) {
                this.logger.error('Error saving to cache', id, e);
                if (callback) { callback(e); }
            }
        });
    },

    load: function(id, opts, callback) {
        this.logger.debug('Load', id);
        this.initDb(err => {
            if (err) {
                return callback && callback(err, null);
            }
            try {
                var ts = this.logger.ts();
                var req = this.db.transaction(['files'], 'readonly').objectStore('files').get(id);
                req.onsuccess = () => {
                    this.logger.debug('Loaded', id, this.logger.ts(ts));
                    if (callback) { callback(null, req.result); }
                };
                req.onerror = () => {
                    this.logger.error('Error loading from cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch (e) {
                this.logger.error('Error loading from cache', id, e);
                if (callback) { callback(e, null); }
            }
        });
    },

    remove: function(id, opts, callback) {
        this.logger.debug('Remove', id);
        this.initDb(err => {
            if (err) {
                return callback && callback(err);
            }
            try {
                var ts = this.logger.ts();
                var req = this.db.transaction(['files'], 'readwrite').objectStore('files').delete(id);
                req.onsuccess = () => {
                    this.logger.debug('Removed', id, this.logger.ts(ts));
                    if (callback) { callback(); }
                };
                req.onerror = () => {
                    this.logger.error('Error removing from cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch (e) {
                this.logger.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        });
    }
});

module.exports = new StorageCache();

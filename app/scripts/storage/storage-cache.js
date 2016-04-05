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
        var that = this;
        try {
            var req = idb.open('FilesCache');
            req.onerror = function (e) {
                that.logger.error('Error opening indexed db', e);
                that.errorOpening = e;
                if (callback) { callback(e); }
            };
            req.onsuccess = function (e) {
                that.db = e.target.result;
                if (callback) { callback(); }
            };
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                db.createObjectStore('files');
            };
        } catch (e) {
            that.logger.error('Error opening indexed db', e);
            if (callback) { callback(e); }
        }
    },

    save: function(id, opts, data, callback) {
        var that = this;
        that.logger.debug('Save', id);
        that.initDb(function(err) {
            if (err) {
                return callback && callback(err);
            }
            try {
                var ts = that.logger.ts();
                var req = that.db.transaction(['files'], 'readwrite').objectStore('files').put(data, id);
                req.onsuccess = function () {
                    that.logger.debug('Saved', id, that.logger.ts(ts));
                    if (callback) { callback(); }
                };
                req.onerror = function () {
                    that.logger.error('Error saving to cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch (e) {
                that.logger.error('Error saving to cache', id, e);
                if (callback) { callback(e); }
            }
        });
    },

    load: function(id, opts, callback) {
        var that = this;
        that.logger.debug('Load', id);
        that.initDb(function(err) {
            if (err) {
                return callback && callback(err, null);
            }
            try {
                var ts = that.logger.ts();
                var req = that.db.transaction(['files'], 'readonly').objectStore('files').get(id);
                req.onsuccess = function () {
                    that.logger.debug('Loaded', id, that.logger.ts(ts));
                    if (callback) { callback(null, req.result); }
                };
                req.onerror = function () {
                    that.logger.error('Error loading from cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch (e) {
                that.logger.error('Error loading from cache', id, e);
                if (callback) { callback(e, null); }
            }
        });
    },

    remove: function(id, opts, callback) {
        var that = this;
        that.logger.debug('Remove', id);
        that.initDb(function(err) {
            if (err) {
                return callback && callback(err);
            }
            try {
                var ts = that.logger.ts();
                var req = that.db.transaction(['files'], 'readwrite').objectStore('files').delete(id);
                req.onsuccess = function () {
                    that.logger.debug('Removed', id, that.logger.ts(ts));
                    if (callback) { callback(); }
                };
                req.onerror = function () {
                    that.logger.error('Error removing from cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch(e) {
                that.logger.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        });
    }
});

module.exports = new StorageCache();

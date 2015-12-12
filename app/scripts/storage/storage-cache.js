'use strict';

var Logger = require('../util/logger');

var logger = new Logger('storage-cache');
var idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

var StorageCache = {
    name: 'cache',
    enabled: !!idb,

    db: null,
    errorOpening: null,

    init: function(callback) {
        if (this.db) {
            return callback && callback();
        }
        var that = this;
        try {
            var req = idb.open('FilesCache');
            req.onerror = function (e) {
                logger.error('Error opening indexed db', e);
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
            logger.error('Error opening indexed db', e);
            if (callback) { callback(e); }
        }
    },

    save: function(id, data, callback) {
        logger.debug('Save', id);
        this.init((function(err) {
            if (err) {
                return callback && callback(err);
            }
            try {
                var ts = logger.ts();
                var req = this.db.transaction(['files'], 'readwrite').objectStore('files').put(data, id);
                req.onsuccess = function () {
                    logger.debug('Saved', id, logger.ts(ts));
                    if (callback) { callback(); }
                };
                req.onerror = function () {
                    logger.error('Error saving to cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
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
                return callback && callback(err, null);
            }
            try {
                var ts = logger.ts();
                var req = this.db.transaction(['files'], 'readonly').objectStore('files').get(id);
                req.onsuccess = function () {
                    logger.debug('Loaded', id, logger.ts(ts));
                    if (callback) { callback(null, req.result); }
                };
                req.onerror = function () {
                    logger.error('Error loading from cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
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
            try {
                var ts = logger.ts();
                var req = this.db.transaction(['files'], 'readwrite').objectStore('files').delete(id);
                req.onsuccess = function () {
                    logger.debug('Removed', id, logger.ts(ts));
                    if (callback) { callback(); }
                };
                req.onerror = function () {
                    logger.error('Error removing from cache', id, req.error);
                    if (callback) { callback(req.error); }
                };
            } catch(e) {
                logger.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        }).bind(this));
    }
};

module.exports = StorageCache;

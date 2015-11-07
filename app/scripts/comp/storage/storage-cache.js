'use strict';

var idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

var StorageCache = {
    name: 'cache',
    enabled: !!idb,

    db: null,
    errorOpening: null,

    init: function(callback) {
        if (this.db) {
            return callback();
        }
        var that = this;
        try {
            var req = idb.open('FilesCache');
            req.onerror = function (e) {
                console.error('Error opening indexed db', e);
                that.errorOpening = e;
                callback(e);
            };
            req.onsuccess = function (e) {
                that.db = e.target.result;
                callback();
            };
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                db.createObjectStore('files');
            };
        } catch (e) {
            console.error('Error opening indexed db', e);
            callback(e);
        }
    },

    save: function(id, data, callback) {
        this.init((function(err) {
            if (err) {
                return callback(err);
            }
            try {
                var req = this.db.transaction(['files'], 'readwrite').objectStore('files').put(data, id);
                req.onsuccess = function () {
                    if (callback) {
                        callback();
                    }
                };
                req.onerror = function () {
                    console.error('Error saving to cache', id, req.error);
                    if (callback) {
                        callback(req.error);
                    }
                };
            } catch (e) {
                console.error('Error saving to cache', id, e);
                callback(e);
            }
        }).bind(this));
    },

    load: function(id, callback) {
        this.init((function(err) {
            if (err) {
                return callback(null, err);
            }
            try {
                var req = this.db.transaction(['files'], 'readonly').objectStore('files').get(id);
                req.onsuccess = function () {
                    if (callback) {
                        callback(req.result);
                    }
                };
                req.onerror = function () {
                    console.error('Error loading from cache', id, req.error);
                    if (callback) {
                        callback(null, req.error);
                    }
                };
            } catch (e) {
                console.error('Error loading from cache', id, e);
                callback(null, e);
            }
        }).bind(this));
    },

    remove: function(id, callback) {
        this.init((function(err) {
            if (err) {
                return callback(err);
            }
            try {
                var req = this.db.transaction(['files'], 'readwrite').objectStore('files').delete(id);
                req.onsuccess = function () {
                    if (callback) {
                        callback();
                    }
                };
                req.onerror = function () {
                    console.error('Error removing from cache', id, req.error);
                    if (callback) {
                        callback(req.error);
                    }
                };
            } catch(e) {
                console.error('Error removing from cache', id, e);
                callback(e);
            }
        }).bind(this));
    }
};

module.exports = StorageCache;

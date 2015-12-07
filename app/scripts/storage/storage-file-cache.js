'use strict';

var Launcher = require('../comp/launcher');

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
        } catch (e) {
            console.error('Error opening local offline storage', e);
            if (callback) { callback(e); }
        }
    },

    save: function(id, data, callback) {
        this.init((function(err) {
            if (err) {
                return callback && callback(err);
            }
            try {
                Launcher.writeFile(this.getPath(id), data);
                if (callback) { callback(); }
            } catch (e) {
                console.error('Error saving to cache', id, e);
                if (callback) { callback(e); }
            }
        }).bind(this));
    },

    load: function(id, callback) {
        this.init((function(err) {
            if (err) {
                return callback && callback(null, err);
            }
            try {
                var data = Launcher.readFile(this.getPath(id));
                if (callback) { callback(null, data.buffer); }
            } catch (e) {
                console.error('Error loading from cache', id, e);
                if (callback) { callback(e, null); }
            }
        }).bind(this));
    },

    remove: function(id, callback) {
        this.init((function(err) {
            if (err) {
                return callback && callback(err);
            }
            try {
                Launcher.deleteFile(this.getPath(id));
                if (callback) { callback(); }
            } catch(e) {
                console.error('Error removing from cache', id, e);
                if (callback) { callback(e); }
            }
        }).bind(this));
    }
};

module.exports = StorageFileCache;

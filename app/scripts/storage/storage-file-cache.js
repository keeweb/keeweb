'use strict';

var Launcher = require('../comp/launcher');

var StorageFileCache = {
    name: 'cache',
    enabled: !!Launcher,

    path: null,

    getPath: function(id) {
        // get safe file name by base64 as described in RFC3548: http://tools.ietf.org/html/rfc3548#page-6
        id = id.replace(/\//g, '_').replace(/\+/g, '-');
        return Launcher.req('path').join(this.path, id);
    },

    init: function(callback) {
        if (this.path) {
            return callback();
        }
        if (Launcher) {
            try {
                var path = Launcher.getUserDataPath('OfflineFiles');
                var fs = Launcher.req('fs');
                if (!fs.existsSync(path)) {
                    fs.mkdirSync(path);
                }
                this.path = path;
            } catch (e) {
                console.error('Error opening local offline storage', e);
                callback(e);
            }
        }
    },

    save: function(id, data, callback) {
        this.init((function(err) {
            if (err) {
                return callback(err);
            }
            try {
                if (Launcher) {
                    Launcher.writeFile(this.getPath(id), data);
                    return callback();
                }
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
                if (Launcher) {
                    var data = Launcher.readFile(this.getPath(id));
                    return callback(data.buffer);
                }
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
                if (Launcher) {
                    Launcher.deleteFile(this.getPath(id));
                    return callback();
                }
            } catch(e) {
                console.error('Error removing from cache', id, e);
                callback(e);
            }
        }).bind(this));
    }
};

module.exports = StorageFileCache;

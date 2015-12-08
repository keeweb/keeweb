'use strict';

var DropboxLink = require('../comp/dropbox-link');

var StorageDropbox = {
    name: 'dropbox',
    enabled: true,

    load: function(path, callback) {
        DropboxLink.openFile(path, function(err, data, stat) {
            if (callback) { callback(err, data, stat ? { rev: stat.versionTag } : null); }
        });
    },

    stat: function(path, callback) {
        DropboxLink.stat(path, function(err, stat) {
            if (callback) { callback(err, stat ? { rev: stat.versionTag } : null); }
        });
    },

    save: function(path, data, callback) {
        DropboxLink.saveFile(path, data, true, callback || _.noop);
    }
};

module.exports = StorageDropbox;

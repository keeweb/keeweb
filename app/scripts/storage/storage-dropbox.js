'use strict';

var DropboxLink = require('../comp/dropbox-link');

var StorageDropbox = {
    name: 'dropbox',
    enabled: true,

    load: function(path, callback) {
        DropboxLink.openFile(path, callback);
    },

    save: function(path, data, callback) {
        DropboxLink.saveFile(path, data, true, callback);
    }
};

module.exports = StorageDropbox;

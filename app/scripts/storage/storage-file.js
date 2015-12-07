'use strict';

var Launcher = require('../comp/launcher');

var StorageFile = {
    name: 'file',
    enabled: !!Launcher,

    load: function(path, callback) {
        try {
            var data = Launcher.readFile(path);
            if (callback) { callback(null, data.buffer); }
        } catch (e) {
            console.error('Error reading local file', path, e);
            if (callback) { callback(e, null); }
        }
    },

    save: function(path, data, callback) {
        try {
            Launcher.writeFile(path, data);
            if (callback) { callback(); }
        } catch (e) {
            console.error('Error writing local file', path, e);
            if (callback) { callback(e); }
        }
    }
};

module.exports = StorageFile;

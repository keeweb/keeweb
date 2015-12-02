'use strict';

var Launcher = require('../comp/launcher');

var StorageFile = {
    name: 'file',
    enabled: !!Launcher,

    load: function(path, callback) {
        try {
            var data = Launcher.readFile(path);
            callback(data.buffer);
        } catch (e) {
            console.error('Error reading local file', path, e);
            callback(null, e);
        }
    },

    save: function(path, data, callback) {
        try {
            Launcher.writeFile(path, data);
            callback();
        } catch (e) {
            console.error('Error writing local file', path, e);
            callback(e);
        }
    }
};

module.exports = StorageFile;

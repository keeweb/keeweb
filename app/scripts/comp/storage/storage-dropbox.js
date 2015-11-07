'use strict';

var Launcher = require('../launcher');

var StorageDropbox = {
    name: 'dropbox',
    enabled: !Launcher
    // TODO: move Dropbox storage operations here
};

module.exports = StorageDropbox;

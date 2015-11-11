'use strict';

var Launcher = require('../launcher');

var StorageFile = {
    name: 'file',
    enabled: !!Launcher
    // TODO: move file storage operations here
};

module.exports = StorageFile;

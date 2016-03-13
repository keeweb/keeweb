'use strict';

//var Logger = require('../util/logger');

//var logger = new Logger('storage-gdrive');

var StorageGDrive = {
    name: 'gdrive',
    icon: '',
    enabled: false,
    uipos: 30,

    iconSvg: '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" version="1.1">' +
        '<path d="M120.76421 71.989219 84.87226 9.6679848l-41.828196 0 35.899791 62.3212342zM58.014073 56.294956 37.107816 19.986746 1.2237094 82.284404 ' +
        '22.137808 118.59261Zm-21.415974 63.012814 69.180421 0 20.9141-39.459631-67.635587 0z"/></svg>',

    load: function(path, opts, callback) {
        if (callback) { callback('not implemented'); }
    },

    stat: function(path, opts, callback) {
        if (callback) { callback('not implemented'); }
    },

    save: function(path, opts, data, callback/*, rev*/) {
        if (callback) { callback('not implemented'); }
    }
};

module.exports = StorageGDrive;

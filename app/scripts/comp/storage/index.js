'use strict';

var Storage = {};

[
    require('./storage-cache'),
    require('./storage-dropbox'),
    require('./storage-file')
].forEach(function(storage) {
    Storage[storage.name] = storage;
});

module.exports = Storage;

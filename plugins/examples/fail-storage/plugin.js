/**
 * KeeWeb plugin: fail-storage
 * @author antelle
 * @license MIT
 */

const Storage = require('storage/index');
const Locale = require('locales/base');
const StorageBase = require('storage/storage-base');

const FailStorage = StorageBase.extend({
    name: 'failStorage',
    icon: 'power-off',
    enabled: true,
    uipos: 100,

    getPathForName(fileName) {
        return fileName;
    },

    load(path, opts, callback) {
        callback('fail');
    },

    stat(path, opts, callback) {
        callback('fail');
    },

    save(path, opts, data, callback, rev) {
        callback('fail');
    },

    list(callback) {
        callback('fail');
    },

    remove(path, callback) {
        callback('fail');
    },

    setEnabled(enabled) {
        StorageBase.prototype.setEnabled.call(this, enabled);
    }
});

Locale.failStorage = 'Fail';

Storage.failStorage = new FailStorage();

module.exports.uninstall = function() {
    delete Locale.failStorage;
    delete Storage.failStorage;
};

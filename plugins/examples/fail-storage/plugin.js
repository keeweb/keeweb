/**
 * KeeWeb plugin: fail-storage
 * @author antelle
 * @license MIT
 */

const Storage = require('storage/index');
const BaseLocale = require('locales/base');
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

    list(dir, callback) {
        callback('fail');
    },

    remove(path, callback) {
        callback('fail');
    },

    setEnabled(enabled) {
        StorageBase.prototype.setEnabled.call(this, enabled);
    }
});

BaseLocale.failStorage = 'Fail';

Storage.failStorage = new FailStorage();

module.exports.uninstall = function () {
    delete BaseLocale.failStorage;
    delete Storage.failStorage;
};

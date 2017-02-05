'use strict';

const Alerts = require('../comp/alerts');
// const Locale = require('../util/locale');

const Launcher = {
    name: 'android',
    version: '6.0.0',
    autoTypeSupported: false,
    ready: function(callback) {
        document.addEventListener('deviceready', () => {
            callback();
            // window.addEventListener('filePluginIsReady', () => {}, false);
        }, false);
    },
    platform: function() {
        return 'cordova';
    },
    openLink: function(href) {
        window.open(href, '_system');
    },
    getSaveFileName: function(defaultPath, callback) {
        if (defaultPath) {
            defaultPath = [this.externalRoot, defaultPath].join('/');

            Alerts.yesno({
                header: 'Save file',
                body: defaultPath,
                success: () => {
                    callback(defaultPath);
                }
            });
        }
    },
    getDir: function() {
        const storagePath = window.cordova.file.externalDataDirectory;
        return [storagePath].concat(Array.from(arguments)).filter(s => !!s);
    },
    getUserDataPath: function(fileName) {
        return this.getDir('userdata', fileName).join('/');
    },
    getTempPath: function(fileName) {
        return this.getDir('temp', fileName).join('/');
    },
    getDocumentsPath: function(fileName) {
        return this.getDir('documents', fileName).join('/');
    },
    getAppPath: function(fileName) {
        return this.getDir(fileName).join('/');
    },
    getWorkDirPath: function(fileName) {
        return this.getDir(fileName).join('/');
    },
    writeFile: function(path, data, callback) {
        const writeFile = fileEntry => {
            fileEntry.createWriter(fileWriter => {
                fileWriter.onerror = callback;
                fileWriter.onwriteend = () => callback();
                fileWriter.write(data);
            }, callback);
        };

        const createDir = (dirEntry, path, callback) => {
            const name = path.shift();
            dirEntry.getDirectory(name, { create: true }, dirEntry => {
                if (path.length) { // there is more to create
                    createDir(dirEntry, path, callback);
                } else {
                    callback(dirEntry);
                }
            }, callback);
        };

        if (path.startsWith(this.appStorage)) { // file://
            const localPath = path.replace(this.appStorage, '').split('/').filter(s => !!s);
            const fileName = localPath.pop();

            if (localPath.length) {
                window.resolveLocalFileSystemURL(this.appStorage, dirEntry => {
                    createDir(dirEntry, localPath, destDir => {
                        destDir.getFile(fileName, { create: true }, writeFile, callback, callback);
                    });
                }, callback);
            } else {
                window.resolveLocalFileSystemURL(path, writeFile, callback, callback);
            }
        } else { // cdvfile://
            window.resolveLocalFileSystemURL(path, writeFile, callback, callback);
        }
    },
    readFile: function(path, encoding, callback) {
        window.resolveLocalFileSystemURL(path, fileEntry => {
            fileEntry.file(file => {
                const reader = new FileReader();
                reader.onerror = callback;
                reader.onloadend = () => {
                    const contents = new Uint8Array(reader.result);
                    callback(encoding ? String.fromCharCode.apply(null, contents) : contents);
                };
                reader.readAsArrayBuffer(file);
            }, err => callback(undefined, err));
        }, err => callback(undefined, err));
    },
    fileExists: function(path, callback) {
        window.resolveLocalFileSystemURL(path, fileEntry => callback(true), err => callback(false)); // eslint-disable-line handle-callback-err
    },
    deleteFile: function(path, callback) {
        window.resolveLocalFileSystemURL(path, fileEntry => {
            fileEntry.remove(callback, callback, callback);
        }, callback);
    },
    statFile: function(path, callback) {
        window.resolveLocalFileSystemURL(path, fileEntry => {
            fileEntry.file(file => {
                callback({
                    ctime: new Date(file.lastModified),
                    mtime: new Date(file.lastModified)
                });
            }, err => callback(undefined, err));
        }, err => callback(undefined, err));
    },
    mkdir: function(dir) {
        // TODO
    },
    parsePath: function(fileName) {
        const parts = fileName.split('/');

        return {
            path: fileName,
            dir: parts.pop(),
            file: parts.join('/')
        };
    },
    createFsWatcher: function(path) {
        return null; // not in android with content provider
    },
    preventExit: function(e) {
        e.returnValue = false;
        return false;
    },
    exit: function() {
        // skip
    },
    requestRestart: function() {
        window.location.reload();
    },
    cancelRestart: function() {
        // skip
    },
    setClipboardText: function(text) {
        return document.execCommand('copy');
    },
    getClipboardText: function() {
        // TODO
    },
    clearClipboardText: function() {
        // TODO
    },
    minimizeApp: function() {
        this.hideApp();
    },
    canMinimize: function() {
        return true;
    },
    updaterEnabled: function() {
        return false;
    },
    resolveProxy: function(url, callback) {
        // TODO
    },
    openWindow: function(opts) {
        // skip
    },
    hideApp: function() { // home button
        // TODO
    },
    isAppFocused: function() {
        return false; // skip
    },
    showMainWindow: function() {
         // skip
    },

    fingerprints: {
        register: function(appModel, fileInfo, password) {

        },
        auth: function(fileInfo, callback) {

        }
    }
};

module.exports = Launcher;

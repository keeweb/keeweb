/* global FingerprintAuth */

const Backbone = require('backbone');

const Launcher = {
    name: 'cordova',
    version: '6.0.0',
    autoTypeSupported: false,
    thirdPartyStoragesSupported: false,
    clipboardSupported: false,
    ready: function(callback) {
        document.addEventListener('deviceready', callback, false);
        document.addEventListener('pause', () => {
            Backbone.trigger('app-minimized');
        }, false);
    },
    platform: function() {
        return 'cordova';
    },
    openLink: function(href) {
        window.open(href, '_system');
    },
    devTools: false,
    // openDevTools: function() { },
    getSaveFileName: function(defaultPath, callback) { /* skip in cordova */ },
    getDataPath: function() {
        const storagePath = window.cordova.file.externalDataDirectory;
        return [storagePath].concat(Array.from(arguments)).filter(s => !!s);
    },
    getUserDataPath: function(fileName) {
        return this.getDataPath('userdata', fileName).join('/');
    },
    getTempPath: function(fileName) {
        return this.getDataPath('temp', fileName).join('/');
    },
    getDocumentsPath: function(fileName) {
        return this.getDataPath('documents', fileName).join('/');
    },
    getAppPath: function(fileName) {
        return this.getDataPath(fileName).join('/');
    },
    getWorkDirPath: function(fileName) {
        return this.getDataPath(fileName).join('/');
    },
    joinPath: function(...parts) {
        return [...parts].join('/');
    },
    writeFile: function(path, data, callback) {
        const createFile = filePath => {
            window.resolveLocalFileSystemURL(filePath.dir, dir => {
                dir.getFile(filePath.file, {create: true}, writeFile);
            }, callback, callback);
        };

        const writeFile = fileEntry => {
            fileEntry.createWriter(fileWriter => {
                fileWriter.onerror = callback;
                fileWriter.onwriteend = () => callback();
                fileWriter.write(data);
            }, callback);
        };

        if (path.startsWith('cdvfile://')) { // then file exists
            window.resolveLocalFileSystemURL(path, writeFile, callback, callback);
        } else { // create file on sd card
            const filePath = this.parsePath(path);
            this.mkdir(filePath.dir, () => {
                createFile(filePath);
            });
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
        window.resolveLocalFileSystemURL(path, fileEntry => callback(true), () => callback(false));
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
    mkdir: function(dir, callback) {
        const basePath = this.getDataPath().join('/');
        const createDir = (dirEntry, path, callback) => {
            const name = path.shift();
            dirEntry.getDirectory(name, { create: true }, dirEntry => {
                if (path.length) { // there is more to create
                    createDir(dirEntry, path, callback);
                } else {
                    callback();
                }
            }, callback);
        };

        const localPath = dir.replace(basePath, '').split('/').filter(s => !!s);

        if (localPath.length) {
            window.resolveLocalFileSystemURL(basePath, dirEntry => {
                createDir(dirEntry, localPath, callback);
            }, callback);
        } else {
            callback();
        }
    },
    parsePath: function(fileName) {
        const parts = fileName.split('/');

        return {
            path: fileName,
            file: parts.pop(),
            dir: parts.join('/')
        };
    },
    createFsWatcher: function(path) {
        return null; // not in android with content provider
    },
    // ensureRunnable: function(path) { },

    preventExit: function(e) {
        e.returnValue = false;
        return false;
    },
    exit: function() {
        this.hideApp();
    },

    requestExit: function() { /* skip in cordova */ },
    requestRestart: function() {
        window.location.reload();
    },
    cancelRestart: function() { /* skip in cordova */ },

    setClipboardText: function(text) {},
    getClipboardText: function() {},
    clearClipboardText: function() {},

    minimizeApp: function() {
        this.hideApp();
    },
    canMinimize: function() {
        return false;
    },
    canDetectOsSleep: function() {
        return false;
    },
    updaterEnabled: function() {
        return false;
    },

    // getMainWindow: function() { },
    resolveProxy: function(url, callback) { /* skip in cordova */ },
    openWindow: function(opts) { /* skip in cordova */ },
    hideApp: function() { /* skip in cordova */ },
    isAppFocused: function() {
        return false; /* skip in cordova */
    },
    showMainWindow: function() { /* skip in cordova */ },
    // spawn: function(config) { },
    openFileChooser: function(callback) {
        const onFileSelected = function(selected) {
            window.resolveLocalFileSystemURL(selected.uri, fileEntry => {
                fileEntry.file(file => {
                    file.path = file.localURL;
                    file.name = selected.name;
                    callback(null, file);
                });
            });
        };

        window.cordova.exec(onFileSelected, callback, 'FileChooser', 'choose');
    },
    getCookies(callback) {
        // TODO
    },
    setCookies(cookies) {
        // TODO
    },

    fingerprints: {
        config: {
            disableBackup: true,
            clientId: 'keeweb'
        },

        register: function(fileId, password, callback) {
            FingerprintAuth.isAvailable(result => {
                if (!result.isAvailable) {
                    return;
                }

                const encryptConfig = _.extend({}, this.config, {
                    username: fileId,
                    password: password.getText()
                });

                FingerprintAuth.encrypt(encryptConfig, result => {
                    callback(result.token);
                });
            });
        },

        auth: function(fileId, token, callback) {
            if (!token) {
                return callback();
            }

            const decryptConfig = _.extend({}, this.config, {
                username: fileId,
                token: token
            });

            FingerprintAuth.decrypt(decryptConfig, result => {
                callback(result.password);
            });
        }
    }
};

module.exports = Launcher;

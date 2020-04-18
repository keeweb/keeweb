/* global FingerprintAuth */

import { Events } from 'framework/events';

const Launcher = {
    name: 'cordova',
    version: window.cordova.platformVersion,
    autoTypeSupported: false,
    thirdPartyStoragesSupported: false,
    clipboardSupported: false,
    ready(callback) {
        document.addEventListener('deviceready', callback, false);
        document.addEventListener(
            'pause',
            () => {
                Events.emit('app-minimized');
            },
            false
        );
    },
    platform() {
        return 'cordova';
    },
    openLink(href) {
        window.open(href, '_system');
    },
    devTools: false,
    openDevTools() {},
    getSaveFileName(defaultPath, callback) {
        /* skip in cordova */
    },
    getDataPath(...args) {
        const storagePath = window.cordova.file.externalDataDirectory;
        return [storagePath].concat(Array.from(args)).filter(s => !!s);
    },
    getUserDataPath(fileName) {
        return this.getDataPath('userdata', fileName).join('/');
    },
    getTempPath(fileName) {
        return this.getDataPath('temp', fileName).join('/');
    },
    getDocumentsPath(fileName) {
        return this.getDataPath('documents', fileName).join('/');
    },
    getAppPath(fileName) {
        return this.getDataPath(fileName).join('/');
    },
    getWorkDirPath(fileName) {
        return this.getDataPath(fileName).join('/');
    },
    joinPath(...parts) {
        return [...parts].join('/');
    },
    writeFile(path, data, callback) {
        const createFile = filePath => {
            window.resolveLocalFileSystemURL(
                filePath.dir,
                dir => {
                    dir.getFile(filePath.file, { create: true }, writeFile);
                },
                callback,
                callback
            );
        };

        const writeFile = fileEntry => {
            fileEntry.createWriter(fileWriter => {
                fileWriter.onerror = callback;
                fileWriter.onwriteend = () => callback();
                fileWriter.write(data);
            }, callback);
        };

        if (path.startsWith('cdvfile://')) {
            // then file exists
            window.resolveLocalFileSystemURL(path, writeFile, callback, callback);
        } else {
            // create file on sd card
            const filePath = this.parsePath(path);
            this.mkdir(filePath.dir, () => {
                createFile(filePath);
            });
        }
    },
    readFile(path, encoding, callback) {
        window.resolveLocalFileSystemURL(
            path,
            fileEntry => {
                fileEntry.file(
                    file => {
                        const reader = new FileReader();
                        reader.onerror = callback;
                        reader.onloadend = () => {
                            const contents = new Uint8Array(reader.result);
                            callback(
                                encoding ? String.fromCharCode.apply(null, contents) : contents
                            );
                        };
                        reader.readAsArrayBuffer(file);
                    },
                    err => callback(undefined, err)
                );
            },
            err => callback(undefined, err)
        );
    },
    fileExists(path, callback) {
        window.resolveLocalFileSystemURL(
            path,
            fileEntry => callback(true),
            () => callback(false)
        );
    },
    deleteFile(path, callback) {
        window.resolveLocalFileSystemURL(
            path,
            fileEntry => {
                fileEntry.remove(callback, callback, callback);
            },
            callback
        );
    },
    statFile(path, callback) {
        window.resolveLocalFileSystemURL(
            path,
            fileEntry => {
                fileEntry.file(
                    file => {
                        callback({
                            ctime: new Date(file.lastModified),
                            mtime: new Date(file.lastModified)
                        });
                    },
                    err => callback(undefined, err)
                );
            },
            err => callback(undefined, err)
        );
    },
    mkdir(dir, callback) {
        const basePath = this.getDataPath().join('/');
        const createDir = (dirEntry, path, callback) => {
            const name = path.shift();
            dirEntry.getDirectory(
                name,
                { create: true },
                dirEntry => {
                    if (path.length) {
                        // there is more to create
                        createDir(dirEntry, path, callback);
                    } else {
                        callback();
                    }
                },
                callback
            );
        };

        const localPath = dir
            .replace(basePath, '')
            .split('/')
            .filter(s => !!s);

        if (localPath.length) {
            window.resolveLocalFileSystemURL(
                basePath,
                dirEntry => {
                    createDir(dirEntry, localPath, callback);
                },
                callback
            );
        } else {
            callback();
        }
    },
    parsePath(fileName) {
        const parts = fileName.split('/');

        return {
            path: fileName,
            file: parts.pop(),
            dir: parts.join('/')
        };
    },
    createFsWatcher(path) {
        return null; // not in android with content provider
    },
    ensureRunnable(path) {},
    preventExit(e) {
        e.returnValue = false;
        return false;
    },
    exit() {
        this.hideApp();
    },
    requestExit() {
        /* skip in cordova */
    },
    requestRestart() {
        window.location.reload();
    },
    cancelRestart() {
        /* skip in cordova */
    },
    setClipboardText(text) {},
    getClipboardText() {},
    clearClipboardText() {},
    minimizeApp() {
        this.hideApp();
    },
    canMinimize() {
        return false;
    },
    canDetectOsSleep() {
        return false;
    },
    updaterEnabled() {
        return false;
    },
    // getMainWindow() {},
    resolveProxy(url, callback) {
        /* skip in cordova */
    },
    hideApp() {
        /* skip in cordova */
    },
    isAppFocused() {
        return false; /* skip in cordova */
    },
    showMainWindow() {
        /* skip in cordova */
    },
    // spawn(config) {},
    openFileChooser(callback) {
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
    setGlobalShortcuts(appSettings) {},
    fingerprints: {
        config: {
            disableBackup: true,
            clientId: 'keeweb'
        },

        register(fileId, password, callback) {
            FingerprintAuth.isAvailable(result => {
                if (!result.isAvailable) {
                    return;
                }

                const encryptConfig = {
                    ...this.config,
                    username: fileId,
                    password: password.getText()
                };

                FingerprintAuth.encrypt(encryptConfig, result => {
                    callback(result.token);
                });
            });
        },

        auth(fileId, token, callback) {
            if (!token) {
                return callback();
            }

            const decryptConfig = { ...this.config, username: fileId, token };

            FingerprintAuth.decrypt(decryptConfig, result => {
                callback(result.password);
            });
        }
    }
};

export { Launcher };

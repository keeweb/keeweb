'use strict';

var Backbone = require('backbone'),
    Locale = require('../util/locale');
var Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    /* jshint node:true */
    Launcher = {
        name: 'electron',
        version: window.process.versions.electron,
        req: window.require,
        remReq: function(mod) {
            return this.req('remote').require(mod);
        },
        openLink: function(href) {
            this.req('shell').openExternal(href);
        },
        devTools: true,
        openDevTools: function() {
            this.req('remote').getCurrentWindow().openDevTools();
        },
        getSaveFileName: function(defaultPath, cb) {
            if (defaultPath) {
                var homePath = this.remReq('app').getPath('userDesktop');
                defaultPath = this.req('path').join(homePath, defaultPath);
            }
            this.remReq('dialog').showSaveDialog({
                title: Locale.launcherSave,
                defaultPath: defaultPath,
                filters: [{ name: Locale.launcherFileFilter, extensions: ['kdbx'] }]
            }, cb);
        },
        getUserDataPath: function(fileName) {
            return this.req('path').join(this.remReq('app').getPath('userData'), fileName || '');
        },
        getTempPath: function(fileName) {
            return this.req('path').join(this.remReq('app').getPath('temp'), fileName || '');
        },
        writeFile: function(path, data) {
            this.req('fs').writeFileSync(path, new window.Buffer(data));
        },
        readFile: function(path, encoding) {
            var contents = this.req('fs').readFileSync(path, encoding);
            return typeof contents === 'string' ? contents : new Uint8Array(contents);
        },
        fileExists: function(path) {
            return this.req('fs').existsSync(path);
        },
        deleteFile: function(path) {
            this.req('fs').unlinkSync(path);
        },
        statFile: function(path) {
            return this.req('fs').statSync(path);
        },
        parsePath: function(fileName) {
            var path = this.req('path');
            return { path: fileName, dir: path.dirname(fileName), file: path.basename(fileName) };
        },
        createFsWatcher: function(path) {
            return this.req('fs').watch(path, { persistent: false });
        },
        preventExit: function(e) {
            e.returnValue = false;
            return false;
        },
        exit: function() {
            this.exitRequested = true;
            this.requestExit();
        },
        requestExit: function() {
            var app = this.remReq('app');
            if (this.restartPending) {
                app.restartApp();
            } else {
                app.quit();
            }
        },
        requestRestart: function() {
            this.restartPending = true;
            this.requestExit();
        },
        cancelRestart: function() {
            this.restartPending = false;
        },
        setClipboardText: function(text) {
            return this.req('clipboard').writeText(text);
        },
        getClipboardText: function() {
            return this.req('clipboard').readText();
        },
        clearClipboardText: function() {
            return this.req('clipboard').clear();
        },
        minimizeApp: function() {
            this.remReq('app').minimizeApp();
        },
        canMinimize: function() {
            return process.platform === 'win32';
        },
        updaterEnabled: function() {
            return this.req('remote').process.argv.indexOf('--disable-updater') === -1;
        },
        resolveProxy: function(url, callback) {
            var window = this.remReq('app').getMainWindow();
            var session = window.webContents.session;
            session.resolveProxy(url, function(proxy) {
                var match = /^proxy\s+([\w\.]+):(\d+)+\s*/i.exec(proxy);
                proxy = match && match[1] ? { host: match[1], port: +match[2] } : null;
                callback(proxy);
            });
        }
    };
    Backbone.on('launcher-exit-request', function() {
        setTimeout(function() { Launcher.exit(); }, 0);
    });
    Backbone.on('launcher-minimize', function() {
        setTimeout(function() { Backbone.trigger('app-minimized'); }, 0);
    });
    window.launcherOpen = function(path) {
        Backbone.trigger('launcher-open-file', path);
    };
    if (window.launcherOpenedFile) {
        console.log('Open file request', window.launcherOpenedFile);
        Backbone.trigger('launcher-open-file', window.launcherOpenedFile);
        delete window.launcherOpenedFile;
    }
}

module.exports = Launcher;

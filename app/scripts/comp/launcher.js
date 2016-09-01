'use strict';

var Backbone = require('backbone'),
    Locale = require('../util/locale'),
    Logger = require('../util/logger');

var Launcher;

var logger = new Logger('launcher');

if (window.process && window.process.versions && window.process.versions.electron) {
    Launcher = {
        name: 'electron',
        version: window.process.versions.electron,
        req: window.require,
        electron: function() {
            return this.req('electron');
        },
        remoteApp: function() {
            return this.electron().remote.app;
        },
        remReq: function(mod) {
            return this.electron().remote.require(mod);
        },
        openLink: function(href) {
            this.electron().shell.openExternal(href);
        },
        devTools: true,
        openDevTools: function() {
            this.electron().remote.getCurrentWindow().openDevTools();
        },
        getSaveFileName: function(defaultPath, cb) {
            if (defaultPath) {
                var homePath = this.remReq('electron').app.getPath('userDesktop');
                defaultPath = this.req('path').join(homePath, defaultPath);
            }
            this.remReq('electron').dialog.showSaveDialog({
                title: Locale.launcherSave,
                defaultPath: defaultPath,
                filters: [{ name: Locale.launcherFileFilter, extensions: ['kdbx'] }]
            }, cb);
        },
        getUserDataPath: function(fileName) {
            return this.req('path').join(this.remoteApp().getPath('userData'), fileName || '');
        },
        getTempPath: function(fileName) {
            return this.req('path').join(this.remoteApp().getPath('temp'), fileName || '');
        },
        getDocumentsPath: function(fileName) {
            return this.req('path').join(this.remoteApp().getPath('documents'), fileName || '');
        },
        getAppPath: function(fileName) {
            return this.req('path').join(this.remoteApp().getAppPath(), fileName || '');
        },
        getWorkDirPath: function(fileName) {
            return this.req('path').join(process.cwd(), fileName || '');
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
        ensureRunnable: function(path) {
            if (process.platform !== 'win32') {
                const fs = this.req('fs');
                let stat = fs.statSync(path);
                if ((stat.mode & 0o0111) === 0) {
                    let mode = stat.mode | 0o0100;
                    logger.info(`chmod 0${mode.toString(8)} ${path}`);
                    fs.chmodSync(path, mode);
                }
            }
        },
        mkdir: function(dir) {
            let fs = this.req('fs');
            let path = this.req('path');
            let stack = [];
            while (true) {
                if (fs.existsSync(dir)) {
                    break;
                }
                stack.unshift(dir);
                let newDir = path.dirname(dir);
                if (newDir === dir || !newDir || newDir === '.' || newDir === '/') {
                    break;
                }
                dir = newDir;
            }
            stack.forEach(dir => fs.mkdirSync(dir));
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
            var app = this.remoteApp();
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
            return this.electron().clipboard.writeText(text);
        },
        getClipboardText: function() {
            return this.electron().clipboard.readText();
        },
        clearClipboardText: function() {
            return this.electron().clipboard.clear();
        },
        minimizeApp: function() {
            this.remoteApp().minimizeApp();
        },
        canMinimize: function() {
            return process.platform !== 'darwin';
        },
        updaterEnabled: function() {
            return this.electron().remote.process.argv.indexOf('--disable-updater') === -1;
        },
        getMainWindow: function() {
            return this.remoteApp().getMainWindow();
        },
        resolveProxy: function(url, callback) {
            var window = this.getMainWindow();
            var session = window.webContents.session;
            session.resolveProxy(url, proxy => {
                var match = /^proxy\s+([\w\.]+):(\d+)+\s*/i.exec(proxy);
                proxy = match && match[1] ? { host: match[1], port: +match[2] } : null;
                callback(proxy);
            });
        },
        openWindow: function(opts) {
            return this.remoteApp().openWindow(opts);
        },
        hideApp: function() {
            var app = this.remoteApp();
            if (this.canMinimize()) {
                app.getMainWindow().minimize();
            } else {
                app.hide();
            }
        },
        isAppFocused: function() {
            return !!this.electron().remote.BrowserWindow.getFocusedWindow();
        },
        showMainWindow: function() {
            let win = this.getMainWindow();
            win.show();
            win.restore();
        },
        spawn: function(config) {
            var ts = logger.ts();
            var complete = config.complete;
            var ps = this.req('child_process').spawn(config.cmd, config.args);
            [ps.stdin, ps.stdout, ps.stderr].forEach(s => s.setEncoding('utf-8'));
            var stderr = '';
            var stdout = '';
            ps.stderr.on('data', d => { stderr += d.toString('utf-8'); });
            ps.stdout.on('data', d => { stdout += d.toString('utf-8'); });
            ps.on('close', code => {
                stdout = stdout.trim();
                stderr = stderr.trim();
                var msg = 'spawn ' + config.cmd + ': ' + code + ', ' + logger.ts(ts);
                if (code) {
                    logger.error(msg + '\n' + stdout + '\n' + stderr);
                } else {
                    logger.info(msg + (stdout ? '\n' + stdout : ''));
                }
                if (complete) {
                    complete(code ? 'Exit code ' + code : null, stdout, code);
                    complete = null;
                }
            });
            ps.on('error', err => {
                logger.error('spawn error: ' + config.cmd + ', ' + logger.ts(ts), err);
                if (complete) {
                    complete(err);
                    complete = null;
                }
            });
            if (config.data) {
                try {
                    ps.stdin.write(config.data);
                    ps.stdin.end();
                } catch (e) {
                    logger.error('spawn write error', e);
                }
            }
            return ps;
        },
        platform: function() {
            return process.platform;
        }
    };
    Backbone.on('launcher-exit-request', () => {
        setTimeout(() => Launcher.exit(), 0);
    });
    Backbone.on('launcher-minimize', () => setTimeout(() => Backbone.trigger('app-minimized'), 0));
    window.launcherOpen = function(path) {
        Backbone.trigger('launcher-open-file', path);
    };
    if (window.launcherOpenedFile) {
        logger.info('Open file request', window.launcherOpenedFile);
        Backbone.trigger('launcher-open-file', window.launcherOpenedFile);
        delete window.launcherOpenedFile;
    }
}

module.exports = Launcher;

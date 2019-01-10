const Backbone = require('backbone');
const Locale = require('../util/locale');
const Logger = require('../util/logger');

const logger = new Logger('launcher');

const Launcher = {
    name: 'electron',
    version: window.process.versions.electron,
    autoTypeSupported: true,
    thirdPartyStoragesSupported: true,
    clipboardSupported: true,
    req: window.require,
    platform: function() {
        return process.platform;
    },
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
        this.electron().remote.getCurrentWindow().openDevTools({ mode: 'bottom' });
    },
    getSaveFileName: function(defaultPath, callback) {
        if (defaultPath) {
            const homePath = this.remReq('electron').app.getPath('userDesktop');
            defaultPath = this.joinPath(homePath, defaultPath);
        }
        this.remReq('electron').dialog.showSaveDialog({
            title: Locale.launcherSave,
            defaultPath: defaultPath,
            filters: [{ name: Locale.launcherFileFilter, extensions: ['kdbx'] }]
        }, callback);
    },
    getUserDataPath: function(fileName) {
        if (!this.userDataPath) {
            const realUserDataPath = this.remoteApp().getPath('userData');
            const suffixReplacementRegex = /[\\/]temp[\\/]\d+\.\d+[\\/]?$/;
            this.userDataPath = realUserDataPath.replace(suffixReplacementRegex, '');
        }
        return this.joinPath(this.userDataPath, fileName || '');
    },
    getTempPath: function(fileName) {
        return this.joinPath(this.remoteApp().getPath('temp'), fileName || '');
    },
    getDocumentsPath: function(fileName) {
        return this.joinPath(this.remoteApp().getPath('documents'), fileName || '');
    },
    getAppPath: function(fileName) {
        const dirname = this.req('path').dirname;
        const appPath = __dirname.endsWith('app.asar') ? __dirname : this.remoteApp().getAppPath();
        return this.joinPath(dirname(appPath), fileName || '');
    },
    getWorkDirPath: function(fileName) {
        return this.joinPath(process.cwd(), fileName || '');
    },
    joinPath: function(...parts) {
        return this.req('path').join(...parts);
    },
    writeFile: function(path, data, callback) {
        this.req('fs').writeFile(path, window.Buffer.from(data), callback);
    },
    readFile: function(path, encoding, callback) {
        this.req('fs').readFile(path, encoding, (err, contents) => {
            const data = typeof contents === 'string' ? contents : new Uint8Array(contents);
            callback(data, err);
        });
    },
    fileExists: function(path, callback) {
        this.req('fs').exists(path, callback);
    },
    deleteFile: function(path, callback) {
        this.req('fs').unlink(path, callback || _.noop);
    },
    statFile: function(path, callback) {
        this.req('fs').stat(path, (err, stats) => callback(stats, err));
    },
    mkdir: function(dir, callback) {
        const fs = this.req('fs');
        const path = this.req('path');
        const stack = [];

        const collect = function(dir, stack, callback) {
            fs.exists(dir, exists => {
                if (exists) {
                    return callback();
                }

                stack.unshift(dir);
                const newDir = path.dirname(dir);
                if (newDir === dir || !newDir || newDir === '.' || newDir === '/') {
                    return callback();
                }

                collect(newDir, stack, callback);
            });
        };

        const create = function(stack, callback) {
            if (!stack.length) {
                return callback();
            }

            fs.mkdir(stack.shift(), err =>
                err ? callback(err) : create(stack, callback)
            );
        };

        collect(dir, stack, () => create(stack, callback));
    },
    parsePath: function(fileName) {
        const path = this.req('path');
        return {
            path: fileName,
            dir: path.dirname(fileName),
            file: path.basename(fileName)
        };
    },
    createFsWatcher: function(path) {
        return this.req('fs').watch(path, { persistent: false });
    },
    ensureRunnable: function(path) {
        if (process.platform !== 'win32') {
            const fs = this.req('fs');
            const stat = fs.statSync(path);
            if ((stat.mode & 0o0111) === 0) {
                const mode = stat.mode | 0o0100;
                logger.info(`chmod 0${mode.toString(8)} ${path}`);
                fs.chmodSync(path, mode);
            }
        }
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
        const app = this.remoteApp();
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
    canDetectOsSleep: function() {
        return process.platform !== 'linux';
    },
    updaterEnabled: function() {
        return this.electron().remote.process.argv.indexOf('--disable-updater') === -1;
    },
    getMainWindow: function() {
        return this.remoteApp().getMainWindow();
    },
    resolveProxy: function(url, callback) {
        const window = this.getMainWindow();
        const session = window.webContents.session;
        session.resolveProxy(url, proxy => {
            const match = /^proxy\s+([\w\.]+):(\d+)+\s*/i.exec(proxy);
            proxy = match && match[1] ? { host: match[1], port: +match[2] } : null;
            callback(proxy);
        });
    },
    openWindow: function(opts) {
        return this.remoteApp().openWindow(opts);
    },
    hideApp: function() {
        const app = this.remoteApp();
        if (this.canMinimize()) {
            app.minimizeThenHideIfInTray();
        } else {
            app.hide();
        }
    },
    isAppFocused: function() {
        return !!this.electron().remote.BrowserWindow.getFocusedWindow();
    },
    showMainWindow: function() {
        const win = this.getMainWindow();
        win.show();
        win.restore();
    },
    spawn: function(config) {
        const ts = logger.ts();
        let complete = config.complete;
        const ps = this.req('child_process').spawn(config.cmd, config.args);
        [ps.stdin, ps.stdout, ps.stderr].forEach(s => s.setEncoding('utf-8'));
        let stderr = '';
        let stdout = '';
        ps.stderr.on('data', d => { stderr += d.toString('utf-8'); });
        ps.stdout.on('data', d => { stdout += d.toString('utf-8'); });
        ps.on('close', code => {
            stdout = stdout.trim();
            stderr = stderr.trim();
            const msg = 'spawn ' + config.cmd + ': ' + code + ', ' + logger.ts(ts);
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
    getCookies(callback) {
        this.electron().remote.session.defaultSession.cookies.get({}, callback);
    },
    setCookies(cookies) {
        if (cookies && cookies.length) {
            const session = this.electron().remote.session.defaultSession;
            for (const cookie of cookies) {
                session.cookies.set(cookie, () => {});
            }
        }
    },
    checkOpenFiles() {
        this.readyToOpenFiles = true;
        if (this.pendingFileToOpen) {
            this.openFile(this.pendingFileToOpen);
            delete this.pendingFileToOpen;
        }
    },
    openFile(file) {
        if (this.readyToOpenFiles) {
            Backbone.trigger('launcher-open-file', file);
        } else {
            this.pendingFileToOpen = file;
        }
    }
};

Backbone.on('launcher-exit-request', () => {
    setTimeout(() => Launcher.exit(), 0);
});
Backbone.on('launcher-minimize', () => setTimeout(() => Backbone.trigger('app-minimized'), 0));
window.launcherOpen = file => Launcher.openFile(file);
if (window.launcherOpenedFile) {
    logger.info('Open file request', window.launcherOpenedFile);
    Launcher.openFile(window.launcherOpenedFile);
    delete window.launcherOpenedFile;
}
Backbone.on('app-ready', () => setTimeout(() => Launcher.checkOpenFiles(), 0));

module.exports = Launcher;

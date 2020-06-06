import { Events } from 'framework/events';
import { StartProfiler } from 'comp/app/start-profiler';
import { RuntimeInfo } from 'const/runtime-info';
import { Locale } from 'util/locale';
import { Logger } from 'util/logger';
import { noop } from 'util/fn';

const logger = new Logger('launcher');

const Launcher = {
    name: 'electron',
    version: window.process.versions.electron,
    autoTypeSupported: true,
    thirdPartyStoragesSupported: true,
    clipboardSupported: true,
    req: window.require,
    platform() {
        return process.platform;
    },
    electron() {
        return this.req('electron');
    },
    remoteApp() {
        return this.electron().remote.app;
    },
    remReq(mod) {
        return this.electron().remote.require(mod);
    },
    openLink(href) {
        if (/^(http|https|ftp|sftp|mailto):/i.test(href)) {
            this.electron().shell.openExternal(href);
        }
    },
    devTools: true,
    openDevTools() {
        this.electron().remote.getCurrentWindow().webContents.openDevTools({ mode: 'bottom' });
    },
    getSaveFileName(defaultPath, callback) {
        if (defaultPath) {
            const homePath = this.remReq('electron').app.getPath('userDesktop');
            defaultPath = this.joinPath(homePath, defaultPath);
        }
        this.remReq('electron')
            .dialog.showSaveDialog({
                title: Locale.launcherSave,
                defaultPath,
                filters: [{ name: Locale.launcherFileFilter, extensions: ['kdbx'] }]
            })
            .then((res) => callback(res.filePath));
    },
    getUserDataPath(fileName) {
        if (!this.userDataPath) {
            this.userDataPath = this.remoteApp().getPath('userData');
        }
        return this.joinPath(this.userDataPath, fileName || '');
    },
    getTempPath(fileName) {
        return this.joinPath(this.remoteApp().getPath('temp'), fileName || '');
    },
    getDocumentsPath(fileName) {
        return this.joinPath(this.remoteApp().getPath('documents'), fileName || '');
    },
    getAppPath(fileName) {
        const dirname = this.req('path').dirname;
        const appPath = __dirname.endsWith('app.asar') ? __dirname : this.remoteApp().getAppPath();
        return this.joinPath(dirname(appPath), fileName || '');
    },
    getWorkDirPath(fileName) {
        return this.joinPath(process.cwd(), fileName || '');
    },
    joinPath(...parts) {
        return this.req('path').join(...parts);
    },
    writeFile(path, data, callback) {
        this.req('fs').writeFile(path, window.Buffer.from(data), callback);
    },
    readFile(path, encoding, callback) {
        this.req('fs').readFile(path, encoding, (err, contents) => {
            const data = typeof contents === 'string' ? contents : new Uint8Array(contents);
            callback(data, err);
        });
    },
    fileExists(path, callback) {
        const fs = this.req('fs');
        fs.access(path, fs.constants.F_OK, (err) => callback(!err));
    },
    fileExistsSync(path) {
        const fs = this.req('fs');
        return !fs.accessSync(path, fs.constants.F_OK);
    },
    deleteFile(path, callback) {
        this.req('fs').unlink(path, callback || noop);
    },
    statFile(path, callback) {
        this.req('fs').stat(path, (err, stats) => callback(stats, err));
    },
    mkdir(dir, callback) {
        const fs = this.req('fs');
        const path = this.req('path');
        const stack = [];

        const collect = function (dir, stack, callback) {
            fs.exists(dir, (exists) => {
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

        const create = function (stack, callback) {
            if (!stack.length) {
                return callback();
            }

            fs.mkdir(stack.shift(), (err) => (err ? callback(err) : create(stack, callback)));
        };

        collect(dir, stack, () => create(stack, callback));
    },
    parsePath(fileName) {
        const path = this.req('path');
        return {
            path: fileName,
            dir: path.dirname(fileName),
            file: path.basename(fileName)
        };
    },
    createFsWatcher(path) {
        return this.req('fs').watch(path, { persistent: false });
    },
    loadConfig(name) {
        return this.remoteApp().loadConfig(name);
    },
    saveConfig(name, data) {
        return this.remoteApp().saveConfig(name, data);
    },
    ensureRunnable(path) {
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
    preventExit(e) {
        e.returnValue = false;
        return false;
    },
    exit() {
        this.exitRequested = true;
        this.requestExit();
    },
    requestExit() {
        const app = this.remoteApp();
        app.setHookBeforeQuitEvent(false);
        if (this.restartPending) {
            app.restartApp();
        } else {
            app.quit();
        }
    },
    requestRestart() {
        this.restartPending = true;
        this.requestExit();
    },
    cancelRestart() {
        this.restartPending = false;
    },
    setClipboardText(text) {
        return this.electron().clipboard.writeText(text);
    },
    getClipboardText() {
        return this.electron().clipboard.readText();
    },
    clearClipboardText() {
        const { clipboard } = this.electron();
        clipboard.clear();
        if (process.platform === 'linux') {
            clipboard.clear('selection');
        }
    },
    quitOnRealQuitEventIfMinimizeOnQuitIsEnabled() {
        return this.platform() === 'darwin';
    },
    minimizeApp() {
        this.remoteApp().minimizeApp({
            restore: Locale.menuRestoreApp.replace('{}', 'KeeWeb'),
            quit: Locale.menuQuitApp.replace('{}', 'KeeWeb')
        });
    },
    canDetectOsSleep() {
        return process.platform !== 'linux';
    },
    updaterEnabled() {
        return this.electron().remote.process.argv.indexOf('--disable-updater') === -1;
    },
    getMainWindow() {
        return this.remoteApp().getMainWindow();
    },
    resolveProxy(url, callback) {
        const window = this.getMainWindow();
        const session = window.webContents.session;
        session.resolveProxy(url).then((proxy) => {
            const match = /^proxy\s+([\w\.]+):(\d+)+\s*/i.exec(proxy);
            proxy = match && match[1] ? { host: match[1], port: +match[2] } : null;
            callback(proxy);
        });
    },
    hideApp() {
        const app = this.remoteApp();
        if (this.platform() === 'darwin') {
            app.hide();
        } else {
            app.minimizeThenHideIfInTray();
        }
    },
    isAppFocused() {
        return !!this.electron().remote.BrowserWindow.getFocusedWindow();
    },
    showMainWindow() {
        this.remoteApp().showAndFocusMainWindow();
    },
    spawn(config) {
        const ts = logger.ts();
        let complete = config.complete;
        const ps = this.req('child_process').spawn(config.cmd, config.args);
        [ps.stdin, ps.stdout, ps.stderr].forEach((s) => s.setEncoding('utf-8'));
        let stderr = '';
        let stdout = '';
        ps.stderr.on('data', (d) => {
            stderr += d.toString('utf-8');
            if (config.throwOnStdErr) {
                try {
                    ps.kill();
                } catch {}
            }
        });
        ps.stdout.on('data', (d) => {
            stdout += d.toString('utf-8');
        });
        ps.on('close', (code) => {
            stdout = stdout.trim();
            stderr = stderr.trim();
            const msg = 'spawn ' + config.cmd + ': ' + code + ', ' + logger.ts(ts);
            if (code !== 0) {
                logger.error(msg + '\n' + stdout + '\n' + stderr);
            } else {
                logger.info(msg + (stdout && !config.noStdOutLogging ? '\n' + stdout : ''));
            }
            if (complete) {
                complete(code !== 0 ? 'Exit code ' + code : null, stdout, code);
                complete = null;
            }
        });
        ps.on('error', (err) => {
            logger.error('spawn error: ' + config.cmd + ', ' + logger.ts(ts), err);
            if (complete) {
                complete(err);
                complete = null;
            }
        });
        if (config.data) {
            try {
                ps.stdin.end(config.data);
            } catch (e) {
                logger.error('spawn write error', e);
            }
        }
        process.nextTick(() => {
            // it should work without destroy, but a process doesn't get launched
            // xubuntu-desktop 19.04 / xfce
            // see https://github.com/keeweb/keeweb/issues/1234
            ps.stdin.destroy();
        });
        return ps;
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
            Events.emit('launcher-open-file', file);
        } else {
            this.pendingFileToOpen = file;
        }
    },
    setGlobalShortcuts(appSettings) {
        this.remoteApp().setGlobalShortcuts(appSettings);
    }
};

Events.on('launcher-exit-request', () => {
    setTimeout(() => Launcher.exit(), 0);
});
Events.on('launcher-minimize', () => setTimeout(() => Events.emit('app-minimized'), 0));
Events.on('launcher-started-minimized', () => setTimeout(() => Launcher.minimizeApp(), 0));
Events.on('start-profile', (data) => StartProfiler.reportAppProfile(data));
Events.on('log', (e) => new Logger(e.category || 'remote-app')[e.method || 'info'](e.message));

window.launcherOpen = (file) => Launcher.openFile(file);
if (window.launcherOpenedFile) {
    logger.info('Open file request', window.launcherOpenedFile);
    Launcher.openFile(window.launcherOpenedFile);
    delete window.launcherOpenedFile;
}
Events.on('app-ready', () =>
    setTimeout(() => {
        Launcher.checkOpenFiles();
        Launcher.remoteApp().setAboutPanelOptions({
            applicationVersion: RuntimeInfo.version,
            version: RuntimeInfo.commit
        });
    }, 0)
);

if (process.platform === 'darwin') {
    Launcher.remoteApp().setHookBeforeQuitEvent(true);
}

Launcher.remoteApp().on('remote-app-event', (e) => {
    if (window.debugRemoteAppEvents) {
        logger.debug('remote-app-event', e.name);
    }
    Events.emit(e.name, e.data);
});

export { Launcher };

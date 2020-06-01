const electron = require('electron');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

let perfTimestamps = global.perfTimestamps;
perfTimestamps.push({ name: 'loading app requires', ts: process.hrtime() });

const app = electron.app;

let mainWindow = null;
let appIcon = null;
let ready = false;
let appReady = false;
let restartPending = false;
let mainWindowPosition = {};
let updateMainWindowPositionTimeout = null;
let mainWindowMaximized = false;
let usbBinding = null;

const windowPositionFileName = 'window-position.json';
const portableConfigFileName = 'keeweb-portable.json';

const isDev = !__dirname.endsWith('.asar');

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

perfTimestamps?.push({ name: 'single instance lock', ts: process.hrtime() });

let isPortable;
let execPath;

setPortableAndExecPath();
initUserDataDir();

let openFile = process.argv.filter(arg => /\.kdbx$/i.test(arg))[0];

const htmlPath =
    (isDev && process.env.KEEWEB_HTML_PATH) || 'file://' + path.join(__dirname, 'index.html');
const showDevToolsOnStart =
    process.argv.some(arg => arg.startsWith('--devtools')) ||
    process.env.KEEWEB_OPEN_DEVTOOLS === '1';

const loginItemSettings = process.platform === 'darwin' ? app.getLoginItemSettings() : {};

const startMinimized =
    loginItemSettings.wasOpenedAsHidden || process.argv.some(arg => arg.startsWith('--minimized'));

const themeBgColors = {
    db: '#342f2e',
    fb: '#282c34',
    wh: '#fafafa',
    te: '#222',
    hc: '#fafafa',
    sd: '#002b36',
    sl: '#fdf6e3',
    macdark: '#1f1f20'
};
const defaultBgColor = '#282C34';

perfTimestamps?.push({ name: 'defining args', ts: process.hrtime() });

setEnv();
setDevAppIcon();

let configEncryptionKey;
let appSettings;

const settingsPromise = loadSettingsEncryptionKey().then(key => {
    configEncryptionKey = key;
    perfTimestamps?.push({ name: 'loading settings key', ts: process.hrtime() });

    return loadConfig('app-settings').then(settings => {
        appSettings = settings ? JSON.parse(settings) : {};
        perfTimestamps?.push({ name: 'reading app settings', ts: process.hrtime() });
    });
});

app.on('window-all-closed', () => {
    if (restartPending) {
        app.relaunch();
        app.exit(0);
    } else {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }
});
app.on('ready', () => {
    perfTimestamps?.push({ name: 'app on ready', ts: process.hrtime() });
    appReady = true;

    settingsPromise
        .then(() => {
            setSystemAppearance();
            createMainWindow();
            setGlobalShortcuts(appSettings);
            subscribePowerEvents();
            deleteOldTempFiles();
            hookRequestHeaders();
        })
        .catch(e => {
            electron.dialog.showErrorBox('KeeWeb', 'Error loading app: ' + e);
            process.exit(2);
        });
});
app.on('open-file', (e, path) => {
    e.preventDefault();
    openFile = path;
    notifyOpenFile();
});
app.on('activate', () => {
    if (process.platform === 'darwin') {
        if (appReady && !mainWindow) {
            createMainWindow();
        }
    }
});
app.on('before-quit', e => {
    if (process.platform === 'darwin') {
        if (!app.skipBeforeQuitEvent) {
            e.preventDefault();
            emitRemoteEvent('launcher-before-quit');
        }
    }
});
app.on('will-quit', () => {
    electron.globalShortcut.unregisterAll();
});
app.on('second-instance', () => {
    if (mainWindow) {
        restoreMainWindow();
    }
});
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', async (e, url) => {
        e.preventDefault();
        emitRemoteEvent('log', { message: `Prevented new window: ${url}` });
    });
    contents.on('will-navigate', (e, url) => {
        if (!url.startsWith('https://beta.keeweb.info/') && !url.startsWith(htmlPath)) {
            e.preventDefault();
            emitRemoteEvent('log', { message: `Prevented navigation: ${url}` });
        }
    });
});
app.restartApp = function() {
    restartPending = true;
    mainWindow.close();
    setTimeout(() => {
        restartPending = false;
    }, 1000);
};
app.minimizeApp = function(menuItemLabels) {
    let imagePath;
    mainWindow.hide();
    if (process.platform === 'darwin') {
        app.dock.hide();
        imagePath = 'mac-menubar-icon.png';
    } else {
        imagePath = 'icon.png';
    }
    mainWindow.setSkipTaskbar(true);
    if (!appIcon) {
        const image = electron.nativeImage.createFromPath(path.join(__dirname, imagePath));
        appIcon = new electron.Tray(image);
        appIcon.on('click', restoreMainWindow);
        const contextMenu = electron.Menu.buildFromTemplate([
            { label: menuItemLabels.restore, click: restoreMainWindow },
            { label: menuItemLabels.quit, click: closeMainWindow }
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.setToolTip('KeeWeb');
    }
};
app.minimizeThenHideIfInTray = function() {
    // This function is called when auto-type has displayed a selection list and a selection was made.
    // To ensure focus returns to the previous window we must minimize first even if we're going to hide.
    mainWindow.minimize();
    if (appIcon) mainWindow.hide();
};
app.getMainWindow = function() {
    return mainWindow;
};
app.setSkipBeforeQuitEvent = () => {
    app.skipBeforeQuitEvent = true;
};
app.setGlobalShortcuts = setGlobalShortcuts;
app.reqNative = reqNative;
app.showAndFocusMainWindow = showAndFocusMainWindow;
app.loadConfig = loadConfig;
app.saveConfig = saveConfig;

function setSystemAppearance() {
    if (process.platform === 'darwin') {
        if (electron.nativeTheme.shouldUseDarkColors) {
            electron.systemPreferences.appLevelAppearance = 'dark';
        }
    }
    perfTimestamps?.push({ name: 'setting system appearance', ts: process.hrtime() });
}

function getDefaultTheme() {
    return process.platform === 'darwin' ? 'macdark' : 'fb';
}

function createMainWindow() {
    const theme = appSettings.theme || getDefaultTheme();
    const bgColor = themeBgColors[theme] || defaultBgColor;
    const windowOptions = {
        show: false,
        width: 1000,
        height: 700,
        minWidth: 700,
        minHeight: 400,
        titleBarStyle: appSettings.titlebarStyle,
        backgroundColor: bgColor,
        webPreferences: {
            backgroundThrottling: false,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            enableRemoteModule: true
        }
    };
    if (process.platform !== 'win32') {
        windowOptions.icon = path.join(__dirname, 'icon.png');
    }
    mainWindow = new electron.BrowserWindow(windowOptions);
    perfTimestamps?.push({ name: 'creating main window', ts: process.hrtime() });

    setMenu();
    perfTimestamps?.push({ name: 'setting menu', ts: process.hrtime() });

    mainWindow.loadURL(htmlPath);
    mainWindow.once('ready-to-show', () => {
        perfTimestamps?.push({ name: 'main window ready', ts: process.hrtime() });
        if (startMinimized) {
            emitRemoteEvent('launcher-started-minimized');
        } else {
            mainWindow.show();
        }
        ready = true;
        notifyOpenFile();
        perfTimestamps?.push({ name: 'main window shown', ts: process.hrtime() });
        reportStartProfile();

        if (showDevToolsOnStart) {
            mainWindow.webContents.openDevTools({ mode: 'bottom' });
        }
    });
    mainWindow.webContents.on('context-menu', onContextMenu);
    mainWindow.on('resize', delaySaveMainWindowPosition);
    mainWindow.on('move', delaySaveMainWindowPosition);
    mainWindow.on('restore', coerceMainWindowPositionToConnectedDisplay);
    mainWindow.on('close', mainWindowClosing);
    mainWindow.on('closed', mainWindowClosed);
    mainWindow.on('focus', mainWindowFocus);
    mainWindow.on('blur', mainWindowBlur);
    mainWindow.on('closed', () => {
        mainWindow = null;
        saveMainWindowPosition();
    });
    mainWindow.on('minimize', () => {
        emitRemoteEvent('launcher-minimize');
    });
    mainWindow.on('maximize', () => {
        mainWindowMaximized = true;
    });
    mainWindow.on('unmaximize', () => {
        mainWindowMaximized = false;
    });
    mainWindow.on('leave-full-screen', () => {
        emitRemoteEvent('leave-full-screen');
    });
    mainWindow.on('enter-full-screen', () => {
        emitRemoteEvent('enter-full-screen');
    });
    mainWindow.on('session-end', () => {
        emitRemoteEvent('os-lock');
    });
    perfTimestamps?.push({ name: 'configuring main window', ts: process.hrtime() });

    restoreMainWindowPosition();
    perfTimestamps?.push({ name: 'restoring main window position', ts: process.hrtime() });
}

function restoreMainWindow() {
    if (process.platform === 'darwin' && !app.dock.isVisible()) {
        app.dock.show();
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    coerceMainWindowPositionToConnectedDisplay();
    setTimeout(destroyAppIcon, 0);
}

function showAndFocusMainWindow() {
    if (mainWindowMaximized) {
        mainWindow.maximize();
    } else {
        mainWindow.show();
    }
    mainWindow.focus();
    if (process.platform === 'darwin' && !app.dock.isVisible()) {
        app.dock.show();
    }
}

function closeMainWindow() {
    emitRemoteEvent('launcher-exit-request');
    setTimeout(destroyAppIcon, 0);
}

function destroyAppIcon() {
    if (appIcon) {
        appIcon.destroy();
        appIcon = null;
    }
}

function delaySaveMainWindowPosition() {
    if (updateMainWindowPositionTimeout) {
        clearTimeout(updateMainWindowPositionTimeout);
    }
    updateMainWindowPositionTimeout = setTimeout(updateMainWindowPosition, 500);
}

function updateMainWindowPositionIfPending() {
    if (updateMainWindowPositionTimeout) {
        clearTimeout(updateMainWindowPositionTimeout);
        updateMainWindowPosition();
    }
}

function updateMainWindowPosition() {
    if (!mainWindow) {
        return;
    }
    updateMainWindowPositionTimeout = null;
    const bounds = mainWindow.getBounds();
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized() && !mainWindow.isFullScreen()) {
        mainWindowPosition.x = bounds.x;
        mainWindowPosition.y = bounds.y;
        mainWindowPosition.width = bounds.width;
        mainWindowPosition.height = bounds.height;
    }
    mainWindowPosition.maximized = mainWindow.isMaximized();
    mainWindowPosition.fullScreen = mainWindow.isFullScreen();
    mainWindowPosition.changed = true;
}

function saveMainWindowPosition() {
    if (!mainWindowPosition.changed) {
        return;
    }
    delete mainWindowPosition.changed;
    try {
        fs.writeFileSync(
            path.join(app.getPath('userData'), windowPositionFileName),
            JSON.stringify(mainWindowPosition),
            'utf8'
        );
    } catch (e) {}
}

function restoreMainWindowPosition() {
    const fileName = path.join(app.getPath('userData'), windowPositionFileName);
    fs.readFile(fileName, 'utf8', (e, data) => {
        if (data) {
            mainWindowPosition = JSON.parse(data);
            if (mainWindow && mainWindowPosition) {
                if (mainWindowPosition.width && mainWindowPosition.height) {
                    mainWindow.setBounds(mainWindowPosition);
                    coerceMainWindowPositionToConnectedDisplay();
                }
                if (mainWindowPosition.maximized) {
                    mainWindow.maximize();
                    mainWindowMaximized = true;
                }
                if (mainWindowPosition.fullScreen) {
                    mainWindow.setFullScreen(true);
                }
            }
        }
    });
}

function mainWindowBlur() {
    emitRemoteEvent('main-window-blur');
}

function mainWindowFocus() {
    emitRemoteEvent('main-window-focus');
}

function mainWindowClosing() {
    updateMainWindowPositionIfPending();
}

function mainWindowClosed() {
    usbBinding?.removeAllListeners();
    app.removeAllListeners('remote-app-event');
}

function emitRemoteEvent(e, arg) {
    if (mainWindow && mainWindow.webContents) {
        app.emit('remote-app-event', {
            name: e,
            data: arg
        });
    }
}

function setMenu() {
    if (process.platform === 'darwin') {
        const name = require('electron').app.name;
        const template = [
            {
                label: name,
                submenu: [
                    { role: 'about' },
                    { type: 'separator' },
                    { role: 'services', submenu: [] },
                    { type: 'separator' },
                    { accelerator: 'Command+H', role: 'hide' },
                    { accelerator: 'Command+Shift+H', role: 'hideothers' },
                    { role: 'unhide' },
                    { type: 'separator' },
                    { role: 'quit', accelerator: 'Command+Q' }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                    { accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                    { type: 'separator' },
                    { accelerator: 'CmdOrCtrl+X', role: 'cut' },
                    { accelerator: 'CmdOrCtrl+C', role: 'copy' },
                    { accelerator: 'CmdOrCtrl+V', role: 'paste' },
                    { accelerator: 'CmdOrCtrl+A', role: 'selectall' }
                ]
            },
            {
                label: 'Window',
                submenu: [
                    { accelerator: 'CmdOrCtrl+M', role: 'minimize' },
                    { accelerator: 'Command+W', role: 'close' }
                ]
            }
        ];
        const menu = electron.Menu.buildFromTemplate(template);
        electron.Menu.setApplicationMenu(menu);
    } else {
        mainWindow.setMenuBarVisibility(false);
        mainWindow.setMenu(null);
        electron.Menu.setApplicationMenu(null);
    }
}

function onContextMenu(e, props) {
    if (props.inputFieldType !== 'plainText' || !props.isEditable) {
        return;
    }
    const Menu = electron.Menu;
    const inputMenu = Menu.buildFromTemplate([
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectall' }
    ]);
    inputMenu.popup(mainWindow);
}

function notifyOpenFile() {
    if (ready && openFile && mainWindow) {
        const openKeyfile = process.argv
            .filter(arg => arg.startsWith('--keyfile='))
            .map(arg => arg.replace('--keyfile=', ''))[0];
        const fileInfo = JSON.stringify({ data: openFile, key: openKeyfile });
        mainWindow.webContents.executeJavaScript(
            'if (window.launcherOpen) { window.launcherOpen(' +
                fileInfo +
                '); } ' +
                ' else { window.launcherOpenedFile=' +
                fileInfo +
                '; }'
        );
        openFile = null;
    }
}

function setGlobalShortcuts(appSettings) {
    const defaultShortcutModifiers = process.platform === 'darwin' ? 'Ctrl+Alt+' : 'Shift+Alt+';
    const defaultShortcuts = {
        AutoType: { shortcut: defaultShortcutModifiers + 'T', event: 'auto-type' },
        CopyPassword: { shortcut: defaultShortcutModifiers + 'C', event: 'copy-password' },
        CopyUser: { shortcut: defaultShortcutModifiers + 'B', event: 'copy-user' },
        CopyUrl: { shortcut: defaultShortcutModifiers + 'U', event: 'copy-url' },
        CopyOtp: { event: 'copy-otp' },
        RestoreApp: { action: restoreMainWindow }
    };
    electron.globalShortcut.unregisterAll();
    for (const [key, shortcutDef] of Object.entries(defaultShortcuts)) {
        const fromSettings = appSettings[`globalShortcut${key}`];
        const shortcut = fromSettings || shortcutDef.shortcut;
        if (shortcut) {
            try {
                electron.globalShortcut.register(shortcut, () => {
                    if (shortcutDef.event) {
                        emitRemoteEvent(shortcutDef.event);
                    }
                    if (shortcutDef.action) {
                        shortcutDef.action();
                    }
                });
            } catch (e) {}
        }
    }
    perfTimestamps?.push({ name: 'setting global shortcuts', ts: process.hrtime() });
}

function subscribePowerEvents() {
    electron.powerMonitor.on('suspend', () => {
        emitRemoteEvent('power-monitor-suspend');
    });
    electron.powerMonitor.on('resume', () => {
        emitRemoteEvent('power-monitor-resume');
    });
    electron.powerMonitor.on('lock-screen', () => {
        emitRemoteEvent('os-lock');
    });
    perfTimestamps?.push({ name: 'subscribing to power events', ts: process.hrtime() });
}

function setPortableAndExecPath() {
    execPath = process.execPath;

    switch (process.platform) {
        case 'darwin':
            isPortable = !execPath.startsWith('/Applications/');
            if (isPortable) {
                execPath = execPath.substring(0, execPath.indexOf('.app'));
            }
            break;
        case 'win32':
            isPortable = !execPath.includes('Program Files');
            break;
        case 'linux':
            isPortable = !execPath.startsWith('/usr/') && !execPath.startsWith('/opt/');
            break;
    }

    if (isDev && process.env.KEEWEB_IS_PORTABLE) {
        isPortable = !!JSON.parse(process.env.KEEWEB_IS_PORTABLE);
    }

    perfTimestamps?.push({ name: 'portable check', ts: process.hrtime() });
}

function initUserDataDir() {
    if (isPortable) {
        const portableConfigDir = path.dirname(execPath);
        const portableConfigPath = path.join(portableConfigDir, portableConfigFileName);

        if (fs.existsSync(portableConfigPath)) {
            const portableConfig = JSON.parse(fs.readFileSync(portableConfigPath, 'utf8'));
            const portableUserDataDir = path.resolve(portableConfigDir, portableConfig.userDataDir);

            if (!fs.existsSync(portableUserDataDir)) {
                fs.mkdirSync(portableUserDataDir);
            }

            app.setPath('userData', portableUserDataDir);
        }
    }

    perfTimestamps?.push({ name: 'userdata dir', ts: process.hrtime() });
}

function setEnv() {
    if (
        process.platform === 'linux' &&
        ['Pantheon', 'Unity:Unity7'].indexOf(process.env.XDG_CURRENT_DESKTOP) !== -1
    ) {
        // https://github.com/electron/electron/issues/9046
        process.env.XDG_CURRENT_DESKTOP = 'Unity';
    }

    app.commandLine.appendSwitch('disable-background-timer-throttling');

    // disable all caching, since we're not using old profile data anyway
    app.commandLine.appendSwitch('disable-http-cache');
    app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

    app.allowRendererProcessReuse = true;

    perfTimestamps?.push({ name: 'setting env', ts: process.hrtime() });
}

// TODO: delete after v1.15
function deleteOldTempFiles() {
    if (app.oldTempFilesDeleted) {
        return;
    }
    setTimeout(() => {
        const tempPath = path.join(app.getPath('userData'), 'temp');
        if (fs.existsSync(tempPath)) {
            deleteRecursive(tempPath);
        }
        app.oldTempFilesDeleted = true; // this is added to prevent file deletion on restart
    }, 1000);
}

function deleteRecursive(dir) {
    for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        if (fs.lstatSync(filePath).isDirectory()) {
            deleteRecursive(filePath);
        } else {
            fs.unlinkSync(filePath);
        }
    }
    fs.rmdirSync(dir);
}

function setDevAppIcon() {
    if (isDev && htmlPath && process.platform === 'darwin') {
        const icon = electron.nativeImage.createFromPath(
            path.join(__dirname, '../graphics/512x512.png')
        );
        app.dock.setIcon(icon);
    }
}

// When sending a PUT XMLHttpRequest Chromium includes the header "Origin: file://".
// This confuses some WebDAV clients, notably OwnCloud.
// The header is invalid, so removing it everywhere it occurs should do no harm.

function hookRequestHeaders() {
    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (
            !details.url.startsWith('ws:') &&
            !details.url.startsWith('https://plugins.keeweb.info/')
        ) {
            delete details.requestHeaders.Origin;
        }
        callback({ requestHeaders: details.requestHeaders });
    });
    perfTimestamps?.push({ name: 'setting request handlers', ts: process.hrtime() });
}

// If a display is disconnected while KeeWeb is minimized, Electron does not
// ensure that the restored window appears on a display that is still connected.
// This checks to be sure the title bar is somewhere the user can grab it,
// without making it impossible to minimize and restore a window keeping it
// partially off-screen or straddling two displays if the user desires that.

function coerceMainWindowPositionToConnectedDisplay() {
    const eScreen = electron.screen;
    const displays = eScreen.getAllDisplays();
    if (!displays || !displays.length) return;
    const windowBounds = mainWindow.getBounds();
    const contentBounds = mainWindow.getContentBounds();
    const tbLeft = windowBounds.x;
    const tbRight = windowBounds.x + windowBounds.width;
    const tbTop = windowBounds.y;
    const tbBottom = contentBounds.y;
    // 160px width and 2/3s the title bar height should be enough that the user can grab it
    for (let i = 0; i < displays.length; ++i) {
        const workArea = displays[i].workArea;
        const overlapWidth =
            Math.min(tbRight, workArea.x + workArea.width) - Math.max(tbLeft, workArea.x);
        const overlapHeight =
            Math.min(tbBottom, workArea.y + workArea.height) - Math.max(tbTop, workArea.y);
        if (overlapWidth >= 160 && 3 * overlapHeight >= 2 * (tbBottom - tbTop)) return;
    }
    // If we get here, no display contains a big enough strip of the title bar
    // that we can be confident the user can drag it into visibility.  Rather than
    // attempt to guess what the user wants, just center it on the primary display.
    // Try to keep the previous height and width, but clamp each to 90% of the workarea.
    const workArea = eScreen.getPrimaryDisplay().workArea;
    const newWidth = Math.min(windowBounds.width, Math.floor(0.9 * workArea.width));
    const newHeight = Math.min(windowBounds.height, Math.floor(0.9 * workArea.height));
    mainWindow.setBounds({
        'x': workArea.x + Math.floor((workArea.width - newWidth) / 2),
        'y': workArea.y + Math.floor((workArea.height - newHeight) / 2),
        'width': newWidth,
        'height': newHeight
    });
    updateMainWindowPosition();
}

function reportStartProfile() {
    if (!perfTimestamps) {
        return;
    }

    const processCreationTime = process.getCreationTime();
    const totalTime = Math.round(Date.now() - processCreationTime);
    let lastTs = 0;
    const timings = perfTimestamps
        .map(milestone => {
            const ts = milestone.ts;
            const elapsed = lastTs
                ? Math.round((ts[0] - lastTs[0]) * 1e3 + (ts[1] - lastTs[1]) / 1e6)
                : 0;
            lastTs = ts;
            return {
                name: milestone.name,
                elapsed
            };
        })
        .slice(1);

    perfTimestamps = global.perfTimestamps = undefined;

    const startProfile = { totalTime, timings };
    emitRemoteEvent('start-profile', startProfile);
}

function reqNative(mod) {
    const fileName = `${mod}-${process.platform}-${process.arch}.node`;

    const mainAsarPath = process.mainModule.path;
    const latestAsarPath = __dirname;
    const pathInsideAsar = `node_modules/@keeweb/keeweb-native-modules/${fileName}`;

    let fullPath = path.join(latestAsarPath, pathInsideAsar);
    if (!fs.existsSync(fullPath)) {
        fullPath = path.join(mainAsarPath, pathInsideAsar);
    }

    const binding = require(fullPath);

    if (mod === 'usb') {
        usbBinding = initUsb(binding);
    }

    return binding;
}

function initUsb(binding) {
    Object.keys(EventEmitter.prototype).forEach(key => {
        binding[key] = EventEmitter.prototype[key];
    });

    binding.on('newListener', () => {
        if (binding.listenerCount('attach') === 0 && binding.listenerCount('detach') === 0) {
            binding._enableHotplugEvents();
        }
    });

    binding.on('removeListener', () => {
        if (binding.listenerCount('attach') === 0 && binding.listenerCount('detach') === 0) {
            binding._disableHotplugEvents();
        }
    });

    return binding;
}

function loadSettingsEncryptionKey() {
    return Promise.resolve().then(() => {
        if (isPortable) {
            return null;
        }

        const explicitlyDisabledFile = path.join(app.getPath('userData'), 'disable-keytar');
        if (fs.existsSync(explicitlyDisabledFile)) {
            // TODO: remove this fallback if everything goes well on v1.15
            // This is a protective measure if everything goes terrible with native modules
            // For example, the app can crash and it won't be possible to use it at all
            return null;
        }

        const keytar = reqNative('keytar');

        return keytar.getPassword('KeeWeb', 'settings-key').then(key => {
            if (key) {
                return Buffer.from(key, 'hex');
            }
            key = require('crypto').randomBytes(48);
            return keytar.setPassword('KeeWeb', 'settings-key', key.toString('hex')).then(() => {
                return migrateOldConfigs(key).then(() => key);
            });
        });
    });
}

function loadConfig(name) {
    const ext = configEncryptionKey ? 'dat' : 'json';
    const configFilePath = path.join(app.getPath('userData'), `${name}.${ext}`);

    return new Promise((resolve, reject) => {
        fs.readFile(configFilePath, (err, data) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    resolve(null);
                } else {
                    reject(`Error reading config ${name}: ${err}`);
                }
                return;
            }

            try {
                if (configEncryptionKey) {
                    const key = configEncryptionKey.slice(0, 32);
                    const iv = configEncryptionKey.slice(32, 48);

                    const crypto = require('crypto');
                    const cipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

                    data = Buffer.concat([cipher.update(data), cipher.final()]);
                }

                resolve(data.toString('utf8'));
            } catch (err) {
                reject(`Error reading config data ${name}: ${err}`);
            }
        });
    });
}

function saveConfig(name, data, key) {
    if (!key) {
        key = configEncryptionKey;
    }

    return new Promise((resolve, reject) => {
        try {
            data = Buffer.from(data);

            if (key) {
                const crypto = require('crypto');
                const cipher = crypto.createCipheriv(
                    'aes-256-cbc',
                    key.slice(0, 32),
                    key.slice(32, 48)
                );

                data = Buffer.concat([cipher.update(data), cipher.final()]);
            }
        } catch (err) {
            return reject(`Error writing config data ${name}: ${err}`);
        }

        const ext = key ? 'dat' : 'json';
        const configFilePath = path.join(app.getPath('userData'), `${name}.${ext}`);
        fs.writeFile(configFilePath, data, err => {
            if (err) {
                reject(`Error writing config ${name}: ${err}`);
            } else {
                resolve();
            }
        });
    });
}

// TODO: delete in 2021
function migrateOldConfigs(key) {
    const knownConfigs = [
        'file-info',
        'app-settings',
        'runtime-data',
        'update-info',
        'plugin-gallery',
        'plugins'
    ];

    const promises = [];

    for (const configName of knownConfigs) {
        promises.push(
            loadConfig(configName).then(data => {
                if (data) {
                    return saveConfig(configName, data, key).then(() => {
                        fs.unlinkSync(path.join(app.getPath('userData'), `${configName}.json`));
                    });
                }
            })
        );
    }

    return Promise.all(promises);
}

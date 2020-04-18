const electron = require('electron');
const path = require('path');
const fs = require('fs');

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

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
}

perfTimestamps && perfTimestamps.push({ name: 'single instance lock', ts: process.hrtime() });

let openFile = process.argv.filter(arg => /\.kdbx$/i.test(arg))[0];
const userDataDir =
    process.env.KEEWEB_PORTABLE_EXECUTABLE_DIR ||
    app.getPath('userData').replace(/[\\/]temp[\\/]\d+\.\d+[\\/]?$/, '');
const windowPositionFileName = path.join(userDataDir, 'window-position.json');
const appSettingsFileName = path.join(userDataDir, 'app-settings.json');
const tempUserDataPath = path.join(userDataDir, 'temp');
const tempUserDataPathRand = Date.now().toString() + Math.random().toString();

let htmlPath = process.argv
    .filter(arg => arg.startsWith('--htmlpath='))
    .map(arg => arg.replace('--htmlpath=', ''))[0];
if (!htmlPath) {
    htmlPath = 'file://' + path.join(__dirname, 'index.html');
}

const showDevToolsOnStart =
    process.argv.some(arg => arg.startsWith('--devtools')) ||
    process.env.KEEWEB_OPEN_DEVTOOLS === '1';

const startMinimized = process.argv.some(arg => arg.startsWith('--minimized'));

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

perfTimestamps && perfTimestamps.push({ name: 'defining args', ts: process.hrtime() });

setEnv();
restorePreferences();

const appSettings = readAppSettings() || {};

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
    perfTimestamps && perfTimestamps.push({ name: 'app on ready', ts: process.hrtime() });
    appReady = true;
    setAppOptions();
    setSystemAppearance();
    createMainWindow();
    setGlobalShortcuts(appSettings);
    subscribePowerEvents();
    deleteOldTempFiles();
    hookRequestHeaders();
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
app.setGlobalShortcuts = setGlobalShortcuts;

function setAppOptions() {
    app.commandLine.appendSwitch('disable-background-timer-throttling');
    perfTimestamps && perfTimestamps.push({ name: 'setting app options', ts: process.hrtime() });
}

function readAppSettings() {
    try {
        return JSON.parse(fs.readFileSync(appSettingsFileName, 'utf8'));
    } catch (e) {
        return null;
    } finally {
        perfTimestamps &&
            perfTimestamps.push({ name: 'reading app settings', ts: process.hrtime() });
    }
}

function setSystemAppearance() {
    if (process.platform === 'darwin') {
        if (electron.nativeTheme.shouldUseDarkColors) {
            electron.systemPreferences.appLevelAppearance = 'dark';
        }
    }
    perfTimestamps &&
        perfTimestamps.push({ name: 'setting system appearance', ts: process.hrtime() });
}

function createMainWindow() {
    const windowOptions = {
        show: false,
        width: 1000,
        height: 700,
        minWidth: 700,
        minHeight: 400,
        titleBarStyle: appSettings.titlebarStyle,
        backgroundColor: themeBgColors[appSettings.theme] || defaultBgColor,
        webPreferences: {
            backgroundThrottling: false,
            nodeIntegration: true,
            nodeIntegrationInWorker: true
        }
    };
    if (process.platform !== 'win32') {
        windowOptions.icon = path.join(__dirname, 'icon.png');
    }
    mainWindow = new electron.BrowserWindow(windowOptions);
    perfTimestamps && perfTimestamps.push({ name: 'creating main window', ts: process.hrtime() });

    setMenu();
    perfTimestamps && perfTimestamps.push({ name: 'setting menu', ts: process.hrtime() });

    mainWindow.loadURL(htmlPath);
    if (showDevToolsOnStart) {
        mainWindow.openDevTools({ mode: 'bottom' });
    }
    mainWindow.once('ready-to-show', () => {
        perfTimestamps && perfTimestamps.push({ name: 'main window ready', ts: process.hrtime() });
        if (startMinimized) {
            emitRemoteEvent('launcher-started-minimized');
        } else {
            mainWindow.show();
        }
        ready = true;
        notifyOpenFile();
        perfTimestamps && perfTimestamps.push({ name: 'main window shown', ts: process.hrtime() });
        reportStartProfile();
    });
    mainWindow.webContents.on('context-menu', onContextMenu);
    mainWindow.on('resize', delaySaveMainWindowPosition);
    mainWindow.on('move', delaySaveMainWindowPosition);
    mainWindow.on('restore', coerceMainWindowPositionToConnectedDisplay);
    mainWindow.on('close', updateMainWindowPositionIfPending);
    mainWindow.on('focus', mainWindowFocus);
    mainWindow.on('blur', mainWindowBlur);
    mainWindow.on('closed', () => {
        mainWindow = null;
        saveMainWindowPosition();
    });
    mainWindow.on('minimize', () => {
        emitRemoteEvent('launcher-minimize');
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
    perfTimestamps &&
        perfTimestamps.push({ name: 'configuring main window', ts: process.hrtime() });

    restoreMainWindowPosition();
    perfTimestamps &&
        perfTimestamps.push({ name: 'restoring main window position', ts: process.hrtime() });
}

function restoreMainWindow() {
    // if (process.platform === 'darwin') {
    //     app.dock.show();
    //     mainWindow.show();
    // }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    coerceMainWindowPositionToConnectedDisplay();
    setTimeout(destroyAppIcon, 0);
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
        fs.writeFileSync(windowPositionFileName, JSON.stringify(mainWindowPosition), 'utf8');
    } catch (e) {}
}

function restoreMainWindowPosition() {
    fs.readFile(windowPositionFileName, 'utf8', (e, data) => {
        if (data) {
            mainWindowPosition = JSON.parse(data);
            if (mainWindow && mainWindowPosition) {
                if (mainWindowPosition.width && mainWindowPosition.height) {
                    mainWindow.setBounds(mainWindowPosition);
                    coerceMainWindowPositionToConnectedDisplay();
                }
                if (mainWindowPosition.maximized) {
                    mainWindow.maximize();
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
    perfTimestamps &&
        perfTimestamps.push({ name: 'setting global shortcuts', ts: process.hrtime() });
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
    perfTimestamps &&
        perfTimestamps.push({ name: 'subscribing to power events', ts: process.hrtime() });
}

function setEnv() {
    app.setPath('userData', path.join(tempUserDataPath, tempUserDataPathRand));
    if (
        process.platform === 'linux' &&
        ['Pantheon', 'Unity:Unity7'].indexOf(process.env.XDG_CURRENT_DESKTOP) !== -1
    ) {
        // https://github.com/electron/electron/issues/9046
        process.env.XDG_CURRENT_DESKTOP = 'Unity';
    }
    perfTimestamps && perfTimestamps.push({ name: 'setting env', ts: process.hrtime() });
}

function restorePreferences() {
    const profileConfigPath = path.join(userDataDir, 'profile.json');

    const newProfile = { dir: tempUserDataPathRand };
    let oldProfile;
    try {
        oldProfile = JSON.parse(fs.readFileSync(profileConfigPath, 'utf8'));
    } catch (e) {}

    fs.writeFileSync(profileConfigPath, JSON.stringify(newProfile));

    if (oldProfile && oldProfile.dir && /^[\d.]+$/.test(oldProfile.dir)) {
        const oldProfilePath = path.join(tempUserDataPath, oldProfile.dir);
        const newProfilePath = path.join(tempUserDataPath, newProfile.dir);
        if (fs.existsSync(path.join(oldProfilePath, 'Cookies'))) {
            if (!fs.existsSync(newProfilePath)) {
                fs.mkdirSync(newProfilePath);
            }
            const cookiesFileSrc = path.join(oldProfilePath, 'Cookies');
            const cookiesFileDest = path.join(newProfilePath, 'Cookies');
            try {
                fs.renameSync(cookiesFileSrc, cookiesFileDest);
            } catch (e) {
                try {
                    fs.copyFileSync(cookiesFileSrc, cookiesFileDest);
                } catch (e) {}
            }
        }
    }

    perfTimestamps && perfTimestamps.push({ name: 'restoring preferences', ts: process.hrtime() });
}

function deleteOldTempFiles() {
    if (app.oldTempFilesDeleted) {
        return;
    }
    setTimeout(() => {
        for (const dir of fs.readdirSync(tempUserDataPath)) {
            if (dir !== tempUserDataPathRand) {
                try {
                    deleteRecursive(path.join(tempUserDataPath, dir));
                } catch (e) {}
            }
        }
        app.oldTempFilesDeleted = true; // this is added to prevent file deletion on restart
    }, 1000);
    perfTimestamps &&
        perfTimestamps.push({ name: 'deleting old temp files', ts: process.hrtime() });
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

// When sending a PUT XMLHttpRequest Chromium includes the header "Origin: file://".
// This confuses some WebDAV clients, notably OwnCloud.
// The header is invalid, so removing it everywhere it occurs should do no harm.

function hookRequestHeaders() {
    electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        if (!details.url.startsWith('ws:')) {
            delete details.requestHeaders.Origin;
        }
        callback({ requestHeaders: details.requestHeaders });
    });
    perfTimestamps &&
        perfTimestamps.push({ name: 'setting request handlers', ts: process.hrtime() });
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

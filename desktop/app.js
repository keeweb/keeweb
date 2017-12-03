const electron = require('electron');
const app = electron.app;
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let appIcon = null;
let openFile = process.argv.filter(arg => /\.kdbx$/i.test(arg))[0];
let ready = false;
let appReady = false;
let restartPending = false;
let mainWindowPosition = {};
let updateMainWindowPositionTimeout = null;
const userDataDir = app.getPath('userData').replace(/[\\/]temp[\\/]\d+\.\d+[\\/]?$/, '');
const windowPositionFileName = path.join(userDataDir, 'window-position.json');
const appSettingsFileName = path.join(userDataDir, 'app-settings.json');
const tempUserDataPath = path.join(userDataDir, 'temp');
const tempUserDataPathRand = Date.now().toString() + Math.random().toString();
const systemNotificationIds = [];

let htmlPath = process.argv.filter(arg => arg.startsWith('--htmlpath=')).map(arg => arg.replace('--htmlpath=', ''))[0];
if (!htmlPath) {
    htmlPath = 'file://' + path.join(__dirname, 'index.html');
}
const showDevToolsOnStart = process.argv.some(arg => arg.startsWith('--devtools'));

app.setPath('userData', path.join(tempUserDataPath, tempUserDataPathRand));

setEnv();

app.on('window-all-closed', () => {
    if (restartPending) {
        // unbind all handlers, load new app.js module and pass control to it
        app.removeAllListeners('window-all-closed');
        app.removeAllListeners('ready');
        app.removeAllListeners('open-file');
        app.removeAllListeners('activate');
        electron.globalShortcut.unregisterAll();
        electron.powerMonitor.removeAllListeners('suspend');
        electron.powerMonitor.removeAllListeners('resume');
        for (const id of systemNotificationIds) {
            electron.systemPreferences.unsubscribeNotification(id);
        }
        systemNotificationIds.length = 0;
        const userDataAppFile = path.join(userDataDir, 'app.asar/app.js');
        delete require.cache[require.resolve('./app.js')];
        require(userDataAppFile);
        app.emit('ready');
    } else {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }
});
app.on('ready', () => {
    if (!checkSingleInstance()) {
        appReady = true;
        setAppOptions();
        createMainWindow();
        setGlobalShortcuts();
        subscribePowerEvents();
        deleteOldTempFiles();
    }
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
app.restartApp = function () {
    restartPending = true;
    mainWindow.close();
    setTimeout(() => {
        restartPending = false;
    }, 1000);
};
app.openWindow = function (opts) {
    return new electron.BrowserWindow(opts);
};
app.minimizeApp = function () {
    if (process.platform !== 'darwin') {
        mainWindow.minimize();
        mainWindow.setSkipTaskbar(true);
        appIcon = new electron.Tray(path.join(__dirname, 'icon.png'));
        appIcon.on('click', restoreMainWindow);
        const contextMenu = electron.Menu.buildFromTemplate([
            {label: 'Open KeeWeb', click: restoreMainWindow},
            {label: 'Quit KeeWeb', click: closeMainWindow}
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.setToolTip('KeeWeb');
    }
};
app.getMainWindow = function () {
    return mainWindow;
};
app.emitBackboneEvent = emitBackboneEvent;

function checkSingleInstance() {
    const shouldQuit = app.makeSingleInstance((/* commandLine, workingDirectory */) => {
        restoreMainWindow();
    });

    if (shouldQuit) {
        app.quit();
    }
    return shouldQuit;
}

function setAppOptions() {
    app.commandLine.appendSwitch('disable-background-timer-throttling');
}

function readAppSettings() {
    try {
        return JSON.parse(fs.readFileSync(appSettingsFileName, 'utf8'));
    } catch (e) {
        return null;
    }
}

function createMainWindow() {
    const appSettings = readAppSettings();
    mainWindow = new electron.BrowserWindow({
        show: false,
        width: 1000, height: 700, minWidth: 700, minHeight: 400,
        icon: path.join(__dirname, 'icon.png'),
        titleBarStyle: appSettings ? appSettings.titlebarStyle : undefined,
        backgroundColor: '#282C34',
        webPreferences: {
            backgroundThrottling: false
        }
    });
    setMenu();
    mainWindow.loadURL(htmlPath);
    if (showDevToolsOnStart) {
        mainWindow.openDevTools();
    }
    mainWindow.once('ready-to-show', () => {
        setTimeout(() => {
            mainWindow.show();
            ready = true;
            notifyOpenFile();
        }, 50);
    });
    mainWindow.webContents.on('context-menu', onContextMenu);
    mainWindow.on('resize', delaySaveMainWindowPosition);
    mainWindow.on('move', delaySaveMainWindowPosition);
    mainWindow.on('close', updateMainWindowPositionIfPending);
    mainWindow.on('blur', mainWindowBlur);
    mainWindow.on('closed', () => {
        mainWindow = null;
        saveMainWindowPosition();
    });
    mainWindow.on('minimize', () => {
        emitBackboneEvent('launcher-minimize');
    });
    mainWindow.on('leave-full-screen', () => {
        emitBackboneEvent('leave-full-screen');
    });
    mainWindow.on('enter-full-screen', () => {
        emitBackboneEvent('enter-full-screen');
    });
    mainWindow.on('session-end', () => {
        emitBackboneEvent('os-lock');
    });
    restoreMainWindowPosition();
}

function restoreMainWindow() {
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.focus();
    setTimeout(destroyAppIcon, 0);
}

function closeMainWindow() {
    emitBackboneEvent('launcher-exit-request');
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
    mainWindowPosition.displayBounds = require('electron').screen.getDisplayMatching(bounds).bounds;
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
                    const displayBounds = require('electron').screen.getDisplayMatching(mainWindowPosition).bounds;
                    const db = mainWindowPosition.displayBounds;
                    if (displayBounds.x === db.x && displayBounds.y === db.y &&
                        displayBounds.width === db.width && displayBounds.height === db.height) {
                        mainWindow.setBounds(mainWindowPosition);
                    }
                }
                if (mainWindowPosition.maximized) { mainWindow.maximize(); }
                if (mainWindowPosition.fullScreen) { mainWindow.setFullScreen(true); }
            }
        }
    });
}

function mainWindowBlur() {
    emitBackboneEvent('main-window-blur');
}

function emitBackboneEvent(e, arg) {
    if (mainWindow && mainWindow.webContents) {
        arg = JSON.stringify(arg);
        mainWindow.webContents.executeJavaScript(`Backbone.trigger('${e}', ${arg}); void 0;`);
    }
}

function setMenu() {
    if (process.platform === 'darwin') {
        const name = require('electron').app.getName();
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
                    { accelerator: 'CmdOrCtrl+M', role: 'minimize' }
                ]
            }
        ];
        const menu = electron.Menu.buildFromTemplate(template);
        electron.Menu.setApplicationMenu(menu);
    }
}

function onContextMenu(e, props) {
    if (props.inputFieldType !== 'plainText' || !props.isEditable) {
        return;
    }
    const Menu = electron.Menu;
    const inputMenu = Menu.buildFromTemplate([
        {role: 'undo'},
        {role: 'redo'},
        {type: 'separator'},
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {type: 'separator'},
        {role: 'selectall'}
    ]);
    inputMenu.popup(mainWindow);
}

function notifyOpenFile() {
    if (ready && openFile && mainWindow) {
        openFile = openFile.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        mainWindow.webContents.executeJavaScript('if (window.launcherOpen) { window.launcherOpen("' + openFile + '"); } ' +
            ' else { window.launcherOpenedFile="' + openFile + '"; }');
        openFile = null;
    }
}

function setGlobalShortcuts() {
    const shortcutModifiers = process.platform === 'darwin' ? 'Ctrl+Alt+' : 'Shift+Alt+';
    const shortcuts = {
        C: 'copy-password',
        B: 'copy-user',
        U: 'copy-url',
        T: 'auto-type'
    };
    Object.keys(shortcuts).forEach(key => {
        const shortcut = shortcutModifiers + key;
        const eventName = shortcuts[key];
        try {
            electron.globalShortcut.register(shortcut, () => {
                emitBackboneEvent(eventName);
            });
        } catch (e) {}
    });
}

function subscribePowerEvents() {
    electron.powerMonitor.on('suspend', () => {
        emitBackboneEvent('power-monitor-suspend');
    });
    electron.powerMonitor.on('resume', () => {
        emitBackboneEvent('power-monitor-resume');
    });
    if (process.platform === 'darwin') {
        const id = electron.systemPreferences.subscribeNotification('com.apple.screenIsLocked', () => {
            emitBackboneEvent('os-lock');
        });
        systemNotificationIds.push(id);
    }
}

function setEnv() {
    if (process.platform === 'linux' && ['Pantheon', 'Unity:Unity7'].indexOf(process.env.XDG_CURRENT_DESKTOP) !== -1) {
        // https://github.com/electron/electron/issues/9046
        process.env.XDG_CURRENT_DESKTOP = 'Unity';
    }
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

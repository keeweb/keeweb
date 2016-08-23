'use strict';

var electron = require('electron'),
    app = electron.app,
    path = require('path'),
    fs = require('fs');

var mainWindow = null,
    appIcon = null,
    openFile = process.argv.filter(arg => /\.kdbx$/i.test(arg))[0],
    ready = false,
    restartPending = false,
    mainWindowPosition = {},
    updateMainWindowPositionTimeout = null,
    windowPositionFileName = path.join(app.getPath('userData'), 'window-position.json');

let htmlPath = process.argv.filter(arg => arg.startsWith('--htmlpath=')).map(arg => arg.replace('--htmlpath=', ''))[0];
if (!htmlPath) {
    htmlPath = 'file://' + path.join(__dirname, 'index.html');
}

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
        var userDataAppFile = path.join(app.getPath('userData'), 'app.js');
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
        setAppOptions();
        createMainWindow();
        setGlobalShortcuts();
        subscribePowerEvents();
    }
});
app.on('open-file', (e, path) => {
    e.preventDefault();
    openFile = path;
    notifyOpenFile();
});
app.on('activate', () => {
    if (process.platform === 'darwin') {
        if (!mainWindow) {
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
        var contextMenu = electron.Menu.buildFromTemplate([
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
    var shouldQuit = app.makeSingleInstance((/* commandLine, workingDirectory */) => {
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

function createMainWindow() {
    mainWindow = new electron.BrowserWindow({
        show: false,
        width: 1000, height: 700, minWidth: 700, minHeight: 400,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            backgroundThrottling: false
        }
    });
    setMenu();
    mainWindow.loadURL(htmlPath);
    mainWindow.webContents.on('dom-ready', () => {
        setTimeout(() => {
            mainWindow.show();
            ready = true;
            notifyOpenFile();
        }, 50);
    });
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
    restoreMainWindowPosition();
}

function restoreMainWindow() {
    destroyAppIcon();
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.focus();
}

function closeMainWindow() {
    destroyAppIcon();
    emitBackboneEvent('launcher-exit-request');
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
    var bounds = mainWindow.getBounds();
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
                    var displayBounds = require('electron').screen.getDisplayMatching(mainWindowPosition).bounds;
                    var db = mainWindowPosition.displayBounds;
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
    arg = JSON.stringify(arg);
    mainWindow.webContents.executeJavaScript(`Backbone.trigger('${e}', ${arg});`);
}

function setMenu() {
    if (process.platform === 'darwin') {
        var name = require('electron').app.getName();
        var template = [
            {
                label: name,
                submenu: [
                    { label: 'About ' + name, role: 'about' },
                    { type: 'separator' },
                    { label: 'Services', role: 'services', submenu: [] },
                    { type: 'separator' },
                    { label: 'Hide ' + name, accelerator: 'Command+H', role: 'hide' },
                    { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
                    { label: 'Show All', role: 'unhide' },
                    { type: 'separator' },
                    { label: 'Quit', accelerator: 'Command+Q', click: function() { app.quit(); } }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                    { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                    { type: 'separator' },
                    { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                    { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                    { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                    { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
                ]
            }
        ];
        var menu = electron.Menu.buildFromTemplate(template);
        electron.Menu.setApplicationMenu(menu);
    }
}

function notifyOpenFile() {
    if (ready && openFile && mainWindow) {
        openFile = openFile.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
        mainWindow.webContents.executeJavaScript('if (window.launcherOpen) { window.launcherOpen("' + openFile + '"); } ' +
            ' else { window.launcherOpenedFile="' + openFile + '"; }');
        openFile = null;
    }
}

function setGlobalShortcuts() {
    var shortcutModifiers = process.platform === 'darwin' ? 'Ctrl+Alt+' : 'Shift+Alt+';
    var shortcuts = {
        C: 'copy-password',
        B: 'copy-user',
        U: 'copy-url',
        T: 'auto-type'
    };
    Object.keys(shortcuts).forEach(key => {
        var shortcut = shortcutModifiers + key;
        var eventName = shortcuts[key];
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
}

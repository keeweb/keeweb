'use strict';

/* jshint node:true */
/* jshint browser:false */

var app = require('app'),
    path = require('path'),
    BrowserWindow = require('browser-window'),
    Menu = require('menu'),
    Tray = require('tray');

var mainWindow = null,
    appIcon = null,
    openFile = process.argv.filter(function(arg) { return /\.kdbx$/i.test(arg); })[0],
    ready = false,
    restartPending = false,
    htmlPath = path.join(__dirname, 'index.html');

process.argv.forEach(function(arg) {
    if (arg.lastIndexOf('--htmlpath=', 0) === 0) {
        htmlPath = path.resolve(arg.replace('--htmlpath=', ''), 'index.html');
    }
});

app.on('window-all-closed', function() {
    if (restartPending) {
        // unbind all handlers, load new app.js module and pass control to it
        app.removeAllListeners('window-all-closed');
        app.removeAllListeners('ready');
        app.removeAllListeners('open-file');
        app.removeAllListeners('activate');
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
app.on('ready', function() {
    createMainWindow();
});
app.on('open-file', function(e, path) {
    e.preventDefault();
    openFile = path;
    notifyOpenFile();
});
app.on('activate', function() {
    if (process.platform === 'darwin') {
        if (!mainWindow) {
            createMainWindow();
        }
    }
});
app.restartApp = function() {
    restartPending = true;
    mainWindow.close();
    setTimeout(function() { restartPending = false; }, 1000);
};
app.openWindow = function(opts) {
    return new BrowserWindow(opts);
};
app.minimizeApp = function() {
    if (process.platform === 'win32') {
        mainWindow.minimize();
        mainWindow.setSkipTaskbar(true);
        appIcon = new Tray(path.join(__dirname, 'icon.png'));
        appIcon.on('click', restoreMainWindow);
        var contextMenu = Menu.buildFromTemplate([
            { label: 'Open KeeWeb', click: restoreMainWindow },
            { label: 'Quit KeeWeb', click: closeMainWindow }
        ]);
        appIcon.setContextMenu(contextMenu);
        appIcon.setToolTip('KeeWeb');
    }
};
app.getMainWindow = function() {
    return mainWindow;
};

function createMainWindow() {
    mainWindow = new BrowserWindow({
        show: false,
        width: 1000, height: 700, 'min-width': 600, 'min-height': 300,
        icon: path.join(__dirname, 'icon.png')
    });
    setMenu();
    mainWindow.loadURL('file://' + htmlPath);
    mainWindow.webContents.on('dom-ready', function() {
        setTimeout(function() {
            mainWindow.show();
            ready = true;
            notifyOpenFile();
        }, 50);
    });
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
    mainWindow.on('minimize', function() {
        emitBackboneEvent('launcher-minimize');
    });
}

function restoreMainWindow() {
    appIcon.destroy();
    appIcon = null;
    mainWindow.restore();
    mainWindow.setSkipTaskbar(false);
}

function closeMainWindow() {
    appIcon.destroy();
    appIcon = null;
    emitBackboneEvent('launcher-exit-request');
}

function emitBackboneEvent(e) {
    mainWindow.webContents.executeJavaScript('Backbone.trigger("' + e + '");');
}

function setMenu() {
    if (process.platform === 'darwin') {
        var name = require('app').getName();
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
        var menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
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

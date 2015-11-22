'use strict';

/* jshint node:true */
/* jshint browser:false */

var app = require('app'),
    BrowserWindow = require('browser-window'),
    path = require('path'),
    Menu = require('menu'),
    Tray = require('tray');

var mainWindow = null,
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
    app.quit();
});
app.on('ready', function() {
    mainWindow = new BrowserWindow({
        show: false,
        width: 1000, height: 700, 'min-width': 600, 'min-height': 300,
        icon: path.join(__dirname, 'icon.png')
    });
    setMenu();
    mainWindow.loadUrl('file://' + htmlPath);
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
});
app.on('open-file', function(e, path) {
    e.preventDefault();
    openFile = path;
    notifyOpenFile();
});
app.on('quit', function() {
    if (restartPending) {
        require('child_process').exec(process.execPath);
    }
});
app.quitAndRestart = function() {
    restartPending = true;
    app.quit();
    setTimeout(function() { restartPending = false; }, 1000);
};
app.openWindow = function(opts) {
    return new BrowserWindow(opts);
};
app.minimizeApp = function() {
    if (process.platform === 'win32') {
        mainWindow.minimize();
        mainWindow.setSkipTaskbar(true);
        var appIcon = new Tray(path.join(__dirname, 'icon.png'));
        appIcon.on('clicked', function () {
            mainWindow.restore();
            mainWindow.setSkipTaskbar(false);
        });
        appIcon.setToolTip('KeeWeb');
    }
};

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

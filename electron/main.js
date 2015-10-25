'use strict';

/* jshint node:true */
/* jshint browser:false */

var app = require('app'),
    BrowserWindow = require('browser-window'),
    path = require('path'),
    fs = require('fs');

var mainWindow = null,
    openFile = process.argv.filter(function(arg) { return /\.kdbx$/i.test(arg); })[0],
    ready = false;

app.on('window-all-closed', function() { app.quit(); });
app.on('ready', function() {
    var htmlPath = path.join(app.getPath('userData'), 'index.html');

    mainWindow = new BrowserWindow({
        show: false,
        width: 1000, height: 700, 'min-width': 600, 'min-height': 300,
        icon: path.join(__dirname, 'icon.png')
    });
    mainWindow.setMenu(null);
    if (fs.existsSync(htmlPath)) {
        mainWindow.loadUrl('file://' + htmlPath);
    } else {
        mainWindow.loadUrl('https://antelle.github.io/keeweb/index.html');
    }
    mainWindow.webContents.on('dom-ready', function() {
        mainWindow.show();
        ready = true;
        notifyOpenFile();
    });
    mainWindow.on('closed', function() { mainWindow = null; });
});
app.on('open-file', function(e, path) {
    e.preventDefault();
    openFile = path;
    notifyOpenFile();
});

function notifyOpenFile() {
    if (ready && openFile && mainWindow) {
        openFile = openFile.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
        mainWindow.webContents.executeJavaScript('if (window.launcherOpen) { window.launcherOpen("' + openFile + '"); } ' +
            ' else { window.launcherOpenedFile="' + openFile + '"; }');
        openFile = null;
    }
}

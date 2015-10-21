'use strict';

var app = require('app'),
    BrowserWindow = require('browser-window'),
    path = require('path'),
    fs = require('fs');

var mainWindow = null;

app.on('window-all-closed', function() { app.quit(); });

app.on('ready', function() {
    var htmlPath = path.join(app.getPath('userData'), 'index.html');

    mainWindow = new BrowserWindow({
        width: 1000, height: 700, 'min-width': 600, 'min-height': 300,
        icon: path.join(__dirname, 'icon.png')
    });
    mainWindow.setMenu(null);
    if (fs.existsSync(htmlPath)) {
        mainWindow.loadUrl('file://' + htmlPath);
    } else {
        mainWindow.loadUrl('https://antelle.github.io/keeweb/index.html');
    }
    mainWindow.on('closed', function() { mainWindow = null; });
});

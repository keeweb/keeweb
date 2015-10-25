'use strict';

/* jshint node:true */
/* jshint browser:false */

var app = require('app'),
    BrowserWindow = require('browser-window'),
    path = require('path'),
    fs = require('fs');

var mainWindow = null,
    openFile = process.argv.filter(function(arg) { return /\.kdbx$/i.test(arg); })[0],
    ready = false,
    htmlPath = path.join(app.getPath('userData'), 'index.html');

htmlPath = path.join(__dirname, '../tmp/index.html');

app.on('window-all-closed', function() { app.quit(); });
app.on('ready', function() {
    mainWindow = new BrowserWindow({
        show: false,
        width: 1000, height: 700, 'min-width': 600, 'min-height': 300,
        icon: path.join(__dirname, 'icon.png')
    });
    mainWindow.setMenu(null);
    if (fs.existsSync(htmlPath)) {
        mainWindow.loadUrl('file://' + htmlPath);
    } else {
        downloadFile();
    }
    mainWindow.webContents.on('dom-ready', function() {
        setTimeout(function() {
            mainWindow.show();
            ready = true;
            notifyOpenFile();
        }, 50);
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

function downloadFile() {
    console.log('Downloading file...');
    mainWindow.loadUrl('file://' + path.join(__dirname, 'loading.html'));
    var fileData = [];
    require('https').get('https://antelle.github.io/keeweb/index.html', function(res) {
        res.on('data', function (chunk) {
            fileData.push(chunk);
        });
        res.on('end', function() {
            fileData = Buffer.concat(fileData);
            var fileDataStr = fileData.toString('utf8');
            if (/^\s*<![\s\S]*<\/html>\s*$/.test(fileDataStr) && fileData.byteLength > 100000) {
                fs.writeFileSync(htmlPath, fileData);
                if (mainWindow) {
                    mainWindow.loadUrl('file://' + htmlPath);
                }
            } else {
                showDownloadError('Invalid file downloaded');
            }
        });
    }).on('error', function(err) {
        showDownloadError(err);
    });
}

function showDownloadError(err) {
    console.error(err);
    if (mainWindow) {
        mainWindow.webContents.executeJavaScript('setTitle("Failed to download the app. Please restart me.<br/>' +
            'This app requires Internet connection to start for the first time.")');
    }
}

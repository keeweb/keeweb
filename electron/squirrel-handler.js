'use strict';

// Portions copyright (C) GitHub, Atom project, MIT license https://github.com/atom/atom/blob/master/LICENSE.md
// https://github.com/atom/atom/blob/master/src/browser/squirrel-update.coffee

/* jshint node:true */
/* jshint browser:false */

var app = require('app'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn;

var Reg = {
    FileKey: 'HKCU\\Software\\Classes\\kdbxfile.1',
    ExtensionKey: 'HKCU\\Software\\Classes\\.kdbx'
};

var regPath = process.env.SystemRoot ? path.join(process.env.SystemRoot, 'System32', 'reg.exe') : 'reg.exe',
    appFolder = path.resolve(process.execPath, '..'),
    rootAppFolder = path.resolve(appFolder, '..'),
    updateDotExe = path.join(rootAppFolder, 'Update.exe');

function handleSquirrelArg() {
    var squirrelCommand = process.argv[1];
    switch (squirrelCommand) {
        case '--squirrel-install':
            createShortcuts(function() {
                installContextMenu(function() { app.quit(); });
            });
            return true;
        case '--squirrel-updated':
            updateShortcuts(function() {
                installContextMenu(function() { app.quit(); });
            });
            return true;
        case '--squirrel-uninstall':
            removeShortcuts(function() {
                uninstallContextMenu(function() { app.quit(); });
            });
            return true;
        case '--squirrel-obsolete':
            app.quit();
            return true;
        default:
            return false;
    }
}

function createShortcuts(callback) {
    spawnUpdate(['--createShortcut', path.basename(process.execPath)], callback);
}

function updateShortcuts(callback) {
    var homeDirectory = fs.getHomeDirectory();
    if (homeDirectory) {
        var desktopShortcutPath = path.join(homeDirectory, 'Desktop', 'KeeWeb.lnk');
        fs.exists(desktopShortcutPath, function(exists) {
            createShortcuts(function() {
                if (exists) {
                    callback();
                } else {
                    fs.unlink(desktopShortcutPath, callback);
                }
            });
        });
    } else {
        createShortcuts(callback);
    }
}

function removeShortcuts(callback) {
    spawnUpdate(['--removeShortcut', path.basename(process.execPath)], callback);
}

function installContextMenu(callback) {
    var addToRegistry = function(args, callback) {
        args.unshift('add');
        args.push('/f');
        return spawnReg(args, callback);
    };
    addToRegistry([Reg.ExtensionKey, '/ve', '/d', 'kdbxfile.1'], function() {
        addToRegistry([Reg.FileKey, '/ve', '/d', 'Password Database'], function() {
            addToRegistry([Reg.FileKey + '\\DefaultIcon', '/ve', '/d', '"' + process.execPath + '",0'], function () {
                addToRegistry([Reg.FileKey + '\\shell\\open\\command', '/ve', '/d', '"' + process.execPath + '" "%1"'], callback);
            });
        });
    });
}

function uninstallContextMenu(callback) {
    var deleteFromRegistry = function(keyPath, callback) {
        return spawnReg(['delete', keyPath, '/f'], callback);
    };
    return deleteFromRegistry(Reg.FileKey, function() {
        return deleteFromRegistry(Reg.ExtensionKey, callback);
    });
}

function spawnUpdate(args, callback) {
    spawn(updateDotExe, args, { detached: true }).on('close', callback);
}

function spawnReg(args, callback) {
    spawn(regPath, args, { detached: true }).on('close', callback);
}

module.exports = handleSquirrelArg;

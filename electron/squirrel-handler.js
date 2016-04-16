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
    FileKey: 'HKCU\\Software\\Classes\\*\\shell\\KeeWeb',
    ApplicationsKey: 'HKCU\\Software\\Classes\\Applications\\keeweb.exe'
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
                app.quit(); // installContextMenu(app.quit);
            });
            return true;
        case '--squirrel-updated':
            updateShortcuts(function() {
                app.quit(); // installContextMenu(app.quit);
            });
            return true;
        case '--squirrel-uninstall':
            removeShortcuts(function() {
                app.quit(); // uninstallContextMenu(app.quit);
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
    var addToRegistry, installFileHandler, installMenu;
    addToRegistry = function(args, callback) {
        args.unshift('add');
        args.push('/f');
        return spawnReg(args, callback);
    };
    installFileHandler = function(callback) {
        var args;
        args = [Reg.ApplicationsKey + '\\shell\\open\\command', '/ve', '/d', '"' + process.execPath + '" "%1"'];
        return addToRegistry(args, callback);
    };
    installMenu = function(keyPath, arg, callback) {
        var args;
        args = [keyPath, '/ve', '/d', 'Open with KeeWeb'];
        return addToRegistry(args, function() {
            args = [keyPath, '/v', 'Icon', '/d', '"' + process.execPath + '"'];
            return addToRegistry(args, function() {
                args = [keyPath + '\\command', '/ve', '/d', '"' + process.execPath + '" "' + arg + '"'];
                return addToRegistry(args, callback);
            });
        });
    };
    return installMenu(Reg.FileKey, '%1', function() {
        return installFileHandler(callback);
    });
}

function uninstallContextMenu(callback) {
    var deleteFromRegistry = function(keyPath, callback) {
        return spawnReg(['delete', keyPath, '/f'], callback);
    };
    return deleteFromRegistry(Reg.FileKey, function() {
        return deleteFromRegistry(Reg.ApplicationsKey, callback);
    });
}

function spawnUpdate(args) {
    spawn(updateDotExe, args, { detached: true }).on('close', app.quit);
}

function spawnReg(args, callback) {
    return spawn(regPath, args, callback);
}

module.exports = handleSquirrelArg;

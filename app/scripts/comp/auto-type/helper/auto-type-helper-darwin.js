'use strict';

var Launcher = require('../../launcher');

var spawn = Launcher.req('child_process').spawn;

var ForeMostAppScript = 'tell application "System Events" to set frontApp to name of first process whose frontmost is true';
var ChromeScript = 'tell application "{}" to set appUrl to URL of active tab of front window\n' +
    'tell application "{}" to set appTitle to title of active tab of front window\n' +
    'return appUrl & "\n" & appTitle';
var SafariScript = 'tell application "{}" to set appUrl to URL of front document\n' +
    'tell application "{}" to set appTitle to name of front document\n' +
    'return appUrl & "\n" & appTitle';
var OtherAppsScript = 'tell application "System Events"\n' +
    '   tell process "{}"\n' +
    '       tell (1st window whose value of attribute "AXMain" is true)\n' +
    '           set windowTitle to value of attribute "AXTitle"\n' +
    '       end tell\n' +
    '   end tell\n' +
    'end tell';

var AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    AutoTypeHelper.exec(ForeMostAppScript, function(err, out) {
        if (err) { return callback(err); }
        var appName = out.trim();
        if (['Google Chrome', 'Chromium', 'Google Chrome Canary'].indexOf(appName) >= 0) {
            AutoTypeHelper.exec(ChromeScript.replace(/\{}/g, appName), function(err, out) {
                if (err) { return callback(err); }
                var parts = out.split('\n');
                return callback(null, parts[1].trim(), parts[0].trim());
            });
        } else if (['Safari', 'Webkit'].indexOf(appName) >= 0) {
            AutoTypeHelper.exec(SafariScript.replace(/\{}/g, appName), function(err, out) {
                if (err) { return callback(err); }
                var parts = out.split('\n');
                return callback(null, parts[1].trim(), parts[0].trim());
            });
        } else {
            AutoTypeHelper.exec(OtherAppsScript.replace(/\{}/g, appName), function(err, out) {
                if (err) { return callback(err); }
                return callback(null, out.trim());
            });
        }
    });
};

AutoTypeHelper.exec = function(script, callback) {
    var ps = spawn('osascript', ['-e', script]);
    var stderr = '';
    var stdout = '';
    ps.stdout.on('data', function(data) {
        stdout += data.toString();
    });
    ps.stderr.on('data', function(data) {
        stderr += data.toString();
    });
    ps.on('close', function(code) {
        if (code) {
            callback('Exit code ' + code + ': ' + stderr + (stdout ? '\nout: ' + stdout : ''));
        } else {
            callback(null, stdout);
        }
    });
};

module.exports = AutoTypeHelper;

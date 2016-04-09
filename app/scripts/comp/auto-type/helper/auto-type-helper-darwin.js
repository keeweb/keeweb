'use strict';

var Launcher = require('../../launcher');

var spawn = Launcher.req('child_process').spawn;

var AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    var script = 'global frontApp, frontAppName, windowTitle\n' +
        'set windowTitle to ""\n' +
        'tell application "System Events"\n'  +
        '    set frontApp to first application process whose frontmost is true\n' +
        '    set frontAppName to name of frontApp\n' +
        '    tell process frontAppName\n' +
        '        tell (1st window whose value of attribute "AXMain" is true)\n' +
        '            set windowTitle to value of attribute "AXTitle"\n' +
        '        end tell\n' +
        '    end tell\n' +
        'end tell\n' +
        'return windowTitle';

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
            callback(stdout);
        }
    });
};

module.exports = AutoTypeHelper;

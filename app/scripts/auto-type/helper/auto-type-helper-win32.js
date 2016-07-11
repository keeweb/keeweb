'use strict';

var Launcher = require('../../comp/launcher');

var AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    Launcher.spawn({
        cmd: AutoTypeHelper.getHelperPath(),
        args: ['--window-info'],
        complete: function(err, out) {
            if (err) { return callback(err); }
            var parts = out.split('\n');
            return callback(null, (parts[0] || '').trim(),
                parts[1] ? parts[1].trim() : undefined);
        }
    });
};

AutoTypeHelper.getHelperPath = function() {
    return Launcher.getAppPath('KeeWebHelper.exe');
};

module.exports = AutoTypeHelper;

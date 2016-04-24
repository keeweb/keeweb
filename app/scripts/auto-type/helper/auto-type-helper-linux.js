'use strict';

var Launcher = require('../../comp/launcher');

var AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    Launcher.spawn({
        cmd: 'xdotool',
        args: ['getactivewindow', 'getwindowname'],
        callback: function(err, res) {
            return callback(err, res ? res.trim() : undefined);
        }
    });
};

module.exports = AutoTypeHelper;

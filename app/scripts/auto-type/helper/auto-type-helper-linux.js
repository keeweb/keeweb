const Launcher = require('../../comp/launcher');

const AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    Launcher.spawn({
        cmd: 'xdotool',
        args: ['getactivewindow', 'getwindowname'],
        complete: function(err, res) {
            return callback(err, res ? res.trim() : undefined);
        }
    });
};

module.exports = AutoTypeHelper;

const Launcher = require('../../comp/launcher');

const AutoTypeHelper = function() {};

AutoTypeHelper.prototype.getActiveWindowInfo = function(callback) {
    Launcher.spawn({
        cmd: 'xdotool',
        args: ['getactivewindow', 'getwindowname', 'getactivewindow'],
        complete(err, out) {
            let windowInfo;
            if (out) {
                const [id, title] = out.trim().split('\n');
                windowInfo = {
                    id,
                    title
                };
            }
            return callback(err, windowInfo);
        }
    });
};

module.exports = AutoTypeHelper;

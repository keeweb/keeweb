const Launcher = require('../../comp/launcher');
const AutoTypeNativeHelper = require('./auto-type-native-helper');

const AutoTypeHelper = function() {
};

AutoTypeHelper.prototype.getActiveWindowTitle = function(callback) {
    Launcher.spawn({
        cmd: AutoTypeNativeHelper.getHelperPath(),
        args: ['--window-info'],
        complete: function(err, out) {
            if (err) { return callback(err); }
            const parts = out.split('\n');
            return callback(null, (parts[0] || '').trim(),
                parts[1] ? parts[1].trim() : undefined);
        }
    });
};

module.exports = AutoTypeHelper;

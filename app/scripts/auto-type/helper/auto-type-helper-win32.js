const Launcher = require('../../comp/launcher');
const AutoTypeNativeHelper = require('./auto-type-native-helper');

const AutoTypeHelper = function() {};

AutoTypeHelper.prototype.getActiveWindowInfo = function(callback) {
    Launcher.spawn({
        cmd: AutoTypeNativeHelper.getHelperPath(),
        args: ['--window-info'],
        complete(err, out) {
            if (err) {
                return callback(err);
            }
            const [id, title, url] = out.trim().split('\n');
            const windowInfo = {
                id,
                title,
                url
            };
            return callback(null, windowInfo);
        }
    });
};

module.exports = AutoTypeHelper;

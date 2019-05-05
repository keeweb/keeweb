import Launcher from '../../comp/launcher';
import AutoTypeNativeHelper from './auto-type-native-helper';

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

export default AutoTypeHelper;

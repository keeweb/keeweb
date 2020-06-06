import { AutoTypeNativeHelper } from 'auto-type/helper/auto-type-native-helper';
import { Launcher } from 'comp/launcher';

const AutoTypeHelper = function () {};

AutoTypeHelper.prototype.getActiveWindowInfo = function (callback) {
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

export { AutoTypeHelper };

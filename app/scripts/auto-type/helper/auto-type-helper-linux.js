import { Launcher } from 'comp/launcher';

const AutoTypeHelper = function () {};

AutoTypeHelper.prototype.getActiveWindowInfo = function (callback) {
    Launcher.spawn({
        cmd: 'xdotool',
        args: ['getactivewindow', 'getwindowname', 'getactivewindow'],
        complete(err, out) {
            let windowInfo;
            if (out) {
                const [title, id] = out.trim().split('\n');
                windowInfo = {
                    id,
                    title
                };
            }
            return callback(err, windowInfo);
        }
    });
};

export { AutoTypeHelper };

import { NativeModules } from 'comp/launcher/native-modules';

class AutoTypeHelper {
    getActiveWindowInfo(callback) {
        NativeModules.kbdGetActiveWindow({
            getWindowTitle: true,
            getBrowserUrl: true
        })
            .then((win) => {
                callback(undefined, win);
            })
            .catch((err) => callback(err));
    }
}

export { AutoTypeHelper };

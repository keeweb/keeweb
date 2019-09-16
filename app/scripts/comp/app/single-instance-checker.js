import { Events } from 'framework/events';
import { Launcher } from 'comp/launcher';

const LocalStorageKeyName = 'instanceCheck';
const LocalStorageResponseKeyName = 'instanceMaster';

const instanceKey = Date.now().toString();

const SingleInstanceChecker = {
    init() {
        if (Launcher) {
            return;
        }
        window.addEventListener('storage', SingleInstanceChecker.storageChanged);
        SingleInstanceChecker.setKey(LocalStorageKeyName, instanceKey);
    },

    storageChanged(e) {
        if (!e.newValue) {
            return;
        }
        if (e.key === LocalStorageKeyName && e.newValue !== instanceKey) {
            SingleInstanceChecker.setKey(
                LocalStorageResponseKeyName,
                instanceKey + Math.random().toString()
            );
        } else if (e.key === LocalStorageResponseKeyName && e.newValue.indexOf(instanceKey) < 0) {
            window.removeEventListener('storage', SingleInstanceChecker.storageChanged);
            Events.emit('second-instance');
        }
    },

    setKey(key, value) {
        try {
            localStorage.setItem(key, value);
            setTimeout(() => {
                localStorage.removeItem(key);
            }, 100);
        } catch (e) {}
    }
};

export { SingleInstanceChecker };

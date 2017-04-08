const Backbone = require('backbone');
const Launcher = require('./launcher');

const LocalStorageKeyName = 'instanceCheck';
const LocalStorageResponseKeyName = 'instanceMaster';

const instanceKey = Date.now().toString();

const SingleInstanceChecker = {
    init: function() {
        if (Launcher) {
            return;
        }
        window.addEventListener('storage', SingleInstanceChecker.storageChanged);
        SingleInstanceChecker.setKey(LocalStorageKeyName, instanceKey);
    },

    storageChanged: function(e) {
        if (!e.newValue) {
            return;
        }
        if (e.key === LocalStorageKeyName && e.newValue !== instanceKey) {
            SingleInstanceChecker.setKey(LocalStorageResponseKeyName, instanceKey + Math.random().toString());
        } else if (e.key === LocalStorageResponseKeyName && e.newValue.indexOf(instanceKey) < 0) {
            window.removeEventListener('storage', SingleInstanceChecker.storageChanged);
            Backbone.trigger('second-instance');
        }
    },

    setKey: function(key, value) {
        try {
            localStorage.setItem(key, value);
            setTimeout(() => { localStorage.removeItem(key); }, 100);
        } catch (e) {}
    }
};

module.exports = SingleInstanceChecker;

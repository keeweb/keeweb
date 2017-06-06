const Launcher = require('./launcher');
const StringUtil = require('../util/string-util');
const Logger = require('../util/logger');

const logger = new Logger('settings');

const SettingsStore = {
    fileName: function(key) {
        return `${key}.json`;
    },

    load: function(key) {
        return new Promise(resolve => {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                Launcher.fileExists(settingsFile, exists => {
                    if (exists) {
                        Launcher.readFile(settingsFile, 'utf8', data => {
                            return this.parseData(key, data, resolve);
                        });
                    } else {
                        resolve();
                    }
                });
            } else {
                const data = localStorage[StringUtil.camelCase(key)];
                return this.parseData(key, data, resolve);
            }
        });
    },

    parseData: function(key, data, resolve) {
        try {
            if (data) {
                return resolve(JSON.parse(data));
            } else {
                resolve();
            }
        } catch (e) {
            logger.error('Error loading ' + key, e);
            resolve();
        }
    },

    save: function(key, data) {
        return new Promise(resolve => {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                data = JSON.stringify(data);
                Launcher.writeFile(settingsFile, data, err => {
                    if (err) {
                        logger.error(`Error saving ${key}`, err);
                    }
                    resolve();
                });
            } else if (typeof localStorage !== 'undefined') {
                localStorage[StringUtil.camelCase(key)] = JSON.stringify(data);
                resolve();
            }
        });
    }
};

module.exports = SettingsStore;

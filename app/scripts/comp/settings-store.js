'use strict';

const Launcher = false; // require('./launcher');
const StringUtil = require('../util/string-util');
const Logger = require('../util/logger');

const logger = new Logger('settings');

const SettingsStore = {

    fileName: function(key) {
        return `${key}.json`;
    },

    load: function(key, callback, error) {
        try {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                Launcher.fileExists(settingsFile, exists => {
                    if (exists) {
                        Launcher.readFile(settingsFile, data => {
                            callback(JSON.parse(data));
                        }, error);
                    }
                });
            } else {
                const data = localStorage[StringUtil.camelCase(key)];
                callback(data ? JSON.parse(data) : undefined);
            }
        } catch (e) {
            logger.error(`Error loading ${key}`, e);
        }
    },

    save: function(key, data, callback, error) {
        try {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                Launcher.writeFile(settingsFile, JSON.stringify(data), callback, error);
            } else if (typeof localStorage !== 'undefined') {
                localStorage[StringUtil.camelCase(key)] = JSON.stringify(data);
            }
        } catch (e) {
            logger.error(`Error saving ${key}`, e);
        }
    }
};

module.exports = SettingsStore;

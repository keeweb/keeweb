'use strict';

const Launcher = require('./launcher');
const StringUtil = require('../util/string-util');
const Logger = require('../util/logger');

const logger = new Logger('settings');

const SettingsStore = {
    fileName: function(key) {
        return key + '.json';
    },

    load: function(key) {
        try {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                if (Launcher.fileExists(settingsFile)) {
                    return JSON.parse(Launcher.readFile(settingsFile, 'utf8'));
                }
            } else {
                const data = localStorage[StringUtil.camelCase(key)];
                return data ? JSON.parse(data) : undefined;
            }
        } catch (e) {
            logger.error('Error loading ' + key, e);
        }
        return null;
    },

    save: function(key, data) {
        try {
            if (Launcher) {
                Launcher.writeFile(Launcher.getUserDataPath(this.fileName(key)), JSON.stringify(data));
            } else if (typeof localStorage !== 'undefined') {
                localStorage[StringUtil.camelCase(key)] = JSON.stringify(data);
            }
        } catch (e) {
            logger.error('Error saving ' + key, e);
        }
    }
};

module.exports = SettingsStore;

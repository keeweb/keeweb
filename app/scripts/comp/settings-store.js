'use strict';

var Launcher = require('./launcher'),
    StringUtil = require('../util/string-util'),
    Logger = require('../util/logger');

var logger = new Logger('settings');

var SettingsStore = {
    fileName: function(key) {
        return key + '.json';
    },

    load: function(key) {
        try {
            if (Launcher) {
                var settingsFile = Launcher.getUserDataPath(this.fileName(key));
                if (Launcher.fileExists(settingsFile)) {
                    return JSON.parse(Launcher.readFile(settingsFile, 'utf8'));
                }
            } else {
                var data = localStorage[StringUtil.camelCase(key)];
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

'use strict';

const Launcher = require('./launcher');
const StringUtil = require('../util/string-util');
const Logger = require('../util/logger');

const logger = new Logger('settings');

const SettingsStore = {

    fileName: function(key) {
        return `${key}.json`;
    },

    load: function(key, callback) {
        try {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                Launcher.fileExists(settingsFile, exists => {
                    if (exists) {
                        Launcher.readFile(settingsFile, 'utf8', (data, err) => {
                            if (data) {
                                callback(JSON.parse(data));
                            } else {
                                logger.error(`Error loading ${key}`, err);
                                callback(undefined, err);
                            }
                        });
                    } else {
                        callback();
                    }
                });
            } else {
                const data = localStorage[StringUtil.camelCase(key)];
                callback(data ? JSON.parse(data) : undefined);
            }
        } catch (e) {
            logger.error(`Error loading ${key}`, e);
            callback(undefined, e);
        }
    },

    save: function(key, data, callback) {
        try {
            if (Launcher) {
                const settingsFile = Launcher.getUserDataPath(this.fileName(key));
                Launcher.writeFile(settingsFile, JSON.stringify(data), err => {
                    if (err) {
                        logger.error(`Error saving ${key}`, err);
                    }
                    callback && callback(err);
                });
            } else if (typeof localStorage !== 'undefined') {
                localStorage[StringUtil.camelCase(key)] = JSON.stringify(data);
                callback && callback();
            }
        } catch (e) {
            logger.error(`Error saving ${key}`, e);
            callback && callback(e);
        }
    }
};

module.exports = SettingsStore;

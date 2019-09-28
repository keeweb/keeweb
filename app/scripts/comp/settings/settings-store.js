import { Launcher } from 'comp/launcher';
import { StringFormat } from 'util/formatting/string-format';
import { Logger } from 'util/logger';

const logger = new Logger('settings');

const SettingsStore = {
    fileName(key) {
        return `${key}.json`;
    },

    load(key) {
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
                const data = localStorage[StringFormat.camelCase(key)];
                return this.parseData(key, data, resolve);
            }
        });
    },

    parseData(key, data, resolve) {
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

    save(key, data) {
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
                localStorage[StringFormat.camelCase(key)] = JSON.stringify(data);
                resolve();
            }
        });
    }
};

export { SettingsStore };

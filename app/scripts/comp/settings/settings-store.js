import { Launcher } from 'comp/launcher';
import { StringFormat } from 'util/formatting/string-format';
import { Logger } from 'util/logger';

const logger = new Logger('settings');

const SettingsStore = {
    load(key) {
        if (Launcher) {
            return Launcher.loadConfig(key)
                .then(JSON.parse)
                .catch(err => {
                    logger.error(`Error loading ${key}`, err);
                });
        }
        return new Promise(resolve => {
            const data = localStorage[StringFormat.camelCase(key)];
            return this.parseData(key, data, resolve);
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
            logger.error(`Error loading ${key}`, e);
            resolve();
        }
    },

    save(key, data) {
        if (Launcher) {
            return Launcher.saveConfig(key, JSON.stringify(data)).catch(err => {
                logger.error(`Error saving ${key}`, err);
            });
        }
        return Promise.resolve().then(() => {
            if (typeof localStorage !== 'undefined') {
                localStorage[StringFormat.camelCase(key)] = JSON.stringify(data);
            }
        });
    }
};

export { SettingsStore };

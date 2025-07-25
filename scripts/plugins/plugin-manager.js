import { Model } from 'framework/model';
import { RuntimeInfo } from 'const/runtime-info';
import { SettingsStore } from 'comp/settings/settings-store';
import { Plugin, PluginStatus } from 'plugins/plugin';
import { PluginCollection } from 'plugins/plugin-collection';
import { PluginGallery } from 'plugins/plugin-gallery';
import { SignatureVerifier } from 'util/data/signature-verifier';
import { Logger } from 'util/logger';
import { noop } from 'util/fn';

const logger = new Logger('plugin-mgr');

class PluginManager extends Model {
    static UpdateInterval = 1000 * 60 * 60 * 24 * 7;

    constructor() {
        super({
            plugins: new PluginCollection()
        });
    }

    init() {
        const ts = logger.ts();
        return SettingsStore.load('plugins').then((state) => {
            if (!state) {
                return;
            }
            this.set({
                autoUpdateAppVersion: state.autoUpdateAppVersion,
                autoUpdateDate: state.autoUpdateDate
            });
            if (!state || !state.plugins || !state.plugins.length) {
                return;
            }
            return PluginGallery.getCachedGallery().then((gallery) => {
                const promises = state.plugins.map((plugin) => this.loadPlugin(plugin, gallery));
                return Promise.all(promises).then((loadedPlugins) => {
                    this.plugins.push(...loadedPlugins.filter((plugin) => plugin));
                    logger.info(`Loaded ${this.plugins.length} plugins`, logger.ts(ts));
                });
            });
        });
    }

    install(url, expectedManifest, skipSignatureValidation) {
        this.emit('change');
        return Plugin.loadFromUrl(url, expectedManifest)
            .then((plugin) => {
                return this.uninstall(plugin.id).then(() => {
                    if (skipSignatureValidation) {
                        plugin.skipSignatureValidation = true;
                    }
                    return plugin.install(true, false).then(() => {
                        this.plugins.push(plugin);
                        this.emit('change');
                        this.saveState();
                    });
                });
            })
            .catch((e) => {
                this.emit('change');
                throw e;
            });
    }

    installIfNew(url, expectedManifest, skipSignatureValidation) {
        const plugin = this.plugins.find((p) => p.url === url);
        if (plugin && plugin.status !== 'invalid') {
            return Promise.resolve();
        }
        return this.install(url, expectedManifest, skipSignatureValidation);
    }

    uninstall(id) {
        const plugin = this.plugins.get(id);
        if (!plugin) {
            return Promise.resolve();
        }
        this.emit('change');
        return plugin.uninstall().then(() => {
            this.plugins.remove(id);
            this.emit('change');
            this.saveState();
        });
    }

    disable(id) {
        const plugin = this.plugins.get(id);
        if (!plugin || plugin.status !== PluginStatus.STATUS_ACTIVE) {
            return Promise.resolve();
        }
        this.emit('change');
        return plugin.disable().then(() => {
            this.emit('change');
            this.saveState();
        });
    }

    activate(id) {
        const plugin = this.plugins.get(id);
        if (!plugin || plugin.status === PluginStatus.STATUS_ACTIVE) {
            return Promise.resolve();
        }
        this.emit('change');
        return plugin.install(true, true).then(() => {
            this.emit('change');
            this.saveState();
        });
    }

    update(id) {
        const oldPlugin = this.plugins.get(id);
        const validStatuses = [
            PluginStatus.STATUS_ACTIVE,
            PluginStatus.STATUS_INACTIVE,
            PluginStatus.STATUS_NONE,
            PluginStatus.STATUS_ERROR,
            PluginStatus.STATUS_INVALID
        ];
        if (!oldPlugin || validStatuses.indexOf(oldPlugin.status) < 0) {
            return Promise.reject();
        }
        const url = oldPlugin.url;
        this.emit('change');
        return Plugin.loadFromUrl(url)
            .then((newPlugin) => {
                return oldPlugin
                    .update(newPlugin)
                    .then(() => {
                        this.emit('change');
                        this.saveState();
                    })
                    .catch((e) => {
                        this.emit('change');
                        throw e;
                    });
            })
            .catch((e) => {
                this.emit('change');
                throw e;
            });
    }

    setAutoUpdate(id, enabled) {
        const plugin = this.plugins.get(id);
        if (!plugin || plugin.autoUpdate === enabled) {
            return;
        }
        plugin.setAutoUpdate(enabled);
        this.emit('change');
        this.saveState();
    }

    runAutoUpdate() {
        const queue = this.plugins.filter((p) => p.autoUpdate).map((p) => p.id);
        if (!queue.length) {
            return Promise.resolve();
        }
        const anotherVersion = this.autoUpdateAppVersion !== RuntimeInfo.version;
        const wasLongAgo =
            !this.autoUpdateDate || Date.now() - this.autoUpdateDate > PluginManager.UpdateInterval;
        const autoUpdateRequired = anotherVersion || wasLongAgo;
        if (!autoUpdateRequired) {
            return;
        }
        logger.info('Auto-updating plugins', queue.join(', '));
        this.set({
            autoUpdateAppVersion: RuntimeInfo.version,
            autoUpdateDate: Date.now()
        });
        this.saveState();
        const updateNext = () => {
            const pluginId = queue.shift();
            if (pluginId) {
                return this.update(pluginId).catch(noop).then(updateNext);
            }
        };
        return updateNext();
    }

    loadPlugin(desc, gallery) {
        const plugin = new Plugin({
            manifest: desc.manifest,
            url: desc.url,
            autoUpdate: desc.autoUpdate
        });
        let enabled = desc.enabled;
        if (enabled) {
            const galleryPlugin = gallery
                ? gallery.plugins.find((pl) => pl.manifest.name === desc.manifest.name)
                : null;
            const expectedPublicKeys = galleryPlugin
                ? [galleryPlugin.manifest.publicKey]
                : SignatureVerifier.getPublicKeys();
            enabled = expectedPublicKeys.includes(desc.manifest.publicKey);
        }
        return plugin
            .install(enabled, true)
            .then(() => plugin)
            .catch(() => plugin);
    }

    saveState() {
        SettingsStore.save('plugins', {
            autoUpdateAppVersion: this.autoUpdateAppVersion,
            autoUpdateDate: this.autoUpdateDate,
            plugins: this.plugins.map((plugin) => ({
                manifest: plugin.manifest,
                url: plugin.url,
                enabled: plugin.status === 'active',
                autoUpdate: plugin.autoUpdate
            }))
        });
    }

    getStatus(id) {
        const plugin = this.plugins.get(id);
        return plugin ? plugin.status : '';
    }

    getPlugin(id) {
        return this.plugins.get(id);
    }
}

PluginManager.defineModelProperties({
    plugins: null,
    autoUpdateAppVersion: null,
    autoUpdateDate: null
});

const instance = new PluginManager();

export { instance as PluginManager };

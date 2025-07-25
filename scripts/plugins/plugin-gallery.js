import * as kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { SettingsStore } from 'comp/settings/settings-store';
import { Links } from 'const/links';
import { SignatureVerifier } from 'util/data/signature-verifier';
import { Logger } from 'util/logger';

const PluginGallery = {
    logger: new Logger('plugin-gallery'),

    gallery: null,
    loading: false,
    loadError: null,

    loadPlugins() {
        if (this.gallery) {
            return Promise.resolve(this.gallery);
        }
        this.loading = true;
        this.loadError = false;
        const ts = this.logger.ts();
        return new Promise((resolve) => {
            this.logger.debug('Loading plugins...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', Links.Plugins + '/plugins.json');
            xhr.responseType = 'json';
            xhr.send();
            xhr.addEventListener('load', () => {
                const data = xhr.response;
                resolve(data);
            });
            xhr.addEventListener('error', () => {
                this.logger.error('Network error loading plugins');
                resolve();
            });
        })
            .then((data) => {
                this.loading = false;
                if (!data) {
                    this.loadError = true;
                    Events.emit('plugin-gallery-load-complete');
                    return;
                }
                return this.verifySignature(data).then((gallery) => {
                    this.loadError = !gallery;
                    if (gallery) {
                        this.logger.debug(
                            `Loaded ${gallery.plugins.length} plugins`,
                            this.logger.ts(ts)
                        );
                        this.gallery = gallery;
                        this.saveGallery(gallery);
                    }
                    Events.emit('plugin-gallery-load-complete');
                    return gallery;
                });
            })
            .catch((e) => {
                this.loadError = true;
                this.logger.error('Error loading plugin gallery', e);
                Events.emit('plugin-gallery-load-complete');
            });
    },

    verifySignature(gallery) {
        const dataToVerify = JSON.stringify(gallery, null, 2).replace(gallery.signature, '');
        return SignatureVerifier.verify(
            kdbxweb.ByteUtils.stringToBytes(dataToVerify),
            gallery.signature
        )
            .then((isValid) => {
                if (isValid) {
                    return gallery;
                }
                this.logger.error('JSON signature invalid');
            })
            .catch((e) => {
                this.logger.error('Error verifying plugins signature', e);
            });
    },

    getCachedGallery() {
        const ts = this.logger.ts();
        return SettingsStore.load('plugin-gallery').then((data) => {
            if (data) {
                return this.verifySignature(data).then((gallery) => {
                    this.logger.debug(`Loaded cached plugin gallery`, this.logger.ts(ts));
                    return gallery;
                });
            }
        });
    },

    saveGallery(data) {
        SettingsStore.save('plugin-gallery', data);
    }
};

export { PluginGallery };

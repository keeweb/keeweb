const Backbone = require('backbone');
const kdbxweb = require('kdbxweb');
const Links = require('../const/links');
const SignatureVerifier = require('../util/signature-verifier');
const Logger = require('../util/logger');
const SettingsStore = require('../comp/settings-store');

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
        return new Promise(resolve => {
            this.logger.debug('Loading plugins...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', Links.Plugins + '/plugins.json?_=' + Date.now());
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
        }).then(data => {
            return this.verifySignature(data).then(gallery => {
                this.loading = false;
                this.loadError = !gallery;
                if (gallery) {
                    this.logger.debug(`Loaded ${gallery.plugins.length} plugins`, this.logger.ts(ts));
                    this.gallery = gallery;
                    this.saveGallery(gallery);
                }
                Backbone.trigger('plugin-gallery-load-complete');
                return gallery;
            });
        });
    },

    verifySignature(gallery) {
        const dataToVerify = JSON.stringify(gallery, null, 2).replace(gallery.signature, '');
        return SignatureVerifier.verify(
            kdbxweb.ByteUtils.stringToBytes(dataToVerify),
            gallery.signature
        ).then(isValid => {
            if (isValid) {
                return gallery;
            }
            this.logger.error('JSON signature invalid');
        }).catch(e => {
            this.logger.error('Error verifying plugins signature', e);
        });
    },

    getCachedGallery() {
        const ts = this.logger.ts();
        return SettingsStore.load('plugin-gallery').then(data => {
            if (data) {
                return this.verifySignature(data).then(gallery => {
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

module.exports = PluginGallery;

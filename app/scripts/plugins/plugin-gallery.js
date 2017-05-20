const Backbone = require('backbone');
const kdbxweb = require('kdbxweb');
const Links = require('../const/links');
const SignatureVerifier = require('../util/signature-verifier');
const Logger = require('../util/logger');

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
        return new Promise(resolve => {
            const ts = this.logger.ts();
            this.logger.debug('Loading plugins...');
            const xhr = new XMLHttpRequest();
            xhr.open('GET', Links.Plugins + '/plugins.json?_=' + Date.now());
            xhr.responseType = 'text';
            xhr.send();
            xhr.addEventListener('load', () => {
                const data = xhr.response;
                const gallery = JSON.parse(data);
                const dataToVerify = data.replace(gallery.signature, '');
                SignatureVerifier.verify(
                    kdbxweb.ByteUtils.stringToBytes(dataToVerify),
                    gallery.signature
                ).then(isValid => {
                    if (!isValid) {
                        this.logger.error('JSON signature invalid');
                        this.galleryLoadError = true;
                        resolve();
                        return;
                    }
                    this.logger.debug(`Loaded ${gallery.plugins.length} plugins`, this.logger.ts(ts));
                    resolve(gallery);
                }).catch(e => {
                    this.logger.error('Error verifying plugins signature', e);
                    resolve();
                });
            });
            xhr.addEventListener('error', () => {
                this.logger.error('Network error loading plugins');
                resolve();
            });
        }).then(gallery => {
            this.loading = false;
            this.loadError = !gallery;
            if (gallery) {
                this.gallery = gallery;
            }
            Backbone.trigger('plugin-gallery-load-complete');
            return gallery;
        });
    }
};

module.exports = PluginGallery;

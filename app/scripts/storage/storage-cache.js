import StorageBase from './storage-base';
import IoBrowserCache from './io-browser-cache';

const StorageCache = StorageBase.extend({
    name: 'cache',
    enabled: IoBrowserCache.enabled,
    system: true,

    io: null,

    init() {
        StorageBase.prototype.init.call(this);
        this.io = new IoBrowserCache({
            cacheName: 'FilesCache',
            logger: this.logger
        });
    },

    save(id, opts, data, callback) {
        this.io.save(id, data, callback);
    },

    load(id, opts, callback) {
        this.io.load(id, callback);
    },

    remove(id, opts, callback) {
        this.io.remove(id, callback);
    }
});

export default new StorageCache();

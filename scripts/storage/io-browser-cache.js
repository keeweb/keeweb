const idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

const IoBrowserCache = function (config) {
    this.db = null;
    this.cacheName = config.cacheName;
    this.logger = config.logger;
};

Object.assign(IoBrowserCache.prototype, {
    initDb(callback) {
        if (this.db) {
            return callback && callback();
        }
        try {
            const req = idb.open(this.cacheName);
            req.onerror = (e) => {
                this.logger.error('Error opening indexed db', e);
                if (callback) {
                    callback(e);
                }
            };
            req.onsuccess = (e) => {
                this.db = e.target.result;
                if (callback) {
                    callback();
                }
            };
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                db.createObjectStore('files');
            };
        } catch (e) {
            this.logger.error('Error opening indexed db', e);
            if (callback) {
                callback(e);
            }
        }
    },

    save(id, data, callback) {
        this.logger.debug('Save', id);
        this.initDb((err) => {
            if (err) {
                return callback && callback(err);
            }
            try {
                const ts = this.logger.ts();
                const req = this.db
                    .transaction(['files'], 'readwrite')
                    .objectStore('files')
                    .put(data, id);
                req.onsuccess = () => {
                    this.logger.debug('Saved', id, this.logger.ts(ts));
                    if (callback) {
                        callback();
                    }
                };
                req.onerror = () => {
                    this.logger.error('Error saving to cache', id, req.error);
                    if (callback) {
                        callback(req.error);
                    }
                };
            } catch (e) {
                this.logger.error('Error saving to cache', id, e);
                if (callback) {
                    callback(e);
                }
            }
        });
    },

    load(id, callback) {
        this.logger.debug('Load', id);
        this.initDb((err) => {
            if (err) {
                return callback && callback(err, null);
            }
            try {
                const ts = this.logger.ts();
                const req = this.db.transaction(['files'], 'readonly').objectStore('files').get(id);
                req.onsuccess = () => {
                    this.logger.debug('Loaded', id, this.logger.ts(ts));
                    if (callback) {
                        callback(null, req.result);
                    }
                };
                req.onerror = () => {
                    this.logger.error('Error loading from cache', id, req.error);
                    if (callback) {
                        callback(req.error);
                    }
                };
            } catch (e) {
                this.logger.error('Error loading from cache', id, e);
                if (callback) {
                    callback(e, null);
                }
            }
        });
    },

    remove(id, callback) {
        this.logger.debug('Remove', id);
        this.initDb((err) => {
            if (err) {
                return callback && callback(err);
            }
            try {
                const ts = this.logger.ts();
                const req = this.db
                    .transaction(['files'], 'readwrite')
                    .objectStore('files')
                    .delete(id);
                req.onsuccess = () => {
                    this.logger.debug('Removed', id, this.logger.ts(ts));
                    if (callback) {
                        callback();
                    }
                };
                req.onerror = () => {
                    this.logger.error('Error removing from cache', id, req.error);
                    if (callback) {
                        callback(req.error);
                    }
                };
            } catch (e) {
                this.logger.error('Error removing from cache', id, e);
                if (callback) {
                    callback(e);
                }
            }
        });
    }
});

export { IoBrowserCache };

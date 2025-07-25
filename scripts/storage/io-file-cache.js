import { Launcher } from 'comp/launcher';

const IoFileCache = function (config) {
    this.basePath = null;
    this.cacheName = config.cacheName;
    this.logger = config.logger;
};

Object.assign(IoFileCache.prototype, {
    initFs(callback) {
        if (this.basePath) {
            return callback();
        }
        const basePath = Launcher.getUserDataPath(this.cacheName);
        Launcher.mkdir(basePath, (err) => {
            if (err) {
                this.logger.error('Error creating plugin folder');
            } else {
                this.basePath = basePath;
            }
            callback(err);
        });
    },

    resolvePath(path) {
        return Launcher.joinPath(this.basePath, path);
    },

    save(id, data, callback) {
        this.initFs((err) => {
            if (err) {
                return callback && callback(err, null);
            }
            this.logger.debug('Save', id);
            const ts = this.logger.ts();
            const path = this.resolvePath(id);
            Launcher.writeFile(path, data, (err) => {
                if (err) {
                    this.logger.error('Error saving file', id, err);
                    if (callback) {
                        callback(err);
                    }
                } else {
                    this.logger.debug('Saved', id, this.logger.ts(ts));
                    if (callback) {
                        callback();
                    }
                }
            });
        });
    },

    load(id, callback) {
        this.initFs((err) => {
            if (err) {
                return callback && callback(err, null);
            }
            this.logger.debug('Load', id);
            const ts = this.logger.ts();
            const path = this.resolvePath(id);
            Launcher.readFile(path, undefined, (data, err) => {
                if (err) {
                    this.logger.error('Error loading file', id, err);
                    if (callback) {
                        callback(err);
                    }
                } else {
                    this.logger.debug('Loaded', id, this.logger.ts(ts));
                    if (callback) {
                        callback(null, data);
                    }
                }
            });
        });
    },

    remove(id, callback) {
        this.initFs((err) => {
            if (err) {
                return callback && callback(err, null);
            }
            this.logger.debug('Remove', id);
            const ts = this.logger.ts();
            const path = this.resolvePath(id);
            Launcher.deleteFile(path, (err) => {
                if (err) {
                    this.logger.error('Error removing file', id, err);
                    if (callback) {
                        callback(err);
                    }
                } else {
                    this.logger.debug('Removed', id, this.logger.ts(ts));
                    if (callback) {
                        callback();
                    }
                }
            });
        });
    }
});

export { IoFileCache };

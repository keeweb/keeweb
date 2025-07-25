import { Launcher } from 'comp/launcher';
import { StorageBase } from 'storage/storage-base';

class StorageFileCache extends StorageBase {
    name = 'cache';
    enabled = !!Launcher;
    system = true;

    path = null;

    getPath(id) {
        return Launcher.joinPath(this.path, id);
    }

    initFs(callback) {
        if (this.path) {
            return callback && callback();
        }

        const path = Launcher.getUserDataPath('OfflineFiles');

        const setPath = (err) => {
            this.path = err ? null : path;
            if (err) {
                this.logger.error('Error opening local offline storage', err);
            }
            return callback && callback(err);
        };

        Launcher.fileExists(path, (exists) => {
            if (exists) {
                setPath();
            } else {
                Launcher.mkdir(path, setPath);
            }
        });
    }

    save(id, opts, data, callback) {
        this.logger.debug('Save', id);
        this.initFs((err) => {
            if (err) {
                return callback && callback(err);
            }
            const ts = this.logger.ts();
            Launcher.writeFile(this.getPath(id), data, (err) => {
                if (err) {
                    this.logger.error('Error saving to cache', id, err);
                    return callback && callback(err);
                }
                this.logger.debug('Saved', id, this.logger.ts(ts));
                if (callback) {
                    callback();
                }
            });
        });
    }

    load(id, opts, callback) {
        this.logger.debug('Load', id);
        this.initFs((err) => {
            if (err) {
                return callback && callback(null, err);
            }

            const ts = this.logger.ts();

            Launcher.readFile(this.getPath(id), undefined, (data, err) => {
                if (err) {
                    this.logger.error('Error loading from cache', id, err);
                    return callback && callback(err, null);
                }
                this.logger.debug('Loaded', id, this.logger.ts(ts));
                return callback && callback(null, data.buffer);
            });
        });
    }

    remove(id, opts, callback) {
        this.logger.debug('Remove', id);
        this.initFs((err) => {
            if (err) {
                return callback && callback(err);
            }

            const ts = this.logger.ts();
            const path = this.getPath(id);

            Launcher.fileExists(path, (exists) => {
                if (exists) {
                    Launcher.deleteFile(path, (err) => {
                        if (err) {
                            this.logger.error('Error removing from cache', id, err);
                        } else {
                            this.logger.debug('Removed', id, this.logger.ts(ts));
                        }
                        return callback && callback(err);
                    });
                } else if (callback) {
                    callback();
                }
            });
        });
    }
}

export { StorageFileCache };

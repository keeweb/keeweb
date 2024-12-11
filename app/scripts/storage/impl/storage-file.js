import { Launcher } from 'comp/launcher';
import { StorageBase } from 'storage/storage-base';

const fileWatchers = {};

class StorageFile extends StorageBase {
    name = 'file';
    icon = 'hard-drive';
    enabled = !!Launcher;
    system = true;
    backup = true;

    load(path, opts, callback) {
        this.logger.debug('Load', path);
        const ts = this.logger.ts();

        const onError = (e) => {
            this.logger.error('Error reading local file', path, e);
            if (callback) {
                callback(e, null);
            }
        };

        Launcher.readFile(path, undefined, (data, err) => {
            if (err) {
                return onError(err);
            }
            Launcher.statFile(path, (stat, err) => {
                if (err) {
                    return onError(err);
                }
                const rev = stat.mtime.getTime().toString();
                this.logger.debug('Loaded', path, rev, this.logger.ts(ts));
                if (callback) {
                    callback(null, data.buffer, { rev });
                }
            });
        });
    }

    stat(path, opts, callback) {
        this.logger.debug('Stat', path);
        const ts = this.logger.ts();

        Launcher.statFile(path, (stat, err) => {
            if (err) {
                this.logger.error('Error stat local file', path, err);
                if (err.code === 'ENOENT') {
                    err.notFound = true;
                }
                return callback && callback(err, null);
            }
            this.logger.debug('Stat done', path, this.logger.ts(ts));
            if (callback) {
                const fileRev = stat.mtime.getTime().toString();
                callback(null, { rev: fileRev });
            }
        });
    }

    save(path, opts, data, callback, rev) {
        this.logger.debug('Save', path, rev);
        const ts = this.logger.ts();

        const onError = (e) => {
            if (Object.prototype.hasOwnProperty.call(e, 'code') && e.code === 'EISDIR') {
                e.isDir = true;
            }
            this.logger.error('Error writing local file', path, e);
            if (callback) {
                callback(e);
            }
        };

        const write = () => {
            Launcher.writeFile(path, data, (err) => {
                if (err) {
                    return onError(err);
                }
                Launcher.statFile(path, (stat, err) => {
                    if (err) {
                        return onError(err);
                    }
                    const newRev = stat.mtime.getTime().toString();
                    this.logger.debug('Saved', path, this.logger.ts(ts));
                    if (callback) {
                        callback(undefined, { rev: newRev });
                    }
                });
            });
        };

        if (rev) {
            Launcher.statFile(path, (stat, err) => {
                if (err) {
                    return write();
                }
                const fileRev = stat.mtime.getTime().toString();
                if (fileRev !== rev) {
                    this.logger.debug('Save mtime differs', rev, fileRev);
                    return callback && callback({ revConflict: true }, { rev: fileRev });
                }
                write();
            });
        } else {
            write();
        }
    }

    mkdir(path, callback) {
        this.logger.debug('Make dir', path);
        const ts = this.logger.ts();

        Launcher.mkdir(path, (err) => {
            if (err) {
                this.logger.error('Error making local dir', path, err);
                if (callback) {
                    callback('Error making local dir');
                }
            } else {
                this.logger.debug('Made dir', path, this.logger.ts(ts));
                if (callback) {
                    callback();
                }
            }
        });
    }

    watch(path, callback) {
        const names = Launcher.parsePath(path);
        if (!fileWatchers[names.dir] && !names.dir.startsWith('\\')) {
            this.logger.debug('Watch dir', names.dir);
            let fsWatcher;
            try {
                fsWatcher = Launcher.createFsWatcher(names.dir);
            } catch (e) {
                this.logger.warn('Error watching dir', e);
            }
            if (fsWatcher) {
                fsWatcher.on('change', this.fsWatcherChange.bind(this, names.dir));
                fileWatchers[names.dir] = {
                    fsWatcher,
                    callbacks: []
                };
            }
        }

        const fsWatcher = fileWatchers[names.dir];
        if (fsWatcher) {
            fsWatcher.callbacks.push({
                file: names.file,
                callback
            });
        }
    }

    unwatch(path) {
        const names = Launcher.parsePath(path);
        const watcher = fileWatchers[names.dir];
        if (watcher) {
            const ix = watcher.callbacks.findIndex((cb) => cb.file === names.file);
            if (ix >= 0) {
                watcher.callbacks.splice(ix, 1);
            }
            if (!watcher.callbacks.length) {
                this.logger.debug('Stop watch dir', names.dir);
                watcher.fsWatcher.close();
                delete fileWatchers[names.dir];
            }
        }
    }

    fsWatcherChange(dirname, evt, fileName) {
        const watcher = fileWatchers[dirname];
        if (watcher) {
            watcher.callbacks.forEach((cb) => {
                if (cb.file === fileName && typeof cb.callback === 'function') {
                    this.logger.debug('File changed', dirname, evt, fileName);
                    cb.callback();
                }
            });
        }
    }
}

export { StorageFile };

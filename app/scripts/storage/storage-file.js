'use strict';

const StorageBase = require('./storage-base');
const Launcher = require('../comp/launcher');

const fileWatchers = {};

const StorageFile = StorageBase.extend({
    name: 'file',
    icon: 'hdd-o',
    enabled: !!Launcher,
    system: true,
    backup: true,

    load: function(path, opts, callback) {
        this.logger.debug('Load', path);
        const ts = this.logger.ts();
        try {
            const data = Launcher.readFile(path);
            const rev = Launcher.statFile(path).mtime.getTime().toString();
            this.logger.debug('Loaded', path, rev, this.logger.ts(ts));
            if (callback) { callback(null, data.buffer, { rev: rev }); }
        } catch (e) {
            this.logger.error('Error reading local file', path, e);
            if (callback) { callback(e, null); }
        }
    },

    stat: function(path, opts, callback) {
        this.logger.debug('Stat', path);
        const ts = this.logger.ts();
        try {
            const stat = Launcher.statFile(path);
            this.logger.debug('Stat done', path, this.logger.ts(ts));
            if (callback) { callback(null, { rev: stat.mtime.getTime().toString() }); }
        } catch (e) {
            this.logger.error('Error stat local file', path, e);
            if (e.code === 'ENOENT') {
                e.notFound = true;
            }
            if (callback) { callback(e, null); }
        }
    },

    save: function(path, opts, data, callback, rev) {
        this.logger.debug('Save', path, rev);
        const ts = this.logger.ts();
        try {
            if (rev) {
                try {
                    const stat = Launcher.statFile(path);
                    const fileRev = stat.mtime.getTime().toString();
                    if (fileRev !== rev) {
                        this.logger.debug('Save mtime differs', rev, fileRev);
                        if (callback) { callback({ revConflict: true }, { rev: fileRev }); }
                        return;
                    }
                } catch (e) {
                    // file doesn't exist or we cannot stat it: don't care and overwrite
                }
            }
            Launcher.writeFile(path, data);
            const newRev = Launcher.statFile(path).mtime.getTime().toString();
            this.logger.debug('Saved', path, this.logger.ts(ts));
            if (callback) { callback(undefined, { rev: newRev }); }
        } catch (e) {
            this.logger.error('Error writing local file', path, e);
            if (callback) { callback(e); }
        }
    },

    mkdir: function(path, callback) {
        this.logger.debug('Make dir', path);
        const ts = this.logger.ts();
        try {
            Launcher.mkdir(path);
            this.logger.debug('Made dir', path, this.logger.ts(ts));
            if (callback) { callback(); }
        } catch (e) {
            this.logger.error('Error making local dir', path, e);
            if (callback) { callback(e); }
        }
    },

    watch: function(path, callback) {
        const names = Launcher.parsePath(path);
        if (!fileWatchers[names.dir]) {
            this.logger.debug('Watch dir', names.dir);
            const fsWatcher = Launcher.createFsWatcher(names.dir);
            fsWatcher.on('change', this.fsWatcherChange.bind(this, names.dir));
            fileWatchers[names.dir] = { fsWatcher: fsWatcher, callbacks: [] };
        }
        fileWatchers[names.dir].callbacks.push({ file: names.file, callback: callback });
    },

    unwatch: function(path) {
        const names = Launcher.parsePath(path);
        const watcher = fileWatchers[names.dir];
        if (watcher) {
            const ix = watcher.callbacks.findIndex(cb => cb.file === names.file);
            if (ix >= 0) {
                watcher.callbacks.splice(ix, 1);
            }
            if (!watcher.callbacks.length) {
                this.logger.debug('Stop watch dir', names.dir);
                watcher.fsWatcher.close();
                delete fileWatchers[names.dir];
            }
        }
    },

    fsWatcherChange: function(dirname, evt, fileName) {
        const watcher = fileWatchers[dirname];
        if (watcher) {
            watcher.callbacks.forEach(cb => {
                if (cb.file === fileName && typeof cb.callback === 'function') {
                    this.logger.debug('File changed', dirname, evt, fileName);
                    cb.callback();
                }
            });
        }
    }
});

module.exports = new StorageFile();

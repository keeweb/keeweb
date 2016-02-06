'use strict';

var Launcher = require('../comp/launcher'),
    Logger = require('../util/logger');

var logger = new Logger('storage-file');

var fileWatchers = {};

var StorageFile = {
    name: 'file',
    enabled: !!Launcher,

    load: function(path, callback) {
        logger.debug('Load', path);
        var ts = logger.ts();
        try {
            var data = Launcher.readFile(path);
            var rev = Launcher.statFile(path).mtime.getTime().toString();
            logger.debug('Loaded', path, rev, logger.ts(ts));
            if (callback) { callback(null, data.buffer, { rev: rev }); }
        } catch (e) {
            logger.error('Error reading local file', path, e);
            if (callback) { callback(e, null); }
        }
    },

    stat: function(path, callback) {
        logger.debug('Stat', path);
        var ts = logger.ts();
        try {
            var stat = Launcher.statFile(path);
            logger.debug('Stat done', path, logger.ts(ts));
            if (callback) { callback(null, { rev: stat.mtime.getTime().toString() }); }
        } catch (e) {
            logger.error('Error stat local file', path, e);
            if (e.code === 'ENOENT') {
                e.notFound = true;
            }
            if (callback) { callback(e, null); }
        }
    },

    save: function(path, data, callback, rev) {
        logger.debug('Save', path, rev);
        var ts = logger.ts();
        try {
            if (rev) {
                try {
                    var stat = Launcher.statFile(path);
                    var fileRev = stat.mtime.getTime().toString();
                    if (fileRev !== rev) {
                        logger.debug('Save mtime differs', rev, fileRev);
                        if (callback) { callback({ revConflict: true }, { rev: fileRev }); }
                        return;
                    }
                } catch (e) {
                    // file doesn't exist or we cannot stat it: don't care and overwrite
                }
            }
            Launcher.writeFile(path, data);
            var newRev = Launcher.statFile(path).mtime.getTime().toString();
            logger.debug('Saved', path, logger.ts(ts));
            if (callback) { callback(undefined, { rev: newRev }); }
        } catch (e) {
            logger.error('Error writing local file', path, e);
            if (callback) { callback(e); }
        }
    },

    watch: function(path, callback) {
        var names = Launcher.parsePath(path);
        if (!fileWatchers[names.dir]) {
            logger.debug('Watch dir', names.dir);
            var fsWatcher = Launcher.createFsWatcher(names.dir);
            fsWatcher.on('change', this.fsWatcherChange.bind(this, names.dir));
            fileWatchers[names.dir] = { fsWatcher: fsWatcher, callbacks: [] };
        }
        fileWatchers[names.dir].callbacks.push({ file: names.file, callback: callback });
    },

    unwatch: function(path) {
        var names = Launcher.parsePath(path);
        var watcher = fileWatchers[names.dir];
        if (watcher) {
            var ix = watcher.callbacks.findIndex(function(cb) { return cb.file === names.file; });
            if (ix >= 0) {
                watcher.callbacks.splice(ix, 1);
            }
            if (!watcher.callbacks.length) {
                logger.debug('Stop watch dir', names.dir);
                watcher.fsWatcher.close();
                delete fileWatchers[names.dir];
            }
        }
    },

    fsWatcherChange: function(dirname, evt, fileName) {
        var watcher = fileWatchers[dirname];
        if (watcher) {
            watcher.callbacks.forEach(function(cb) {
                if (cb.file === fileName && typeof cb.callback === 'function') {
                    logger.debug('File changed', dirname, evt, fileName);
                    cb.callback();
                }
            });
        }
    }
};

module.exports = StorageFile;

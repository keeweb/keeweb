'use strict';

var Backbone = require('backbone'),
    AppSettingsModel = require('./app-settings-model'),
    MenuModel = require('./menu/menu-model'),
    EntryModel = require('./entry-model'),
    GroupModel = require('./group-model'),
    FileCollection = require('../collections/file-collection'),
    EntryCollection = require('../collections/entry-collection'),
    FileInfoCollection = require('../collections/file-info-collection'),
    FileModel = require('./file-model'),
    FileInfoModel = require('./file-info-model'),
    Storage = require('../storage'),
    Timeouts = require('../const/timeouts'),
    IdGenerator = require('../util/id-generator'),
    Logger = require('../util/logger'),
    FeatureDetector = require('../util/feature-detector'),
    Format = require('../util/format'),
    UrlUtil = require('../util/url-util'),
    AutoType = require('../auto-type');

require('../mixins/protected-value-ex');

var AppModel = Backbone.Model.extend({
    defaults: {},

    initialize: function() {
        this.tags = [];
        this.files = new FileCollection();
        this.fileInfos = FileInfoCollection.load();
        this.menu = new MenuModel();
        this.filter = {};
        this.sort = 'title';
        this.settings = AppSettingsModel.instance;
        this.activeEntryId = null;
        this.isBeta = FeatureDetector.isBeta;

        this.listenTo(Backbone, 'refresh', this.refresh);
        this.listenTo(Backbone, 'set-filter', this.setFilter);
        this.listenTo(Backbone, 'add-filter', this.addFilter);
        this.listenTo(Backbone, 'set-sort', this.setSort);
        this.listenTo(Backbone, 'empty-trash', this.emptyTrash);
        this.listenTo(Backbone, 'select-entry', this.selectEntry);

        this.appLogger = new Logger('app');

        AutoType.init(this);
    },

    loadConfig: function(configLocation, callback) {
        this.appLogger.debug('Loading config from', configLocation);
        var ts = this.appLogger.ts();
        var xhr = new XMLHttpRequest();
        xhr.open('GET', configLocation);
        xhr.responseType = 'json';
        xhr.send();
        xhr.addEventListener('load', () => {
            if (!xhr.response) {
                this.appLogger.error('Error loading app config', xhr.statusText);
                return callback(true);
            }
            if (!xhr.response.settings) {
                this.appLogger.error('Invalid app config, no settings section', xhr.response);
                return callback(true);
            }
            this.appLogger.info('Loaded app config from', configLocation, this.appLogger.ts(ts));
            this.applyUserConfig(xhr.response);
            callback();
        });
        xhr.addEventListener('error', () => {
            this.appLogger.error('Error loading app config', xhr.statusText, xhr.status);
            callback(true);
        });
    },

    applyUserConfig(config) {
        this.settings.set(config.settings);
        if (config.files) {
            config.files
                .filter(file => file && file.storage && file.name && file.path &&
                    !this.fileInfos.getMatch(file.storage, file.name, file.path))
                .map(file => new FileInfoModel({
                    id: IdGenerator.uuid(),
                    name: file.name,
                    storage: file.storage,
                    path: file.path,
                    opts: file.options
                }))
                .reverse()
                .forEach(fi => this.fileInfos.unshift(fi));
        }
    },

    addFile: function(file) {
        if (this.files.get(file.id)) {
            return false;
        }
        this.files.add(file);
        file.get('groups').forEach(function (group) {
            this.menu.groupsSection.addItem(group);
        }, this);
        this._addTags(file);
        this._tagsChanged();
        this.menu.filesSection.addItem({
            icon: 'lock',
            title: file.get('name'),
            page: 'file',
            file: file
        });
        this.refresh();
        this.listenTo(file, 'reload', this.reloadFile);
        return true;
    },

    reloadFile: function(file) {
        this.menu.groupsSection.replaceByFile(file, file.get('groups').first());
        this.updateTags();
    },

    _addTags: function(file) {
        var tagsHash = {};
        this.tags.forEach(tag => {
            tagsHash[tag.toLowerCase()] = true;
        });
        file.forEachEntry({}, entry => {
            _.forEach(entry.tags, tag => {
                if (!tagsHash[tag.toLowerCase()]) {
                    tagsHash[tag.toLowerCase()] = true;
                    this.tags.push(tag);
                }
            });
        });
        this.tags.sort();
    },

    _tagsChanged: function() {
        if (this.tags.length) {
            this.menu.tagsSection.set('scrollable', true);
            this.menu.tagsSection.setItems(this.tags.map(tag => {
                return {title: tag, icon: 'tag', filterKey: 'tag', filterValue: tag, editable: true};
            }));
        } else {
            this.menu.tagsSection.set('scrollable', false);
            this.menu.tagsSection.removeAllItems();
        }
    },

    updateTags: function() {
        var oldTags = this.tags.slice();
        this.tags.splice(0, this.tags.length);
        this.files.forEach(function(file) {
            this._addTags(file);
        }, this);
        if (!_.isEqual(oldTags, this.tags)) {
            this._tagsChanged();
        }
    },

    renameTag: function(from, to) {
        this.files.forEach(file => file.renameTag(from, to));
        this.updateTags();
    },

    closeAllFiles: function() {
        this.files.each(file => {
            file.close();
            this.fileClosed(file);
        });
        this.files.reset();
        this.menu.groupsSection.removeAllItems();
        this.menu.tagsSection.set('scrollable', false);
        this.menu.tagsSection.removeAllItems();
        this.menu.filesSection.removeAllItems();
        this.tags.splice(0, this.tags.length);
        this.filter = {};
        this.menu.select({ item: this.menu.allItemsItem });
    },

    closeFile: function(file) {
        file.close();
        this.fileClosed(file);
        this.files.remove(file);
        this.updateTags();
        this.menu.groupsSection.removeByFile(file);
        this.menu.filesSection.removeByFile(file);
        this.menu.select({ item: this.menu.allItemsSection.get('items').first() });
    },

    emptyTrash: function() {
        this.files.forEach(file => file.emptyTrash());
        this.refresh();
    },

    setFilter: function(filter) {
        this.filter = filter;
        this.filter.subGroups = this.settings.get('expandGroups');
        var entries = this.getEntries();
        if (!this.activeEntryId || !entries.get(this.activeEntryId)) {
            var firstEntry = entries.first();
            this.activeEntryId = firstEntry ? firstEntry.id : null;
        }
        Backbone.trigger('filter', { filter: this.filter, sort: this.sort, entries: entries });
        Backbone.trigger('entry-selected', entries.get(this.activeEntryId));
    },

    refresh: function() {
        this.setFilter(this.filter);
    },

    selectEntry: function(entry) {
        this.activeEntryId = entry.id;
        this.refresh();
    },

    addFilter: function(filter) {
        this.setFilter(_.extend(this.filter, filter));
    },

    setSort: function(sort) {
        this.sort = sort;
        this.setFilter(this.filter);
    },

    getEntries: function() {
        let entries = this.getEntriesByFilter(this.filter);
        entries.sortEntries(this.sort);
        if (this.filter.trash) {
            this.addTrashGroups(entries);
        }
        return entries;
    },

    getEntriesByFilter: function(filter) {
        filter = this.prepareFilter(filter);
        var entries = new EntryCollection();
        this.files.forEach(file => {
            file.forEachEntry(filter, entry => entries.push(entry));
        });
        return entries;
    },

    addTrashGroups: function(collection) {
        this.files.forEach(file => {
            var trashGroup = file.getTrashGroup();
            if (trashGroup) {
                trashGroup.getOwnSubGroups().forEach(group => {
                    collection.unshift(GroupModel.fromGroup(group, file, trashGroup));
                });
            }
        });
    },

    prepareFilter: function(filter) {
        filter = _.clone(filter);
        if (filter.text) {
            filter.textLower = filter.text.toLowerCase();
        }
        if (filter.tag) {
            filter.tagLower = filter.tag.toLowerCase();
        }
        return filter;
    },

    getFirstSelectedGroup: function() {
        var selGroupId = this.filter.group;
        var file, group;
        if (selGroupId) {
            this.files.forEach(f => {
                group = f.getGroup(selGroupId);
                if (group) {
                    file = f;
                    return false;
                }
            });
        }
        if (!group) {
            file = this.files.first();
            group = file.get('groups').first();
        }
        return { group: group, file: file };
    },

    completeUserNames: function(part) {
        var userNames = {};
        this.files.forEach(file => {
            file.forEachEntry({ text: part, textLower: part.toLowerCase(), advanced: { user: true } }, entry => {
                var userName = entry.user;
                if (userName) {
                    userNames[userName] = (userNames[userName] || 0) + 1;
                }
            });
        });
        var matches = _.pairs(userNames);
        matches.sort((x, y) => y[1] - x[1]);
        var maxResults = 5;
        if (matches.length > maxResults) {
            matches.length = maxResults;
        }
        return matches.map(m => m[0]);
    },

    createNewEntry: function() {
        var sel = this.getFirstSelectedGroup();
        return EntryModel.newEntry(sel.group, sel.file);
    },

    createNewGroup: function() {
        var sel = this.getFirstSelectedGroup();
        return GroupModel.newGroup(sel.group, sel.file);
    },

    createDemoFile: function() {
        if (!this.files.getByName('Demo')) {
            var demoFile = new FileModel({ id: IdGenerator.uuid() });
            demoFile.openDemo(() => {
                this.addFile(demoFile);
            });
            return true;
        } else {
            return false;
        }
    },

    createNewFile: function() {
        var name;
        for (var i = 0; ; i++) {
            name = 'New' + (i || '');
            if (!this.files.getByName(name) && !this.fileInfos.getByName(name)) {
                break;
            }
        }
        var newFile = new FileModel({ id: IdGenerator.uuid() });
        newFile.create(name);
        this.addFile(newFile);
    },

    openFile: function(params, callback) {
        var logger = new Logger('open', params.name);
        logger.info('File open request');
        var that = this;
        var fileInfo = params.id ? this.fileInfos.get(params.id) : this.fileInfos.getMatch(params.storage, params.name, params.path);
        if (!params.opts && fileInfo && fileInfo.get('opts')) {
            params.opts = fileInfo.get('opts');
        }
        if (fileInfo && fileInfo.get('modified')) {
            logger.info('Open file from cache because it is modified');
            this.openFileFromCache(params, (err, file) => {
                if (!err && file) {
                    logger.info('Sync just opened modified file');
                    _.defer(that.syncFile.bind(that, file));
                }
                callback(err);
            }, fileInfo);
        } else if (params.fileData) {
            logger.info('Open file from supplied content');
            var needSaveToCache = params.storage !== 'file';
            this.openFileWithData(params, callback, fileInfo, params.fileData, needSaveToCache);
        } else if (!params.storage) {
            logger.info('Open file from cache as main storage');
            this.openFileFromCache(params, callback, fileInfo);
        } else if (fileInfo && fileInfo.openDate && fileInfo.get('rev') === params.rev && fileInfo.get('storage') !== 'file') {
            logger.info('Open file from cache because it is latest');
            this.openFileFromCache(params, callback, fileInfo);
        } else if (!fileInfo || !fileInfo.openDate || params.storage === 'file') {
            logger.info('Open file from storage', params.storage);
            var storage = Storage[params.storage];
            var storageLoad = function() {
                logger.info('Load from storage');
                storage.load(params.path, params.opts, (err, data, stat) => {
                    if (err) {
                        if (fileInfo && fileInfo.openDate) {
                            logger.info('Open file from cache because of storage load error', err);
                            that.openFileFromCache(params, callback, fileInfo);
                        } else {
                            logger.info('Storage load error', err);
                            callback(err);
                        }
                    } else {
                        logger.info('Open file from content loaded from storage');
                        params.fileData = data;
                        params.rev = stat && stat.rev || null;
                        var needSaveToCache = storage.name !== 'file';
                        that.openFileWithData(params, callback, fileInfo, data, needSaveToCache);
                    }
                });
            };
            var cacheRev = fileInfo && fileInfo.get('rev') || null;
            if (cacheRev && storage.stat) {
                logger.info('Stat file');
                storage.stat(params.path, params.opts, (err, stat) => {
                    if (fileInfo && storage.name !== 'file' && (err || stat && stat.rev === cacheRev)) {
                        logger.info('Open file from cache because ' + (err ? 'stat error' : 'it is latest'), err);
                        that.openFileFromCache(params, callback, fileInfo);
                    } else if (stat) {
                        logger.info('Open file from storage (' + stat.rev + ', local ' + cacheRev + ')');
                        storageLoad();
                    } else {
                        logger.info('Stat error', err);
                        callback(err);
                    }
                });
            } else {
                storageLoad();
            }
        } else {
            logger.info('Open file from cache, will sync after load', params.storage);
            this.openFileFromCache(params, (err, file) => {
                if (!err && file) {
                    logger.info('Sync just opened file');
                    _.defer(that.syncFile.bind(that, file));
                }
                callback(err);
            }, fileInfo);
        }
    },

    openFileFromCache: function(params, callback, fileInfo) {
        Storage.cache.load(fileInfo.id, null, (err, data) => {
            new Logger('open', params.name).info('Loaded file from cache', err);
            if (err) {
                callback(err);
            } else {
                this.openFileWithData(params, callback, fileInfo, data);
            }
        });
    },

    openFileWithData: function(params, callback, fileInfo, data, updateCacheOnSuccess) {
        var logger = new Logger('open', params.name);
        if (!params.keyFileData && fileInfo && fileInfo.get('keyFileName') && this.settings.get('rememberKeyFiles')) {
            params.keyFileName = fileInfo.get('keyFileName');
            params.keyFileData = FileModel.createKeyFileWithHash(fileInfo.get('keyFileHash'));
        }
        var file = new FileModel({
            id: fileInfo ? fileInfo.id : IdGenerator.uuid(),
            name: params.name,
            storage: params.storage,
            path: params.path,
            keyFileName: params.keyFileName,
            backup: fileInfo && fileInfo.get('backup') || null
        });
        file.open(params.password, data, params.keyFileData, err => {
            if (err) {
                return callback(err);
            }
            if (this.files.get(file.id)) {
                return callback('Duplicate file id');
            }
            if (fileInfo && fileInfo.get('modified')) {
                if (fileInfo.get('editState')) {
                    logger.info('Loaded local edit state');
                    file.setLocalEditState(fileInfo.get('editState'));
                }
                logger.info('Mark file as modified');
                file.set('modified', true);
            }
            if (fileInfo) {
                file.set('syncDate', fileInfo.get('syncDate'));
            }
            if (updateCacheOnSuccess) {
                logger.info('Save loaded file to cache');
                Storage.cache.save(file.id, null, params.fileData);
            }
            var rev = params.rev || fileInfo && fileInfo.get('rev');
            this.setFileOpts(file, params.opts);
            this.addToLastOpenFiles(file, rev);
            this.addFile(file);
            callback(null, file);
            this.fileOpened(file, data);
        });
    },

    importFileWithXml: function(params, callback) {
        var logger = new Logger('import', params.name);
        logger.info('File import request with supplied xml');
        var file = new FileModel({
            id: IdGenerator.uuid(),
            name: params.name,
            storage: params.storage,
            path: params.path
        });
        file.importWithXml(params.fileXml, err => {
            logger.info('Import xml complete ' + (err ? 'with error' : ''), err);
            if (err) {
                return callback(err);
            }
            this.addFile(file);
            this.fileOpened(file);
        });
    },

    addToLastOpenFiles: function(file, rev) {
        this.appLogger.debug('Add last open file', file.id, file.get('name'), file.get('storage'), file.get('path'), rev);
        var dt = new Date();
        var fileInfo = new FileInfoModel({
            id: file.id,
            name: file.get('name'),
            storage: file.get('storage'),
            path: file.get('path'),
            opts: this.getStoreOpts(file),
            modified: file.get('modified'),
            editState: file.getLocalEditState(),
            rev: rev,
            syncDate: file.get('syncDate') || dt,
            openDate: dt,
            backup: file.get('backup')
        });
        if (this.settings.get('rememberKeyFiles')) {
            fileInfo.set({
                keyFileName: file.get('keyFileName') || null,
                keyFileHash: file.getKeyFileHash()
            });
        }
        this.fileInfos.remove(file.id);
        this.fileInfos.unshift(fileInfo);
        this.fileInfos.save();
    },

    getStoreOpts: function(file) {
        var opts = file.get('opts'), storage = file.get('storage');
        if (Storage[storage] && Storage[storage].fileOptsToStoreOpts && opts) {
            return Storage[storage].fileOptsToStoreOpts(opts, file);
        }
        return null;
    },

    setFileOpts: function(file, opts) {
        var storage = file.get('storage');
        if (Storage[storage] && Storage[storage].storeOptsToFileOpts && opts) {
            file.set('opts', Storage[storage].storeOptsToFileOpts(opts, file));
        }
    },

    fileOpened: function(file, data) {
        if (file.get('storage') === 'file') {
            Storage.file.watch(file.get('path'), _.debounce(() => {
                this.syncFile(file);
            }, Timeouts.FileChangeSync));
        }
        if (file.isKeyChangePending(true)) {
            Backbone.trigger('key-change-pending', { file: file });
        }
        let backup = file.get('backup');
        if (data && backup && backup.enabled && backup.pending) {
            this.scheduleBackupFile(file, data);
        }
    },

    fileClosed: function(file) {
        if (file.get('storage') === 'file') {
            Storage.file.unwatch(file.get('path'));
        }
    },

    removeFileInfo: function(id) {
        Storage.cache.remove(id);
        this.fileInfos.remove(id);
        this.fileInfos.save();
    },

    getFileInfo: function(file) {
        return this.fileInfos.get(file.id) ||
            this.fileInfos.getMatch(file.get('storage'), file.get('name'), file.get('path'));
    },

    syncFile: function(file, options, callback) {
        var that = this;
        if (file.get('demo')) {
            return callback && callback();
        }
        if (file.get('syncing')) {
            return callback && callback('Sync in progress');
        }
        if (!options) {
            options = {};
        }
        var logger = new Logger('sync', file.get('name'));
        var storage = options.storage || file.get('storage');
        var path = options.path || file.get('path');
        var opts = options.opts || file.get('opts');
        if (storage && Storage[storage].getPathForName && (!path || storage !== file.get('storage'))) {
            path = Storage[storage].getPathForName(file.get('name'));
        }
        logger.info('Sync started', storage, path, options);
        var fileInfo = this.getFileInfo(file);
        if (!fileInfo) {
            logger.info('Create new file info');
            var dt = new Date();
            fileInfo = new FileInfoModel({
                id: IdGenerator.uuid(),
                name: file.get('name'),
                storage: file.get('storage'),
                path: file.get('path'),
                opts: this.getStoreOpts(file),
                modified: file.get('modified'),
                editState: null,
                rev: null,
                syncDate: dt,
                openDate: dt,
                backup: file.get('backup')
            });
        }
        file.setSyncProgress();
        var complete = function(err, savedToCache) {
            if (!err) { savedToCache = true; }
            logger.info('Sync finished', err || 'no error');
            file.setSyncComplete(path, storage, err ? err.toString() : null, savedToCache);
            fileInfo.set({
                name: file.get('name'),
                storage: storage,
                path: path,
                opts: that.getStoreOpts(file),
                modified: file.get('modified'),
                editState: file.getLocalEditState(),
                syncDate: file.get('syncDate')
            });
            if (that.settings.get('rememberKeyFiles')) {
                fileInfo.set({
                    keyFileName: file.get('keyFileName') || null,
                    keyFileHash: file.getKeyFileHash()
                });
            }
            if (!that.fileInfos.get(fileInfo.id)) {
                that.fileInfos.unshift(fileInfo);
            }
            that.fileInfos.save();
            if (callback) { callback(err); }
        };
        if (!storage) {
            if (!file.get('modified') && fileInfo.id === file.id) {
                logger.info('Local, not modified');
                return complete();
            }
            logger.info('Local, save to cache');
            file.getData((data, err) => {
                if (err) { return complete(err); }
                Storage.cache.save(fileInfo.id, null, data, (err) => {
                    logger.info('Saved to cache', err || 'no error');
                    complete(err);
                    if (!err) {
                        this.scheduleBackupFile(file, data);
                    }
                });
            });
        } else {
            var maxLoadLoops = 3, loadLoops = 0;
            var loadFromStorageAndMerge = function() {
                if (++loadLoops === maxLoadLoops) {
                    return complete('Too many load attempts');
                }
                logger.info('Load from storage, attempt ' + loadLoops);
                Storage[storage].load(path, opts, (err, data, stat) => {
                    logger.info('Load from storage', stat, err || 'no error');
                    if (err) { return complete(err); }
                    file.mergeOrUpdate(data, options.remoteKey, (err) => {
                        logger.info('Merge complete', err || 'no error');
                        that.refresh();
                        if (err) {
                            if (err.code === 'InvalidKey') {
                                logger.info('Remote key changed, request to enter new key');
                                Backbone.trigger('remote-key-changed', { file: file });
                            }
                            return complete(err);
                        }
                        if (stat && stat.rev) {
                            logger.info('Update rev in file info');
                            fileInfo.set('rev', stat.rev);
                        }
                        file.set('syncDate', new Date());
                        if (file.get('modified')) {
                            logger.info('Updated sync date, saving modified file');
                            saveToCacheAndStorage();
                        } else if (file.get('dirty')) {
                            logger.info('Saving not modified dirty file to cache');
                            Storage.cache.save(fileInfo.id, null, data, (err) => {
                                if (err) { return complete(err); }
                                file.set('dirty', false);
                                logger.info('Complete, remove dirty flag');
                                complete();
                            });
                        } else {
                            logger.info('Complete, no changes');
                            complete();
                        }
                    });
                });
            };
            var saveToCacheAndStorage = function() {
                logger.info('Getting file data for saving');
                file.getData((data, err) => {
                    if (err) { return complete(err); }
                    if (storage === 'file') {
                        logger.info('Saving to file storage');
                        saveToStorage(data);
                    } else if (!file.get('dirty')) {
                        logger.info('Saving to storage, skip cache because not dirty');
                        saveToStorage(data);
                    } else {
                        logger.info('Saving to cache');
                        Storage.cache.save(fileInfo.id, null, data, (err) => {
                            if (err) { return complete(err); }
                            file.set('dirty', false);
                            logger.info('Saved to cache, saving to storage');
                            saveToStorage(data);
                        });
                    }
                });
            };
            var saveToStorage = function(data) {
                logger.info('Save data to storage');
                Storage[storage].save(path, opts, data, (err, stat) => {
                    if (err && err.revConflict) {
                        logger.info('Save rev conflict, reloading from storage');
                        loadFromStorageAndMerge();
                    } else if (err) {
                        logger.info('Error saving data to storage');
                        complete(err);
                    } else {
                        if (stat && stat.rev) {
                            logger.info('Update rev in file info');
                            fileInfo.set('rev', stat.rev);
                        }
                        if (stat && stat.path) {
                            logger.info('Update path in file info', stat.path);
                            file.set('path', stat.path);
                            fileInfo.set('path', stat.path);
                            path = stat.path;
                        }
                        file.set('syncDate', new Date());
                        logger.info('Save to storage complete, update sync date');
                        this.scheduleBackupFile(file, data);
                        complete();
                    }
                }, fileInfo.get('rev'));
            };
            logger.info('Stat file');
            Storage[storage].stat(path, opts, (err, stat) => {
                if (err) {
                    if (err.notFound) {
                        logger.info('File does not exist in storage, creating');
                        saveToCacheAndStorage();
                    } else if (file.get('dirty')) {
                        logger.info('Stat error, dirty, save to cache', err || 'no error');
                        file.getData((data) => {
                            if (data) {
                                Storage.cache.save(fileInfo.id, null, data, (e) => {
                                    if (!e) {
                                        file.set('dirty', false);
                                    }
                                    logger.info('Saved to cache, exit with error', err || 'no error');
                                    complete(err);
                                });
                            }
                        });
                    } else {
                        logger.info('Stat error, not dirty', err || 'no error');
                        complete(err);
                    }
                } else if (stat.rev === fileInfo.get('rev')) {
                    if (file.get('modified')) {
                        logger.info('Stat found same version, modified, saving');
                        saveToCacheAndStorage();
                    } else {
                        logger.info('Stat found same version, not modified');
                        complete();
                    }
                } else {
                    logger.info('Found new version, loading from storage');
                    loadFromStorageAndMerge();
                }
            });
        }
    },

    clearStoredKeyFiles: function() {
        this.fileInfos.each(fileInfo => {
            fileInfo.set({
                keyFileName: null,
                keyFileHash: null
            });
        });
        this.fileInfos.save();
    },

    setFileBackup: function(fileId, backup) {
        let fileInfo = this.fileInfos.get(fileId);
        if (fileInfo) {
            fileInfo.set('backup', backup);
        }
        this.fileInfos.save();
    },

    backupFile: function(file, data, callback) {
        let opts = file.get('opts');
        let backup = file.get('backup');
        let logger = new Logger('backup', file.get('name'));
        if (!backup || !backup.storage || !backup.path) {
            return callback('Invalid backup settings');
        }
        let path = backup.path.replace('{date}', Format.dtStrFs(new Date()));
        logger.info('Backup file to', backup.storage, path);
        let saveToFolder = () => {
            if (Storage[backup.storage].getPathForName) {
                path = Storage[backup.storage].getPathForName(path);
            }
            Storage[backup.storage].save(path, opts, data, (err) => {
                if (err) {
                    logger.error('Backup error', err);
                } else {
                    logger.info('Backup complete');
                    backup = file.get('backup');
                    backup.lastTime = Date.now();
                    delete backup.pending;
                    file.set('backup', backup);
                    this.setFileBackup(file.id, backup);
                }
                callback(err);
            });
        };
        let folderPath = UrlUtil.fileToDir(path);
        if (Storage[backup.storage].getPathForName) {
            folderPath = Storage[backup.storage].getPathForName(folderPath).replace('.kdbx', '');
        }
        Storage[backup.storage].stat(folderPath, opts, (err) => {
            if (err) {
                if (err.notFound) {
                    logger.info('Backup folder does not exist');
                    if (!Storage[backup.storage].mkdir) {
                        return callback('Mkdir not supported by ' + backup.storage);
                    }
                    Storage[backup.storage].mkdir(folderPath, (err) => {
                        if (err) {
                            logger.error('Error creating backup folder', err);
                            callback('Error creating backup folder');
                        } else {
                            logger.info('Backup folder created');
                            saveToFolder();
                        }
                    });
                } else {
                    logger.error('Stat folder error', err);
                    callback('Cannot stat backup folder');
                }
            } else {
                logger.info('Backup folder exists, saving');
                saveToFolder();
            }
        });
    },

    scheduleBackupFile: function(file, data) {
        let backup = file.get('backup');
        if (!backup || !backup.enabled) {
            return;
        }
        let logger = new Logger('backup', file.get('name'));
        let needBackup = false;
        if (!backup.lastTime) {
            needBackup = true;
            logger.debug('No last backup time, backup now');
        } else {
            let dt = new Date(backup.lastTime);
            switch (backup.schedule) {
                case '0':
                    break;
                case '1d':
                    dt.setDate(dt.getDate() + 1);
                    break;
                case '1w':
                    dt.setDate(dt.getDate() + 7);
                    break;
                case '1m':
                    dt.setMonth(dt.getMonth() + 1);
                    break;
                default:
                    return;
            }
            if (dt.getTime() <= Date.now()) {
                needBackup = true;
            }
            logger.debug('Last backup time: ' + new Date(backup.lastTime) +
                ', schedule: ' + backup.schedule +
                ', next time: ' + dt +
                ', ' + (needBackup ? 'backup now' : 'skip backup'));
        }
        if (!backup.pending) {
            backup.pending = true;
            this.setFileBackup(file.id, backup);
        }
        if (needBackup) {
            this.backupFile(file, data, _.noop);
        }
    }
});

module.exports = AppModel;

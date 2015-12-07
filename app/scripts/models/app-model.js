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
    IdGenerator = require('../util/id-generator');

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

        this.listenTo(Backbone, 'refresh', this.refresh);
        this.listenTo(Backbone, 'set-filter', this.setFilter);
        this.listenTo(Backbone, 'add-filter', this.addFilter);
        this.listenTo(Backbone, 'set-sort', this.setSort);
        this.listenTo(Backbone, 'close-file', this.closeFile);
        this.listenTo(Backbone, 'empty-trash', this.emptyTrash);
    },

    addFile: function(file) {
        if (this.files.getById(file.id)) {
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
        this.menu.groupsSection.removeByFile(file, true);
        file.get('groups').forEach(function (group) {
            this.menu.groupsSection.addItem(group);
        }, this);
        this.updateTags();
    },

    _addTags: function(file) {
        var tagsHash = {};
        this.tags.forEach(function(tag) {
            tagsHash[tag.toLowerCase()] = true;
        });
        var that = this;
        file.forEachEntry({}, function(entry) {
            _.forEach(entry.tags, function(tag) {
                if (!tagsHash[tag.toLowerCase()]) {
                    tagsHash[tag.toLowerCase()] = true;
                    that.tags.push(tag);
                }
            });
        });
        this.tags.sort();
    },

    _tagsChanged: function() {
        if (this.tags.length) {
            this.menu.tagsSection.set('scrollable', true);
            this.menu.tagsSection.setItems(this.tags.map(function (tag) {
                return {title: tag, icon: 'tag', filterKey: 'tag', filterValue: tag};
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

    closeAllFiles: function() {
        this.files.each(function(file) { file.close(); });
        this.files.reset();
        this.menu.groupsSection.removeAllItems();
        this.menu.tagsSection.set('scrollable', false);
        this.menu.tagsSection.removeAllItems();
        this.menu.filesSection.removeAllItems();
        this.tags.splice(0, this.tags.length);
        this.setFilter({});
    },

    closeFile: function(file) {
        this.files.remove(file);
        this._tagsChanged();
        this.menu.groupsSection.removeByFile(file);
        this.menu.filesSection.removeByFile(file);
        this.refresh();
    },

    emptyTrash: function() {
        this.files.forEach(function(file) {
            file.emptyTrash();
        }, this);
        this.refresh();
    },

    setFilter: function(filter) {
        this.filter = filter;
        this.filter.subGroups = this.settings.get('expandGroups');
        var entries = this.getEntries();
        Backbone.trigger('filter', { filter: this.filter, sort: this.sort, entries: entries });
        Backbone.trigger('select-entry', entries.length ? entries.first() : null);
    },

    refresh: function() {
        this.setFilter(this.filter);
    },

    addFilter: function(filter) {
        this.setFilter(_.extend(this.filter, filter));
    },

    setSort: function(sort) {
        this.sort = sort;
        this.setFilter(this.filter);
    },

    getEntries: function() {
        var entries = new EntryCollection();
        var filter = this.prepareFilter();
        this.files.forEach(function(file) {
            file.forEachEntry(filter, function(entry) {
                entries.push(entry);
            });
        });
        entries.sortEntries(this.sort);
        if (this.filter.trash) {
            this.addTrashGroups(entries);
        }
        if (entries.length) {
            entries.setActive(entries.first());
        }
        return entries;
    },

    addTrashGroups: function(collection) {
        this.files.forEach(function(file) {
            var trashGroup = file.getTrashGroup();
            if (trashGroup) {
                trashGroup.getOwnSubGroups().forEach(function(group) {
                    collection.unshift(GroupModel.fromGroup(group, file, trashGroup));
                });
            }
        });
    },

    prepareFilter: function() {
        var filter = _.clone(this.filter);
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
            this.files.forEach(function(f) {
                group = f.getGroup(selGroupId);
                if (group) {
                    file = f;
                    return false;
                }
            }, this);
        }
        if (!group) {
            file = this.files.first();
            group = file.get('groups').first();
        }
        return { group: group, file: file };
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
        var that = this;
        if (!this.files.getByName('Demo')) {
            var demoFile = new FileModel();
            demoFile.openDemo(function() {
                that.addFile(demoFile);
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
            if (!this.files.getByName(name)) {
                break;
            }
        }
        var newFile = new FileModel();
        newFile.create(name);
        this.addFile(newFile);
    },

    openFile: function(params, callback) {
        var that = this;
        var fileInfo = params.id ? this.fileInfos.get(params.id) : this.fileInfos.getMatch(params.storage, params.name, params.path);
        if (fileInfo && fileInfo.get('availOffline') && fileInfo.get('modified')) {
            // modified offline, cannot overwrite: load from cache
            this.openFileFromCache(params, callback, fileInfo);
        } else if (params.fileData) {
            // has user content: load it
            this.openFileWithData(params, callback, fileInfo, params.fileData, true);
        } else if (fileInfo && fileInfo.get('availOffline') && fileInfo.get('rev') === params.rev) {
            // already latest in cache: use it
            this.openFileFromCache(params, callback, fileInfo);
        } else {
            // try to load from storage and update cache
            Storage[params.storage].load(params.path, function(err, data, rev) {
                if (err) {
                    // failed to load from storage: fallback to cache if we can
                    if (fileInfo && fileInfo.get('availOffline')) {
                        that.openFileFromCache(params, callback, fileInfo);
                    } else {
                        callback(err);
                    }
                } else {
                    params.fileData = data;
                    params.rev = rev;
                    that.openFileWithData(params, callback, fileInfo, data, true);
                }
            });
        }
    },

    openFileFromCache: function(params, callback, fileInfo) {
        var that = this;
        Storage.cache.load(fileInfo.id, function(err, data) {
            if (err) {
                callback(err);
            } else {
                that.openFileWithData(params, callback, fileInfo, data);
            }
        });
    },

    openFileWithData: function(params, callback, fileInfo, data, updateCacheOnSuccess) {
        var file = new FileModel({
            name: params.name,
            availOffline: params.availOffline,
            storage: params.storage,
            path: params.path,
            keyFileName: params.keyFileName
        });
        var that = this;
        file.open(params.password, data, params.keyFileData, function(err) {
            if (err) {
                return callback(err);
            }
            if (that.files.get(file.id)) {
                return callback('Duplicate file id');
            }
            var cacheId = fileInfo && fileInfo.id || IdGenerator.uuid();
            if (params.availOffline && updateCacheOnSuccess) {
                Storage.cache.save(cacheId, params.fileData, function(err) {
                    if (err) {
                        file.set('availOffline', false);
                        if (!params.storage) { return; }
                    }
                    that.addToLastOpenFiles(file, cacheId, params.rev);
                });
            }
            if (!params.availOffline && fileInfo && !fileInfo.get('modified')) {
                that.removeFileInfo(fileInfo.id);
            }
            if (params.storage === 'file') {
                that.addToLastOpenFiles(file, cacheId, params.rev);
            }
            that.addFile(file);
        });
    },

    addToLastOpenFiles: function(file, id, rev) {
        var dt = new Date();
        var fileInfo = new FileInfoModel({
            id: id,
            name: file.get('name'),
            storage: file.get('storage'),
            path: file.get('path'),
            availOffline: file.get('availOffline'),
            modified: file.get('modified'),
            editState: null,
            rev: rev,
            pullDate: dt,
            openDate: dt
        });
        this.fileInfos.remove(id);
        this.fileInfos.unshift(fileInfo);
        this.fileInfos.save();
    },

    removeFileInfo: function(id) {
        Storage.cache.remove(id);
        this.fileInfos.remove(id);
        this.fileInfos.save();
    }
});

module.exports = AppModel;

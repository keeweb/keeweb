import { Events } from 'framework/events';
import { Storage } from 'storage';
import { SearchResultCollection } from 'collections/search-result-collection';
import { FileCollection } from 'collections/file-collection';
import { FileInfoCollection } from 'collections/file-info-collection';
import { RuntimeInfo } from 'const/runtime-info';
import { UsbListener } from 'comp/app/usb-listener';
import { NativeModules } from 'comp/launcher/native-modules';
import { Timeouts } from 'const/timeouts';
import { AppSettingsModel } from 'models/app-settings-model';
import { EntryModel } from 'models/entry-model';
import { FileInfoModel } from 'models/file-info-model';
import { FileModel } from 'models/file-model';
import { GroupModel } from 'models/group-model';
import { YubiKeyOtpModel } from 'models/otp-device/yubikey-otp-model';
import { MenuModel } from 'models/menu/menu-model';
import { PluginManager } from 'plugins/plugin-manager';
import { Features } from 'util/features';
import { DateFormat } from 'comp/i18n/date-format';
import { Launcher } from 'comp/launcher';
import { UrlFormat } from 'util/formatting/url-format';
import { IdGenerator } from 'util/generators/id-generator';
import { Locale } from 'util/locale';
import { Logger } from 'util/logger';
import { noop } from 'util/fn';
import debounce from 'lodash/debounce';
import 'util/kdbxweb/protected-value-ex';

class AppModel {
    tags = [];
    files = new FileCollection();
    fileInfos = FileInfoCollection;
    menu = new MenuModel();
    filter = {};
    sort = 'title';
    settings = AppSettingsModel;
    activeEntryId = null;
    isBeta = RuntimeInfo.beta;
    advancedSearch = null;
    attachedYubiKeysCount = 0;
    memoryPasswordStorage = {};
    fileUnlockPromise = null;
    hardwareDecryptInProgress = false;
    mainWindowBlurTimer = null;

    constructor() {
        Events.on('refresh', this.refresh.bind(this));
        Events.on('set-filter', this.setFilter.bind(this));
        Events.on('add-filter', this.addFilter.bind(this));
        Events.on('set-sort', this.setSort.bind(this));
        Events.on('empty-trash', this.emptyTrash.bind(this));
        Events.on('select-entry', this.selectEntry.bind(this));
        Events.on('unset-keyfile', this.unsetKeyFile.bind(this));
        Events.on('usb-devices-changed', this.usbDevicesChanged.bind(this));
        Events.on('main-window-blur', this.mainWindowBlur.bind(this));
        Events.on('main-window-focus', this.mainWindowFocus.bind(this));
        Events.on('main-window-will-close', this.mainWindowWillClose.bind(this));
        Events.on('hardware-decrypt-started', this.hardwareDecryptStarted.bind(this));
        Events.on('hardware-decrypt-finished', this.hardwareDecryptFinished.bind(this));

        this.appLogger = new Logger('app');
        AppModel.instance = this;
    }

    loadConfig(configLocation) {
        return new Promise((resolve, reject) => {
            this.ensureCanLoadConfig(configLocation);
            this.appLogger.debug('Loading config from', configLocation);
            const ts = this.appLogger.ts();
            const xhr = new XMLHttpRequest();
            xhr.open('GET', configLocation);
            xhr.responseType = 'json';
            xhr.send();
            xhr.addEventListener('load', () => {
                let response = xhr.response;
                if (!response) {
                    const errorDesc = xhr.statusText === 'OK' ? 'Malformed JSON' : xhr.statusText;
                    this.appLogger.error('Error loading app config', errorDesc);
                    return reject('Error loading app config');
                }
                if (typeof response === 'string') {
                    try {
                        response = JSON.parse(response);
                    } catch (e) {
                        this.appLogger.error('Error parsing response', e, response);
                        return reject('Error parsing response');
                    }
                }
                if (!response.settings) {
                    this.appLogger.error('Invalid app config, no settings section', response);
                    return reject('Invalid app config, no settings section');
                }
                this.appLogger.info(
                    'Loaded app config from',
                    configLocation,
                    this.appLogger.ts(ts)
                );
                resolve(response);
            });
            xhr.addEventListener('error', () => {
                this.appLogger.error('Error loading app config', xhr.statusText, xhr.status);
                reject('Error loading app config');
            });
        }).then((config) => {
            return this.applyUserConfig(config);
        });
    }

    ensureCanLoadConfig(url) {
        if (!Features.isSelfHosted) {
            throw 'Configs are supported only in self-hosted installations';
        }
        const link = document.createElement('a');
        link.href = url;
        const isExternal = link.host && link.host !== location.host;
        if (isExternal) {
            throw 'Loading config from this location is not allowed';
        }
    }

    applyUserConfig(config) {
        this.settings.set(config.settings);
        if (config.files) {
            if (config.showOnlyFilesFromConfig) {
                this.fileInfos.length = 0;
            }
            config.files
                .filter(
                    (file) =>
                        file &&
                        file.storage &&
                        file.name &&
                        file.path &&
                        !this.fileInfos.getMatch(file.storage, file.name, file.path)
                )
                .map(
                    (file) =>
                        new FileInfoModel({
                            id: IdGenerator.uuid(),
                            name: file.name,
                            storage: file.storage,
                            path: file.path,
                            opts: file.options
                        })
                )
                .reverse()
                .forEach((fi) => this.fileInfos.unshift(fi));
        }
        if (config.plugins) {
            const pluginsPromises = config.plugins.map((plugin) =>
                PluginManager.installIfNew(plugin.url, plugin.manifest, true)
            );
            return Promise.all(pluginsPromises).then(() => {
                this.settings.set(config.settings);
            });
        }
        if (config.advancedSearch) {
            this.advancedSearch = config.advancedSearch;
            this.addFilter({ advanced: this.advancedSearch });
        }
    }

    addFile(file) {
        if (this.files.get(file.id)) {
            return false;
        }
        this.files.push(file);
        for (const group of file.groups) {
            this.menu.groupsSection.addItem(group);
        }
        this._addTags(file);
        this._tagsChanged();
        this.menu.filesSection.addItem({
            icon: 'lock',
            title: file.name,
            page: 'file',
            file
        });

        this.refresh();

        file.on('reload', this.reloadFile.bind(this));
        file.on('change', () => {
            Events.emit('file-changed', file);
        });
        file.on('ejected', () => this.closeFile(file));
        file.on('change:dirty', (file, dirty) => {
            if (dirty && this.settings.autoSaveInterval === -1) {
                this.syncFile(file);
            }
        });

        Events.emit('file-opened');

        if (this.fileUnlockPromise) {
            this.appLogger.info('Running pending file unlock operation');
            this.fileUnlockPromise.resolve(file);
            this.fileUnlockPromise = null;
            Events.emit('unlock-message-changed', null);
        }

        return true;
    }

    reloadFile(file) {
        this.menu.groupsSection.replaceByFile(file, file.groups[0]);
        this.updateTags();
    }

    _addTags(file) {
        const tagsHash = {};
        this.tags.forEach((tag) => {
            tagsHash[tag.toLowerCase()] = true;
        });
        file.forEachEntry({}, (entry) => {
            for (const tag of entry.tags) {
                if (!tagsHash[tag.toLowerCase()]) {
                    tagsHash[tag.toLowerCase()] = true;
                    this.tags.push(tag);
                }
            }
        });
        this.tags.sort();
    }

    _tagsChanged() {
        if (this.tags.length) {
            this.menu.tagsSection.scrollable = true;
            this.menu.tagsSection.setItems(
                this.tags.map((tag) => {
                    return {
                        title: tag,
                        icon: 'tag',
                        filterKey: 'tag',
                        filterValue: tag,
                        editable: true
                    };
                })
            );
        } else {
            this.menu.tagsSection.scrollable = false;
            this.menu.tagsSection.removeAllItems();
        }
    }

    updateTags() {
        const oldTags = this.tags.slice();
        this.tags.splice(0, this.tags.length);
        for (const file of this.files) {
            this._addTags(file);
        }
        if (oldTags.join(',') !== this.tags.join(',')) {
            this._tagsChanged();
        }
    }

    renameTag(from, to) {
        this.files.forEach((file) => file.renameTag && file.renameTag(from, to));
        this.updateTags();
    }

    closeAllFiles() {
        if (!this.files.hasOpenFiles()) {
            return;
        }
        for (const file of this.files) {
            file.close();
            this.fileClosed(file);
        }
        this.files.length = 0;
        this.menu.groupsSection.removeAllItems();
        this.menu.tagsSection.scrollable = false;
        this.menu.tagsSection.removeAllItems();
        this.menu.filesSection.removeAllItems();
        this.tags.splice(0, this.tags.length);
        this.filter = {};
        this.menu.select({ item: this.menu.allItemsItem });
        Events.emit('all-files-closed');
    }

    closeFile(file) {
        file.close();
        this.fileClosed(file);
        this.files.remove(file);
        this.updateTags();
        this.menu.groupsSection.removeByFile(file);
        this.menu.filesSection.removeByFile(file);
        this.menu.select({ item: this.menu.allItemsSection.items[0] });
        Events.emit('one-file-closed');
    }

    emptyTrash() {
        this.files.forEach((file) => file.emptyTrash && file.emptyTrash());
        this.refresh();
    }

    setFilter(filter) {
        this.filter = this.prepareFilter(filter);
        this.filter.subGroups = this.settings.expandGroups;
        if (!this.filter.advanced && this.advancedSearch) {
            this.filter.advanced = this.advancedSearch;
        }
        const entries = this.getEntries();
        if (!this.activeEntryId || !entries.get(this.activeEntryId)) {
            const firstEntry = entries[0];
            this.activeEntryId = firstEntry ? firstEntry.id : null;
        }
        Events.emit('filter', { filter: this.filter, sort: this.sort, entries });
        Events.emit('entry-selected', entries.get(this.activeEntryId));
    }

    refresh() {
        this.setFilter(this.filter);
    }

    selectEntry(entry) {
        this.activeEntryId = entry.id;
        this.refresh();
    }

    addFilter(filter) {
        this.setFilter(Object.assign(this.filter, filter));
    }

    setSort(sort) {
        this.sort = sort;
        this.setFilter(this.filter);
    }

    getEntries() {
        const entries = this.getEntriesByFilter(this.filter, this.files);
        entries.sortEntries(this.sort, this.filter);
        if (this.filter.trash) {
            this.addTrashGroups(entries);
        }
        return entries;
    }

    getEntriesByFilter(filter, files) {
        const preparedFilter = this.prepareFilter(filter);
        const entries = new SearchResultCollection();

        const devicesToMatchOtpEntries = files.filter((file) => file.backend === 'otp-device');

        const matchedOtpEntrySet = this.settings.yubiKeyMatchEntries ? new Set() : undefined;

        files
            .filter((file) => file.backend !== 'otp-device')
            .forEach((file) => {
                file.forEachEntry(preparedFilter, (entry) => {
                    if (matchedOtpEntrySet) {
                        for (const device of devicesToMatchOtpEntries) {
                            const matchingEntry = device.getMatchingEntry(entry);
                            if (matchingEntry) {
                                matchedOtpEntrySet.add(matchingEntry);
                            }
                        }
                    }
                    entries.push(entry);
                });
            });

        if (devicesToMatchOtpEntries.length) {
            for (const device of devicesToMatchOtpEntries) {
                device.forEachEntry(preparedFilter, (entry) => {
                    if (!matchedOtpEntrySet || !matchedOtpEntrySet.has(entry)) {
                        entries.push(entry);
                    }
                });
            }
        }

        return entries;
    }

    addTrashGroups(collection) {
        this.files.forEach((file) => {
            const trashGroup = file.getTrashGroup && file.getTrashGroup();
            if (trashGroup) {
                trashGroup.getOwnSubGroups().forEach((group) => {
                    collection.unshift(GroupModel.fromGroup(group, file, trashGroup));
                });
            }
        });
    }

    prepareFilter(filter) {
        filter = { ...filter };

        filter.textLower = filter.text ? filter.text.toLowerCase() : '';
        filter.textParts = null;
        filter.textLowerParts = null;

        const exact = filter.advanced && filter.advanced.exact;
        if (!exact && filter.text) {
            const textParts = filter.text.split(/\s+/).filter((s) => s);
            if (textParts.length) {
                filter.textParts = textParts;
                filter.textLowerParts = filter.textLower.split(/\s+/).filter((s) => s);
            }
        }

        filter.tagLower = filter.tag ? filter.tag.toLowerCase() : '';

        return filter;
    }

    getFirstSelectedGroupForCreation() {
        const selGroupId = this.filter.group;
        let file, group;
        if (selGroupId) {
            this.files.some((f) => {
                file = f;
                group = f.getGroup(selGroupId);
                return group;
            });
        }
        if (!group) {
            file = this.files.find((f) => f.active && !f.readOnly);
            group = file.groups[0];
        }
        return { group, file };
    }

    completeUserNames(part) {
        const userNames = {};
        this.files.forEach((file) => {
            file.forEachEntry(
                { text: part, textLower: part.toLowerCase(), advanced: { user: true } },
                (entry) => {
                    const userName = entry.user;
                    if (userName) {
                        userNames[userName] = (userNames[userName] || 0) + 1;
                    }
                }
            );
        });
        const matches = Object.entries(userNames);
        matches.sort((x, y) => y[1] - x[1]);
        const maxResults = 5;
        if (matches.length > maxResults) {
            matches.length = maxResults;
        }
        return matches.map((m) => m[0]);
    }

    getEntryTemplates() {
        const entryTemplates = [];
        this.files.forEach((file) => {
            file.forEachEntryTemplate?.((entry) => {
                entryTemplates.push({ file, entry });
            });
        });
        return entryTemplates;
    }

    canCreateEntries() {
        return this.files.some((f) => f.active && !f.readOnly);
    }

    createNewEntry(args) {
        const sel = this.getFirstSelectedGroupForCreation();
        if (args?.template) {
            if (sel.file !== args.template.file) {
                sel.file = args.template.file;
                sel.group = args.template.file.groups[0];
            }
            const templateEntry = args.template.entry;
            const newEntry = EntryModel.newEntry(sel.group, sel.file);
            newEntry.copyFromTemplate(templateEntry);
            return newEntry;
        } else {
            return EntryModel.newEntry(sel.group, sel.file, {
                tag: this.filter.tag
            });
        }
    }

    createNewEntryWithFields(group, fields) {
        return EntryModel.newEntryWithFields(group, fields);
    }

    createNewGroup() {
        const sel = this.getFirstSelectedGroupForCreation();
        return GroupModel.newGroup(sel.group, sel.file);
    }

    createNewGroupWithName(group, file, name) {
        const newGroup = GroupModel.newGroup(group, file);
        newGroup.setName(name);
        return newGroup;
    }

    createNewTemplateEntry() {
        const file = this.getFirstSelectedGroupForCreation().file;
        const group = file.getEntryTemplatesGroup() || file.createEntryTemplatesGroup();
        return EntryModel.newEntry(group, file);
    }

    createDemoFile() {
        if (!this.files.getByName('Demo')) {
            const demoFile = new FileModel({ id: IdGenerator.uuid() });
            demoFile.openDemo(() => {
                this.addFile(demoFile);
            });
            return true;
        } else {
            return false;
        }
    }

    createNewFile(name, callback) {
        if (!name) {
            for (let i = 0; ; i++) {
                name = Locale.openNewFile + (i || '');
                if (!this.files.getByName(name) && !this.fileInfos.getByName(name)) {
                    break;
                }
            }
        }
        const newFile = new FileModel({ id: IdGenerator.uuid() });
        newFile.create(name, () => {
            this.addFile(newFile);
            callback?.(newFile);
        });
    }

    openFile(params, callback) {
        const logger = new Logger('open', params.name);
        logger.info('File open request');

        const fileInfo = params.id
            ? this.fileInfos.get(params.id)
            : this.fileInfos.getMatch(params.storage, params.name, params.path);

        if (!params.opts && fileInfo && fileInfo.opts) {
            params.opts = fileInfo.opts;
        }

        if (fileInfo && fileInfo.modified) {
            logger.info('Open file from cache because it is modified');
            this.openFileFromCache(
                params,
                (err, file) => {
                    if (!err && file) {
                        logger.info('Sync just opened modified file');
                        setTimeout(() => this.syncFile(file), 0);
                    }
                    callback(err);
                },
                fileInfo
            );
        } else if (params.fileData) {
            logger.info('Open file from supplied content');
            if (params.storage === 'file') {
                Storage.file.stat(params.path, null, (err, stat) => {
                    if (err) {
                        return callback(err);
                    }
                    params.rev = stat.rev;
                    this.openFileWithData(params, callback, fileInfo, params.fileData);
                });
            } else {
                this.openFileWithData(params, callback, fileInfo, params.fileData, true);
            }
        } else if (!params.storage) {
            logger.info('Open file from cache as main storage');
            this.openFileFromCache(params, callback, fileInfo);
        } else if (
            fileInfo &&
            fileInfo.openDate &&
            fileInfo.rev === params.rev &&
            fileInfo.storage !== 'file' &&
            !this.settings.disableOfflineStorage
        ) {
            logger.info('Open file from cache because it is latest');
            this.openFileFromCache(
                params,
                (err, file) => {
                    if (err) {
                        if (err.name === 'KdbxError' || err.ykError) {
                            return callback(err);
                        }
                        logger.info(
                            'Error loading file from cache, trying to open from storage',
                            err
                        );
                        this.openFileFromStorage(params, callback, fileInfo, logger, true);
                    } else {
                        callback(err, file);
                    }
                },
                fileInfo
            );
        } else if (
            !fileInfo ||
            !fileInfo.openDate ||
            params.storage === 'file' ||
            this.settings.disableOfflineStorage
        ) {
            this.openFileFromStorage(params, callback, fileInfo, logger);
        } else {
            logger.info('Open file from cache, will sync after load', params.storage);
            this.openFileFromCache(
                params,
                (err, file) => {
                    if (!err && file) {
                        logger.info('Sync just opened file');
                        setTimeout(() => this.syncFile(file), 0);
                        callback(err);
                    } else {
                        if (err.name === 'KdbxError' || err.ykError) {
                            return callback(err);
                        }
                        logger.info(
                            'Error loading file from cache, trying to open from storage',
                            err
                        );
                        this.openFileFromStorage(params, callback, fileInfo, logger, true);
                    }
                },
                fileInfo
            );
        }
    }

    openFileFromCache(params, callback, fileInfo) {
        Storage.cache.load(fileInfo.id, null, (err, data) => {
            if (!data) {
                err = Locale.openFileNoCacheError;
            }
            new Logger('open', params.name).info('Loaded file from cache', err);
            if (err) {
                callback(err);
            } else {
                this.openFileWithData(params, callback, fileInfo, data);
            }
        });
    }

    openFileFromStorage(params, callback, fileInfo, logger, noCache) {
        logger.info('Open file from storage', params.storage);
        const storage = Storage[params.storage];
        const storageLoad = () => {
            logger.info('Load from storage');
            storage.load(params.path, params.opts, (err, data, stat) => {
                if (err) {
                    if (fileInfo && fileInfo.openDate && !this.settings.disableOfflineStorage) {
                        logger.info('Open file from cache because of storage load error', err);
                        this.openFileFromCache(params, callback, fileInfo);
                    } else {
                        logger.info('Storage load error', err);
                        callback(err);
                    }
                } else {
                    logger.info('Open file from content loaded from storage');
                    params.fileData = data;
                    params.rev = (stat && stat.rev) || null;
                    const needSaveToCache = storage.name !== 'file';
                    this.openFileWithData(params, callback, fileInfo, data, needSaveToCache);
                }
            });
        };
        const cacheRev = (fileInfo && fileInfo.rev) || null;
        if (cacheRev && storage.stat) {
            logger.info('Stat file');
            storage.stat(params.path, params.opts, (err, stat) => {
                if (
                    !noCache &&
                    fileInfo &&
                    storage.name !== 'file' &&
                    (err || (stat && stat.rev === cacheRev)) &&
                    !this.settings.disableOfflineStorage
                ) {
                    logger.info(
                        'Open file from cache because ' + (err ? 'stat error' : 'it is latest'),
                        err
                    );
                    this.openFileFromCache(params, callback, fileInfo);
                } else if (stat) {
                    logger.info(
                        'Open file from storage (' + stat.rev + ', local ' + cacheRev + ')'
                    );
                    storageLoad();
                } else {
                    logger.info('Stat error', err);
                    callback(err);
                }
            });
        } else {
            storageLoad();
        }
    }

    openFileWithData(params, callback, fileInfo, data, updateCacheOnSuccess) {
        const logger = new Logger('open', params.name);
        let needLoadKeyFile = false;
        if (!params.keyFileData && fileInfo && fileInfo.keyFileName) {
            params.keyFileName = fileInfo.keyFileName;
            if (this.settings.rememberKeyFiles === 'data' && fileInfo.keyFileHash) {
                params.keyFileData = FileModel.createKeyFileWithHash(fileInfo.keyFileHash);
            } else if (this.settings.rememberKeyFiles === 'path' && fileInfo.keyFilePath) {
                params.keyFilePath = fileInfo.keyFilePath;
                if (Storage.file.enabled) {
                    needLoadKeyFile = true;
                }
            }
        } else if (params.keyFilePath && !params.keyFileData && !fileInfo) {
            needLoadKeyFile = true;
        }
        const file = new FileModel({
            id: fileInfo ? fileInfo.id : IdGenerator.uuid(),
            name: params.name,
            storage: params.storage,
            path: params.path,
            keyFileName: params.keyFileName,
            keyFilePath: params.keyFilePath,
            backup: fileInfo?.backup || null,
            chalResp: params.chalResp
        });
        if (params.encryptedPassword) {
            file.encryptedPassword = fileInfo.encryptedPassword;
            file.encryptedPasswordDate = fileInfo?.encryptedPasswordDate || new Date();
        }
        const openComplete = (err) => {
            if (err) {
                return callback(err);
            }
            if (this.files.get(file.id)) {
                return callback('Duplicate file id');
            }
            if (fileInfo && fileInfo.modified) {
                if (fileInfo.editState) {
                    logger.info('Loaded local edit state');
                    file.setLocalEditState(fileInfo.editState);
                }
                logger.info('Mark file as modified');
                file.modified = true;
            }
            if (fileInfo) {
                file.syncDate = fileInfo.syncDate;
            }
            if (updateCacheOnSuccess && !this.settings.disableOfflineStorage) {
                logger.info('Save loaded file to cache');
                Storage.cache.save(file.id, null, params.fileData);
            }
            const rev = params.rev || (fileInfo && fileInfo.rev);
            this.setFileOpts(file, params.opts);
            this.addToLastOpenFiles(file, rev);
            this.addFile(file);
            callback(null, file);
            this.fileOpened(file, data, params);
        };
        const open = () => {
            file.open(params.password, data, params.keyFileData, openComplete);
        };
        if (needLoadKeyFile) {
            Storage.file.load(params.keyFilePath, {}, (err, data) => {
                if (err) {
                    logger.info('Storage load error', err);
                    callback(err);
                } else {
                    params.keyFileData = data;
                    open();
                }
            });
        } else {
            open();
        }
    }

    importFileWithXml(params, callback) {
        const logger = new Logger('import', params.name);
        logger.info('File import request with supplied xml');
        const file = new FileModel({
            id: IdGenerator.uuid(),
            name: params.name,
            storage: params.storage,
            path: params.path
        });
        file.importWithXml(params.fileXml, (err) => {
            logger.info('Import xml complete ' + (err ? 'with error' : ''), err);
            if (err) {
                return callback(err);
            }
            this.addFile(file);
            this.fileOpened(file);
        });
    }

    addToLastOpenFiles(file, rev) {
        this.appLogger.debug(
            'Add last open file',
            file.id,
            file.name,
            file.storage,
            file.path,
            rev
        );
        const dt = new Date();
        const fileInfo = new FileInfoModel({
            id: file.id,
            name: file.name,
            storage: file.storage,
            path: file.path,
            opts: this.getStoreOpts(file),
            modified: file.modified,
            editState: file.getLocalEditState(),
            rev,
            syncDate: file.syncDate || dt,
            openDate: dt,
            backup: file.backup,
            chalResp: file.chalResp
        });
        switch (this.settings.rememberKeyFiles) {
            case 'data':
                fileInfo.set({
                    keyFileName: file.keyFileName || null,
                    keyFileHash: file.getKeyFileHash()
                });
                break;
            case 'path':
                fileInfo.set({
                    keyFileName: file.keyFileName || null,
                    keyFilePath: file.keyFilePath || null
                });
        }
        if (this.settings.deviceOwnerAuth === 'file' && file.encryptedPassword) {
            const maxDate = new Date(file.encryptedPasswordDate);
            maxDate.setMinutes(maxDate.getMinutes() + this.settings.deviceOwnerAuthTimeoutMinutes);
            if (maxDate > new Date()) {
                fileInfo.encryptedPassword = file.encryptedPassword;
                fileInfo.encryptedPasswordDate = file.encryptedPasswordDate;
            }
        }
        this.fileInfos.remove(file.id);
        this.fileInfos.unshift(fileInfo);
        this.fileInfos.save();
    }

    getStoreOpts(file) {
        const opts = file.opts;
        const storage = file.storage;
        if (Storage[storage] && Storage[storage].fileOptsToStoreOpts && opts) {
            return Storage[storage].fileOptsToStoreOpts(opts, file);
        }
        return null;
    }

    setFileOpts(file, opts) {
        const storage = file.storage;
        if (Storage[storage] && Storage[storage].storeOptsToFileOpts && opts) {
            file.opts = Storage[storage].storeOptsToFileOpts(opts, file);
        }
    }

    fileOpened(file, data, params) {
        if (file.storage === 'file') {
            Storage.file.watch(
                file.path,
                debounce(() => {
                    this.syncFile(file);
                }, Timeouts.FileChangeSync)
            );
        }
        if (file.isKeyChangePending(true)) {
            Events.emit('key-change-pending', { file });
        }
        const backup = file.backup;
        if (data && backup && backup.enabled && backup.pending) {
            this.scheduleBackupFile(file, data);
        }
        if (this.settings.yubiKeyAutoOpen) {
            if (
                this.attachedYubiKeysCount > 0 &&
                !this.files.some((f) => f.backend === 'otp-device')
            ) {
                this.tryOpenOtpDeviceInBackground();
            }
        }
        if (this.settings.deviceOwnerAuth) {
            this.saveEncryptedPassword(file, params);
        }
    }

    fileClosed(file) {
        if (file.storage === 'file') {
            Storage.file.unwatch(file.path);
        }
    }

    removeFileInfo(id) {
        Storage.cache.remove(id);
        this.fileInfos.remove(id);
        this.fileInfos.save();
    }

    getFileInfo(file) {
        return (
            this.fileInfos.get(file.id) ||
            this.fileInfos.getMatch(file.storage, file.name, file.path)
        );
    }

    syncFile(file, options, callback) {
        if (file.demo) {
            return callback && callback();
        }
        if (file.syncing) {
            return callback && callback('Sync in progress');
        }
        if (!file.active) {
            return callback && callback('File is closed');
        }
        if (!options) {
            options = {};
        }
        const logger = new Logger('sync', file.name);
        const storage = options.storage || file.storage;
        let path = options.path || file.path;
        const opts = options.opts || file.opts;
        if (storage && Storage[storage].getPathForName && (!path || storage !== file.storage)) {
            path = Storage[storage].getPathForName(file.name);
        }
        const optionsForLogging = { ...options };
        if (optionsForLogging.opts && optionsForLogging.opts.password) {
            optionsForLogging.opts = { ...optionsForLogging.opts };
            optionsForLogging.opts.password = '***';
        }
        logger.info('Sync started', storage, path, optionsForLogging);
        let fileInfo = this.getFileInfo(file);
        if (!fileInfo) {
            logger.info('Create new file info');
            const dt = new Date();
            fileInfo = new FileInfoModel({
                id: IdGenerator.uuid(),
                name: file.name,
                storage: file.storage,
                path: file.path,
                opts: this.getStoreOpts(file),
                modified: file.modified,
                editState: null,
                rev: null,
                syncDate: dt,
                openDate: dt,
                backup: file.backup
            });
        }
        file.setSyncProgress();
        const complete = (err) => {
            if (!file.active) {
                return callback && callback('File is closed');
            }
            logger.info('Sync finished', err || 'no error');
            file.setSyncComplete(path, storage, err ? err.toString() : null);
            fileInfo.set({
                name: file.name,
                storage,
                path,
                opts: this.getStoreOpts(file),
                modified: file.dirty ? fileInfo.modified : file.modified,
                editState: file.dirty ? fileInfo.editState : file.getLocalEditState(),
                syncDate: file.syncDate,
                chalResp: file.chalResp
            });
            if (this.settings.rememberKeyFiles === 'data') {
                fileInfo.set({
                    keyFileName: file.keyFileName || null,
                    keyFileHash: file.getKeyFileHash()
                });
            }
            if (!this.fileInfos.get(fileInfo.id)) {
                this.fileInfos.unshift(fileInfo);
            }
            this.fileInfos.save();
            if (callback) {
                callback(err);
            }
        };
        if (!storage) {
            if (!file.modified && fileInfo.id === file.id) {
                logger.info('Local, not modified');
                return complete();
            }
            logger.info('Local, save to cache');
            file.getData((data, err) => {
                if (err) {
                    return complete(err);
                }
                Storage.cache.save(fileInfo.id, null, data, (err) => {
                    logger.info('Saved to cache', err || 'no error');
                    complete(err);
                    if (!err) {
                        this.scheduleBackupFile(file, data);
                    }
                });
            });
        } else {
            const maxLoadLoops = 3;
            let loadLoops = 0;
            const loadFromStorageAndMerge = () => {
                if (++loadLoops === maxLoadLoops) {
                    return complete('Too many load attempts');
                }
                logger.info('Load from storage, attempt ' + loadLoops);
                Storage[storage].load(path, opts, (err, data, stat) => {
                    logger.info('Load from storage', stat, err || 'no error');
                    if (!file.active) {
                        return complete('File is closed');
                    }
                    if (err) {
                        return complete(err);
                    }
                    file.mergeOrUpdate(data, options.remoteKey, (err) => {
                        logger.info('Merge complete', err || 'no error');
                        this.refresh();
                        if (err) {
                            if (err.code === 'InvalidKey') {
                                logger.info('Remote key changed, request to enter new key');
                                Events.emit('remote-key-changed', { file });
                            }
                            return complete(err);
                        }
                        if (stat && stat.rev) {
                            logger.info('Update rev in file info');
                            fileInfo.rev = stat.rev;
                        }
                        file.syncDate = new Date();
                        if (file.modified) {
                            logger.info('Updated sync date, saving modified file');
                            saveToCacheAndStorage();
                        } else if (file.dirty) {
                            if (this.settings.disableOfflineStorage) {
                                logger.info('File is dirty and cache is disabled');
                                return complete(err);
                            }
                            logger.info('Saving not modified dirty file to cache');
                            Storage.cache.save(fileInfo.id, null, data, (err) => {
                                if (err) {
                                    return complete(err);
                                }
                                file.dirty = false;
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
            const saveToStorage = (data) => {
                logger.info('Save data to storage');
                const storageRev = fileInfo.storage === storage ? fileInfo.rev : undefined;
                Storage[storage].save(
                    path,
                    opts,
                    data,
                    (err, stat) => {
                        if (err && err.revConflict) {
                            logger.info('Save rev conflict, reloading from storage');
                            loadFromStorageAndMerge();
                        } else if (err) {
                            logger.info('Error saving data to storage');
                            complete(err);
                        } else {
                            if (stat && stat.rev) {
                                logger.info('Update rev in file info');
                                fileInfo.rev = stat.rev;
                            }
                            if (stat && stat.path) {
                                logger.info('Update path in file info', stat.path);
                                file.path = stat.path;
                                fileInfo.path = stat.path;
                                path = stat.path;
                            }
                            file.syncDate = new Date();
                            logger.info('Save to storage complete, update sync date');
                            this.scheduleBackupFile(file, data);
                            complete();
                        }
                    },
                    storageRev
                );
            };
            const saveToCacheAndStorage = () => {
                logger.info('Getting file data for saving');
                file.getData((data, err) => {
                    if (err) {
                        return complete(err);
                    }
                    if (storage === 'file') {
                        logger.info('Saving to file storage');
                        saveToStorage(data);
                    } else if (!file.dirty) {
                        logger.info('Saving to storage, skip cache because not dirty');
                        saveToStorage(data);
                    } else if (this.settings.disableOfflineStorage) {
                        logger.info('Saving to storage because cache is disabled');
                        saveToStorage(data);
                    } else {
                        logger.info('Saving to cache');
                        Storage.cache.save(fileInfo.id, null, data, (err) => {
                            if (err) {
                                return complete(err);
                            }
                            file.dirty = false;
                            logger.info('Saved to cache, saving to storage');
                            saveToStorage(data);
                        });
                    }
                });
            };
            logger.info('Stat file');
            Storage[storage].stat(path, opts, (err, stat) => {
                if (!file.active) {
                    return complete('File is closed');
                }
                if (err) {
                    if (err.notFound) {
                        logger.info('File does not exist in storage, creating');
                        saveToCacheAndStorage();
                    } else if (file.dirty) {
                        if (this.settings.disableOfflineStorage) {
                            logger.info('Stat error, dirty, cache is disabled', err || 'no error');
                            return complete(err);
                        }
                        logger.info('Stat error, dirty, save to cache', err || 'no error');
                        file.getData((data, e) => {
                            if (e) {
                                logger.error('Error getting file data', e);
                                return complete(err);
                            }
                            Storage.cache.save(fileInfo.id, null, data, (e) => {
                                if (e) {
                                    logger.error('Error saving to cache', e);
                                }
                                if (!e) {
                                    file.dirty = false;
                                }
                                logger.info('Saved to cache, exit with error', err || 'no error');
                                complete(err);
                            });
                        });
                    } else {
                        logger.info('Stat error, not dirty', err || 'no error');
                        complete(err);
                    }
                } else if (stat.rev === fileInfo.rev) {
                    if (file.modified) {
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
    }

    deleteAllCachedFiles() {
        for (const fileInfo of this.fileInfos) {
            if (fileInfo.storage && !fileInfo.modified) {
                Storage.cache.remove(fileInfo.id);
            }
        }
    }

    clearStoredKeyFiles() {
        for (const fileInfo of this.fileInfos) {
            fileInfo.set({
                keyFileName: null,
                keyFilePath: null,
                keyFileHash: null
            });
        }
        this.fileInfos.save();
    }

    unsetKeyFile(fileId) {
        const fileInfo = this.fileInfos.get(fileId);
        fileInfo.set({
            keyFileName: null,
            keyFilePath: null,
            keyFileHash: null
        });
        this.fileInfos.save();
    }

    setFileBackup(fileId, backup) {
        const fileInfo = this.fileInfos.get(fileId);
        if (fileInfo) {
            fileInfo.backup = backup;
        }
        this.fileInfos.save();
    }

    backupFile(file, data, callback) {
        const opts = file.opts;
        let backup = file.backup;
        const logger = new Logger('backup', file.name);
        if (!backup || !backup.storage || !backup.path) {
            return callback('Invalid backup settings');
        }
        let path = backup.path.replace('{date}', DateFormat.dtStrFs(new Date()));
        logger.info('Backup file to', backup.storage, path);
        const saveToFolder = () => {
            if (Storage[backup.storage].getPathForName) {
                path = Storage[backup.storage].getPathForName(path);
            }
            Storage[backup.storage].save(path, opts, data, (err) => {
                if (err) {
                    logger.error('Backup error', err);
                } else {
                    logger.info('Backup complete');
                    backup = file.backup;
                    backup.lastTime = Date.now();
                    delete backup.pending;
                    file.backup = backup;
                    this.setFileBackup(file.id, backup);
                }
                callback(err);
            });
        };
        let folderPath = UrlFormat.fileToDir(path);
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
    }

    scheduleBackupFile(file, data) {
        const backup = file.backup;
        if (!backup || !backup.enabled) {
            return;
        }
        const logger = new Logger('backup', file.name);
        let needBackup = false;
        if (!backup.lastTime) {
            needBackup = true;
            logger.debug('No last backup time, backup now');
        } else {
            const dt = new Date(backup.lastTime);
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
            logger.debug(
                'Last backup time: ' +
                    new Date(backup.lastTime) +
                    ', schedule: ' +
                    backup.schedule +
                    ', next time: ' +
                    dt +
                    ', ' +
                    (needBackup ? 'backup now' : 'skip backup')
            );
        }
        if (!backup.pending) {
            backup.pending = true;
            this.setFileBackup(file.id, backup);
        }
        if (needBackup) {
            this.backupFile(file, data, noop);
        }
    }

    usbDevicesChanged() {
        const attachedYubiKeysCount = this.attachedYubiKeysCount;

        this.attachedYubiKeysCount = UsbListener.attachedYubiKeys;

        if (!this.settings.yubiKeyAutoOpen) {
            return;
        }

        const isNewYubiKey = UsbListener.attachedYubiKeys > attachedYubiKeysCount;
        const hasOpenFiles = this.files.some(
            (file) => file.active && file.backend !== 'otp-device'
        );

        if (isNewYubiKey && hasOpenFiles && !this.openingOtpDevice) {
            this.tryOpenOtpDeviceInBackground();
        }
    }

    tryOpenOtpDeviceInBackground() {
        this.appLogger.debug('Auto-opening a YubiKey');
        this.openOtpDevice((err) => {
            this.appLogger.debug('YubiKey auto-open complete', err);
        });
    }

    openOtpDevice(callback) {
        this.openingOtpDevice = true;
        const device = new YubiKeyOtpModel();
        device.open((err) => {
            this.openingOtpDevice = false;
            if (!err) {
                this.addFile(device);
            }
            callback(err);
        });
        return device;
    }

    getMatchingOtpEntry(entry) {
        if (!this.settings.yubiKeyMatchEntries) {
            return null;
        }
        for (const file of this.files) {
            if (file.backend === 'otp-device') {
                const matchingEntry = file.getMatchingEntry(entry);
                if (matchingEntry) {
                    return matchingEntry;
                }
            }
        }
    }

    saveEncryptedPassword(file, params) {
        if (!this.settings.deviceOwnerAuth || params.encryptedPassword) {
            return;
        }
        NativeModules.hardwareEncrypt(params.password)
            .then((encryptedPassword) => {
                encryptedPassword = encryptedPassword.toBase64();
                const fileInfo = this.fileInfos.get(file.id);
                const encryptedPasswordDate = new Date();
                file.encryptedPassword = encryptedPassword;
                file.encryptedPasswordDate = encryptedPasswordDate;
                if (this.settings.deviceOwnerAuth === 'file') {
                    fileInfo.encryptedPassword = encryptedPassword;
                    fileInfo.encryptedPasswordDate = encryptedPasswordDate;
                    this.fileInfos.save();
                } else if (this.settings.deviceOwnerAuth === 'memory') {
                    this.memoryPasswordStorage[file.id] = {
                        value: encryptedPassword,
                        date: encryptedPasswordDate
                    };
                }
            })
            .catch((e) => {
                file.encryptedPassword = null;
                file.encryptedPasswordDate = null;
                delete this.memoryPasswordStorage[file.id];
                this.appLogger.error('Error encrypting password', e);
            });
    }

    getMemoryPassword(fileId) {
        return this.memoryPasswordStorage[fileId];
    }

    checkEncryptedPasswordsStorage() {
        if (this.settings.deviceOwnerAuth === 'file') {
            let changed = false;
            for (const fileInfo of this.fileInfos) {
                if (this.memoryPasswordStorage[fileInfo.id]) {
                    fileInfo.encryptedPassword = this.memoryPasswordStorage[fileInfo.id].value;
                    fileInfo.encryptedPasswordDate = this.memoryPasswordStorage[fileInfo.id].date;
                    changed = true;
                }
            }
            if (changed) {
                this.fileInfos.save();
            }
            for (const file of this.files) {
                if (this.memoryPasswordStorage[file.id]) {
                    file.encryptedPassword = this.memoryPasswordStorage[file.id].value;
                    file.encryptedPasswordDate = this.memoryPasswordStorage[file.id].date;
                }
            }
        } else if (this.settings.deviceOwnerAuth === 'memory') {
            let changed = false;
            for (const fileInfo of this.fileInfos) {
                if (fileInfo.encryptedPassword) {
                    this.memoryPasswordStorage[fileInfo.id] = {
                        value: fileInfo.encryptedPassword,
                        date: fileInfo.encryptedPasswordDate
                    };
                    fileInfo.encryptedPassword = null;
                    fileInfo.encryptedPasswordDate = null;
                    changed = true;
                }
            }
            if (changed) {
                this.fileInfos.save();
            }
        } else {
            let changed = false;
            for (const fileInfo of this.fileInfos) {
                if (fileInfo.encryptedPassword) {
                    fileInfo.encryptedPassword = null;
                    fileInfo.encryptedPasswordDate = null;
                    changed = true;
                }
            }
            if (changed) {
                this.fileInfos.save();
            }
            for (const file of this.files) {
                if (file.encryptedPassword) {
                    file.encryptedPassword = null;
                    file.encryptedPasswordDate = null;
                }
            }
            this.memoryPasswordStorage = {};
        }
    }

    unlockAnyFile(unlockRes, timeout) {
        this.rejectPendingFileUnlockPromise('Replaced with a new operation');
        Events.emit('show-open-view');
        return new Promise((resolve, reject) => {
            this.fileUnlockPromise = { resolve, reject, unlockRes };
            if (timeout) {
                const timer = setTimeout(
                    () => this.rejectPendingFileUnlockPromise('Timeout'),
                    timeout
                );
                this.fileUnlockPromise.resolve = (res) => {
                    clearTimeout(timer);
                    resolve(res);
                };
                this.fileUnlockPromise.reject = (err) => {
                    clearTimeout(timer);
                    reject(err);
                };
            }
            this.appLogger.info('Pending file unlock operation is set');
            Events.emit('unlock-message-changed', unlockRes);
        });
    }

    get unlockMessageRes() {
        return this.fileUnlockPromise?.unlockRes;
    }

    rejectPendingFileUnlockPromise(reason) {
        if (this.fileUnlockPromise) {
            this.appLogger.info('Cancel pending file unlock operation', reason);
            this.fileUnlockPromise.reject(new Error(reason));
            this.fileUnlockPromise = null;
            Events.emit('unlock-message-changed', null);
        }
    }

    mainWindowBlur() {
        if (!this.hardwareDecryptInProgress) {
            this.mainWindowBlurTimer = setTimeout(() => {
                // macOS emits focus-blur-focus event in a row when triggering auto-type from minimized state
                delete this.mainWindowBlurTimer;
                this.rejectPendingFileUnlockPromise('Main window blur');
            }, Timeouts.AutoTypeWindowFocusAfterBlur);
        }
    }

    mainWindowFocus() {
        if (this.mainWindowBlurTimer) {
            clearTimeout(this.mainWindowBlurTimer);
            this.mainWindowBlurTimer = null;
        }
    }

    mainWindowWillClose() {
        this.rejectPendingFileUnlockPromise('Main window will close');
    }

    hardwareDecryptStarted() {
        this.hardwareDecryptInProgress = true;
    }

    hardwareDecryptFinished() {
        this.hardwareDecryptInProgress = false;
        if (!Launcher.isAppFocused()) {
            this.rejectPendingFileUnlockPromise('App is not focused after hardware decrypt');
        }
    }
}

export { AppModel };

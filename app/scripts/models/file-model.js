const Backbone = require('backbone');
const GroupCollection = require('../collections/group-collection');
const GroupModel = require('./group-model');
const IconUrl = require('../util/icon-url');
const Logger = require('../util/logger');
const kdbxweb = require('kdbxweb');
const demoFileData = require('base64-loader!../../resources/Demo.kdbx');

const logger = new Logger('file');

const FileModel = Backbone.Model.extend({
    defaults: {
        id: '',
        uuid: '',
        name: '',
        keyFileName: '',
        passwordLength: 0,
        path: '',
        opts: null,
        storage: null,
        modified: false,
        dirty: false,
        open: false,
        created: false,
        demo: false,
        groups: null,
        oldPasswordLength: 0,
        oldKeyFileName: '',
        passwordChanged: false,
        keyFileChanged: false,
        keyChangeForce: -1,
        syncing: false,
        syncError: null,
        syncDate: null,
        backup: null
    },

    db: null,
    entryMap: null,
    groupMap: null,

    initialize: function() {
        this.entryMap = {};
        this.groupMap = {};
    },

    open: function(password, fileData, keyFileData, callback) {
        try {
            const credentials = new kdbxweb.Credentials(password, keyFileData);
            const ts = logger.ts();

            kdbxweb.Kdbx.load(fileData, credentials)
                .then(db => {
                    this.db = db;
                    this.readModel();
                    this.setOpenFile({ passwordLength: password ? password.textLength : 0 });
                    if (keyFileData) {
                        kdbxweb.ByteUtils.zeroBuffer(keyFileData);
                    }
                    logger.info('Opened file ' + this.get('name') + ': ' + logger.ts(ts) + ', ' +
                        this.kdfArgsToString(db.header) + ', ' + Math.round(fileData.byteLength / 1024) + ' kB');
                    callback();
                })
                .catch(err => {
                    if (err.code === kdbxweb.Consts.ErrorCodes.InvalidKey && password && !password.byteLength) {
                        logger.info('Error opening file with empty password, try to open with null password');
                        return this.open(null, fileData, keyFileData, callback);
                    }
                    logger.error('Error opening file', err.code, err.message, err);
                    callback(err);
                });
        } catch (e) {
            logger.error('Error opening file', e, e.code, e.message, e);
            callback(e);
        }
    },

    kdfArgsToString: function(header) {
        if (header.kdfParameters) {
            return header.kdfParameters.keys().map(key => {
                const val = header.kdfParameters.get(key);
                if (val instanceof ArrayBuffer) {
                    return;
                }
                return key + '=' + val;
            }).filter(p => p).join('&');
        } else if (header.keyEncryptionRounds) {
            return header.keyEncryptionRounds + ' rounds';
        } else {
            return '?';
        }
    },

    create: function(name) {
        const password = kdbxweb.ProtectedValue.fromString('');
        const credentials = new kdbxweb.Credentials(password);
        this.db = kdbxweb.Kdbx.create(credentials, name);
        this.set('name', name);
        this.readModel();
        this.set({ open: true, created: true, name: name });
    },

    importWithXml: function(fileXml, callback) {
        try {
            const ts = logger.ts();
            const password = kdbxweb.ProtectedValue.fromString('');
            const credentials = new kdbxweb.Credentials(password);
            kdbxweb.Kdbx.loadXml(fileXml, credentials)
                .then(db => {
                    this.db = db;
                    this.readModel();
                    this.set({ open: true, created: true });
                    logger.info('Imported file ' + this.get('name') + ': ' + logger.ts(ts));
                    callback();
                })
                .catch(err => {
                    logger.error('Error importing file', err.code, err.message, err);
                    callback(err);
                });
        } catch (e) {
            logger.error('Error importing file', e, e.code, e.message, e);
            callback(e);
        }
    },

    openDemo: function(callback) {
        const password = kdbxweb.ProtectedValue.fromString('demo');
        const credentials = new kdbxweb.Credentials(password);
        const demoFile = kdbxweb.ByteUtils.arrayToBuffer(kdbxweb.ByteUtils.base64ToBytes(demoFileData));
        kdbxweb.Kdbx.load(demoFile, credentials)
            .then(db => {
                this.db = db;
                this.set('name', 'Demo');
                this.readModel();
                this.setOpenFile({passwordLength: 4, demo: true});
                callback();
            });
    },

    setOpenFile: function(props) {
        _.extend(props, {
            open: true,
            oldKeyFileName: this.get('keyFileName'),
            oldPasswordLength: props.passwordLength,
            passwordChanged: false,
            keyFileChanged: false
        });
        this.set(props);
        this._oldPasswordHash = this.db.credentials.passwordHash;
        this._oldKeyFileHash = this.db.credentials.keyFileHash;
        this._oldKeyChangeDate = this.db.meta.keyChanged;
    },

    readModel: function() {
        const groups = new GroupCollection();
        this.set({
            uuid: this.db.getDefaultGroup().uuid.toString(),
            groups: groups,
            defaultUser: this.db.meta.defaultUser,
            recycleBinEnabled: this.db.meta.recycleBinEnabled,
            historyMaxItems: this.db.meta.historyMaxItems,
            historyMaxSize: this.db.meta.historyMaxSize,
            keyEncryptionRounds: this.db.header.keyEncryptionRounds,
            keyChangeForce: this.db.meta.keyChangeForce,
            kdfParameters: this.readKdfParams()
        }, { silent: true });
        this.db.groups.forEach(function(group) {
            let groupModel = this.getGroup(this.subId(group.uuid.id));
            if (groupModel) {
                groupModel.setGroup(group, this);
            } else {
                groupModel = GroupModel.fromGroup(group, this);
            }
            groups.add(groupModel);
        }, this);
        this.buildObjectMap();
        this.resolveFieldReferences();
    },

    readKdfParams: function() {
        const kdfParameters = this.db.header.kdfParameters;
        if (!kdfParameters) {
            return undefined;
        }
        let uuid = kdfParameters.get('$UUID');
        if (!uuid) {
            return undefined;
        }
        uuid = kdbxweb.ByteUtils.bytesToBase64(uuid);
        if (uuid !== kdbxweb.Consts.KdfId.Argon2) {
            return undefined;
        }
        return {
            parallelism: kdfParameters.get('P').valueOf(),
            iterations: kdfParameters.get('I').valueOf(),
            memory: kdfParameters.get('M').valueOf()
        };
    },

    subId: function(id) {
        return this.id + ':' + id;
    },

    buildObjectMap: function() {
        const entryMap = {};
        const groupMap = {};
        this.forEachGroup(group => {
            groupMap[group.id] = group;
            group.forEachOwnEntry(null, entry => {
                entryMap[entry.id] = entry;
            });
        }, { includeDisabled: true });
        this.entryMap = entryMap;
        this.groupMap = groupMap;
    },

    resolveFieldReferences: function() {
        const entryMap = this.entryMap;
        Object.keys(entryMap).forEach(e => {
            entryMap[e].resolveFieldReferences();
        });
    },

    reload: function() {
        this.buildObjectMap();
        this.readModel();
        this.trigger('reload', this);
    },

    mergeOrUpdate: function(fileData, remoteKey, callback) {
        let credentials;
        let credentialsPromise = Promise.resolve();
        if (remoteKey) {
            credentials = new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(''));
            credentialsPromise = credentials.ready.then(() => {
                const promises = [];
                if (remoteKey.password) {
                    promises.push(credentials.setPassword(remoteKey.password));
                } else {
                    credentials.passwordHash = this.db.credentials.passwordHash;
                }
                if (remoteKey.keyFileName) {
                    if (remoteKey.keyFileData) {
                        promises.push(credentials.setKeyFile(remoteKey.keyFileData));
                    } else {
                        credentials.keyFileHash = this.db.credentials.keyFileHash;
                    }
                }
                return Promise.all(promises);
            });
        } else {
            credentials = this.db.credentials;
        }
        credentialsPromise.then(() => {
            kdbxweb.Kdbx.load(fileData, credentials)
                .then(remoteDb => {
                    if (this.get('modified')) {
                        try {
                            if (remoteKey && remoteDb.meta.keyChanged > this.db.meta.keyChanged) {
                                this.db.credentials = remoteDb.credentials;
                                this.set('keyFileName', remoteKey.keyFileName || '');
                                if (remoteKey.password) {
                                    this.set('passwordLength', remoteKey.password.textLength);
                                }
                            }
                            this.db.merge(remoteDb);
                        } catch (e) {
                            logger.error('File merge error', e);
                            return callback(e);
                        }
                    } else {
                        this.db = remoteDb;
                    }
                    this.set('dirty', true);
                    this.reload();
                    callback();
                })
                .catch(err => {
                    logger.error('Error opening file to merge', err.code, err.message, err);
                    callback(err);
                });
        });
    },

    getLocalEditState: function() {
        return this.db.getLocalEditState();
    },

    setLocalEditState: function(editState) {
        this.db.setLocalEditState(editState);
    },

    close: function() {
        this.set({
            keyFileName: '',
            passwordLength: 0,
            modified: false,
            dirty: false,
            open: false,
            created: false,
            groups: null,
            passwordChanged: false,
            keyFileChanged: false,
            syncing: false
        });
    },

    getEntry: function(id) {
        return this.entryMap[id];
    },

    getGroup: function(id) {
        return this.groupMap[id];
    },

    forEachEntry: function(filter, callback) {
        let top = this;
        if (filter.trash) {
            top = this.getGroup(this.db.meta.recycleBinUuid ? this.subId(this.db.meta.recycleBinUuid.id) : null);
        } else if (filter.group) {
            top = this.getGroup(filter.group);
        }
        if (top) {
            if (top.forEachOwnEntry) {
                top.forEachOwnEntry(filter, callback);
            }
            if (!filter.group || filter.subGroups) {
                top.forEachGroup(group => {
                    group.forEachOwnEntry(filter, callback);
                }, filter);
            }
        }
    },

    forEachGroup: function(callback, filter) {
        this.get('groups').forEach(group => {
            if (callback(group) !== false) {
                group.forEachGroup(callback, filter);
            }
        });
    },

    getTrashGroup: function() {
        return this.db.meta.recycleBinEnabled ? this.getGroup(this.subId(this.db.meta.recycleBinUuid.id)) : null;
    },

    getEntryTemplatesGroup: function() {
        return this.db.meta.entryTemplatesGroup ? this.getGroup(this.subId(this.db.meta.entryTemplatesGroup.id)) : null;
    },

    createEntryTemplatesGroup: function() {
        const rootGroup = this.get('groups').first();
        const templatesGroup = GroupModel.newGroup(rootGroup, this);
        templatesGroup.setName('Templates');
        this.db.meta.entryTemplatesGroup = templatesGroup.group.uuid;
        this.reload();
        return templatesGroup;
    },

    setModified: function() {
        if (!this.get('demo')) {
            this.set({ modified: true, dirty: true });
            Backbone.trigger('file-modified');
        }
    },

    getData: function(cb) {
        this.db.cleanup({
            historyRules: true,
            customIcons: true,
            binaries: true
        });
        this.db.cleanup({ binaries: true });
        this.db.save()
            .then(data => {
                cb(data);
            })
            .catch(err => {
                logger.error('Error saving file', this.get('name'), err);
                cb(undefined, err);
            });
    },

    getXml: function(cb) {
        this.db.saveXml()
            .then(xml => { cb(xml); });
    },

    getKeyFileHash: function() {
        const hash = this.db.credentials.keyFileHash;
        return hash ? kdbxweb.ByteUtils.bytesToBase64(hash.getBinary()) : null;
    },

    forEachEntryTemplate: function(callback) {
        if (!this.db.meta.entryTemplatesGroup) {
            return;
        }
        const group = this.getGroup(this.subId(this.db.meta.entryTemplatesGroup.id));
        if (!group) {
            return;
        }
        group.forEachOwnEntry({}, callback);
    },

    setSyncProgress: function() {
        this.set({ syncing: true });
    },

    setSyncComplete: function(path, storage, error, savedToCache) {
        if (!error) {
            this.db.removeLocalEditState();
        }
        const modified = this.get('modified') && !!error;
        const dirty = this.get('dirty') && !savedToCache;
        this.set({
            created: false,
            path: path || this.get('path'),
            storage: storage || this.get('storage'),
            modified: modified,
            dirty: dirty,
            syncing: false,
            syncError: error
        });

        const shouldResetFingerprint = this.get('passwordChanged') && this.has('fingerprint');
        if (shouldResetFingerprint && !error) {
            this.set({ fingerprint: null });
        }

        if (!this.get('open')) {
            return;
        }
        this.setOpenFile({ passwordLength: this.get('passwordLength') });
        this.forEachEntry({}, entry => entry.setSaved());
    },

    setPassword: function(password) {
        this.db.credentials.setPassword(password);
        this.db.meta.keyChanged = new Date();
        this.set({ passwordLength: password.textLength, passwordChanged: true });
        this.setModified();
    },

    resetPassword: function() {
        this.db.credentials.passwordHash = this._oldPasswordHash;
        if (this.db.credentials.keyFileHash === this._oldKeyFileHash) {
            this.db.meta.keyChanged = this._oldKeyChangeDate;
        }
        this.set({ passwordLength: this.get('oldPasswordLength'), passwordChanged: false });
    },

    setKeyFile: function(keyFile, keyFileName) {
        this.db.credentials.setKeyFile(keyFile);
        this.db.meta.keyChanged = new Date();
        this.set({ keyFileName: keyFileName, keyFileChanged: true });
        this.setModified();
    },

    generateAndSetKeyFile: function() {
        const keyFile = kdbxweb.Credentials.createRandomKeyFile();
        const keyFileName = 'Generated';
        this.setKeyFile(keyFile, keyFileName);
        return keyFile;
    },

    resetKeyFile: function() {
        this.db.credentials.keyFileHash = this._oldKeyFileHash;
        if (this.db.credentials.passwordHash === this._oldPasswordHash) {
            this.db.meta.keyChanged = this._oldKeyChangeDate;
        }
        this.set({ keyFileName: this.get('oldKeyFileName'), keyFileChanged: false });
    },

    removeKeyFile: function() {
        this.db.credentials.keyFileHash = null;
        const changed = !!this._oldKeyFileHash;
        if (!changed && this.db.credentials.passwordHash === this._oldPasswordHash) {
            this.db.meta.keyChanged = this._oldKeyChangeDate;
        }
        this.set({ keyFileName: '', keyFilePath: '', keyFileChanged: changed });
        Backbone.trigger('unset-keyfile', this.id);
        this.setModified();
    },

    isKeyChangePending: function(force) {
        if (!this.db.meta.keyChanged) {
            return false;
        }
        const expiryDays = force ? this.db.meta.keyChangeForce : this.db.meta.keyChangeRec;
        if (!expiryDays || expiryDays < 0 || isNaN(expiryDays)) {
            return false;
        }
        const daysDiff = (Date.now() - this.db.meta.keyChanged) / 1000 / 3600 / 24;
        return daysDiff > expiryDays;
    },

    setKeyChange: function(force, days) {
        if (isNaN(days) || !days || days < 0) {
            days = -1;
        }
        const prop = force ? 'keyChangeForce' : 'keyChangeRec';
        this.db.meta[prop] = days;
        this.set(prop, days);
        this.setModified();
    },

    setName: function(name) {
        this.db.meta.name = name;
        this.db.meta.nameChanged = new Date();
        this.set('name', name);
        this.get('groups').first().setName(name);
        this.setModified();
        this.reload();
    },

    setDefaultUser: function(defaultUser) {
        this.db.meta.defaultUser = defaultUser;
        this.db.meta.defaultUserChanged = new Date();
        this.set('defaultUser', defaultUser);
        this.setModified();
    },

    setRecycleBinEnabled: function(enabled) {
        enabled = !!enabled;
        this.db.meta.recycleBinEnabled = enabled;
        if (enabled) {
            this.db.createRecycleBin();
        }
        this.set('setRecycleBinEnabled', enabled);
        this.setModified();
    },

    setHistoryMaxItems: function(count) {
        this.db.meta.historyMaxItems = count;
        this.set('historyMaxItems', count);
        this.setModified();
    },

    setHistoryMaxSize: function(size) {
        this.db.meta.historyMaxSize = size;
        this.set('historyMaxSize', size);
        this.setModified();
    },

    setKeyEncryptionRounds: function(rounds) {
        this.db.header.keyEncryptionRounds = rounds;
        this.set('keyEncryptionRounds', rounds);
        this.setModified();
    },

    setKdfParameter: function(field, value) {
        const ValueType = kdbxweb.VarDictionary.ValueType;
        switch (field) {
            case 'memory':
                this.db.header.kdfParameters.set('M', ValueType.UInt64, kdbxweb.Int64.from(value));
                break;
            case 'iterations':
                this.db.header.kdfParameters.set('I', ValueType.UInt64, kdbxweb.Int64.from(value));
                break;
            case 'parallelism':
                this.db.header.kdfParameters.set('P', ValueType.UInt32, value);
                break;
            default:
                return;
        }
        this.set('kdfParameters', this.readKdfParams());
        this.setModified();
    },

    emptyTrash: function() {
        const trashGroup = this.getTrashGroup();
        if (trashGroup) {
            let modified = false;
            trashGroup.getOwnSubGroups().slice().forEach(function(group) {
                this.db.move(group, null);
                modified = true;
            }, this);
            trashGroup.group.entries.forEach(function(entry) {
                this.db.move(entry, null);
                modified = true;
            }, this);
            trashGroup.get('entries').reset();
            if (modified) {
                this.setModified();
            }
        }
    },

    getCustomIcons: function() {
        return _.mapObject(this.db.meta.customIcons, customIcon => IconUrl.toDataUrl(customIcon));
    },

    addCustomIcon: function(iconData) {
        const uuid = kdbxweb.KdbxUuid.random();
        this.db.meta.customIcons[uuid] = kdbxweb.ByteUtils.arrayToBuffer(kdbxweb.ByteUtils.base64ToBytes(iconData));
        return uuid.toString();
    },

    renameTag: function(from, to) {
        this.forEachEntry({}, entry => entry.renameTag(from, to));
    }
});

FileModel.createKeyFileWithHash = function(hash) {
    return kdbxweb.Credentials.createKeyFileWithHash(hash);
};

module.exports = FileModel;

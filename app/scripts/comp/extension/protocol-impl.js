import * as kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { Launcher } from 'comp/launcher';
import { box as tweetnaclBox } from 'tweetnacl';
import { PasswordGenerator } from 'util/generators/password-generator';
import { GeneratorPresets } from 'comp/app/generator-presets';
import { Alerts } from 'comp/ui/alerts';
import { Locale } from 'util/locale';
import { RuntimeInfo } from 'const/runtime-info';
import { KnownAppVersions } from 'const/known-app-versions';
import { ExtensionConnectView } from 'views/extension/extension-connect-view';
import { ExtensionCreateGroupView } from 'views/extension/extension-create-group-view';
import { ExtensionSaveEntryView } from 'views/extension/extension-save-entry-view';
import { RuntimeDataModel } from 'models/runtime-data-model';
import { AppSettingsModel } from 'models/app-settings-model';
import { Timeouts } from 'const/timeouts';
import { SelectEntryView } from 'views/select/select-entry-view';
import { SelectEntryFieldView } from 'views/select/select-entry-field-view';
import { SelectEntryFilter } from 'comp/app/select-entry-filter';

const KeeWebAssociationId = 'KeeWeb';
const KeeWebHash = '398d9c782ec76ae9e9877c2321cbda2b31fc6d18ccf0fed5ca4bd746bab4d64a'; // sha256('KeeWeb')
const ExtensionGroupIconId = 1;
const DefaultExtensionGroupName = 'Browser';
const ExtensionGroupNames = new Set(['KeePassXC-Browser Passwords', DefaultExtensionGroupName]);

const Errors = {
    noOpenFiles: {
        message: Locale.extensionErrorNoOpenFiles,
        code: '1'
    },
    userRejected: {
        message: Locale.extensionErrorUserRejected,
        code: '6'
    },
    noMatches: {
        message: Locale.extensionErrorNoMatches,
        code: '15'
    }
};

const connectedClients = new Map();

let logger;
let appModel;
let sendEvent;

function setupListeners() {
    Events.on('file-opened', () => {
        sendEvent({ action: 'database-unlocked' });
    });
    Events.on('one-file-closed', () => {
        if (!appModel.files.hasOpenFiles()) {
            sendEvent({ action: 'database-locked' });
        }
    });
    Events.on('all-files-closed', () => {
        sendEvent({ action: 'database-locked' });
    });
}

function incrementNonce(nonce) {
    // from libsodium/utils.c, like it is in KeePassXC
    let i = 0;
    let c = 1;
    for (; i < nonce.length; ++i) {
        c += nonce[i];
        nonce[i] = c;
        c >>= 8;
    }
}

function getClient(request) {
    if (!request.clientID) {
        throw new Error('Empty clientID');
    }
    const client = connectedClients.get(request.clientID);
    if (!client) {
        throw new Error(`Client not connected: ${request.clientID}`);
    }
    return client;
}

function decryptRequest(request) {
    const client = getClient(request);

    if (!request.nonce) {
        throw new Error('Empty nonce');
    }
    if (!request.message) {
        throw new Error('Empty message');
    }

    const nonce = kdbxweb.ByteUtils.base64ToBytes(request.nonce);
    const message = kdbxweb.ByteUtils.base64ToBytes(request.message);

    const data = tweetnaclBox.open(message, nonce, client.publicKey, client.keys.secretKey);
    if (!data) {
        throw new Error('Failed to decrypt data');
    }

    const json = new TextDecoder().decode(data);
    const payload = JSON.parse(json);

    logger.debug('Extension -> KeeWeb -> (decrypted)', payload);

    if (!payload) {
        throw new Error('Empty request payload');
    }
    if (payload.action !== request.action) {
        throw new Error(`Bad action in decrypted payload`);
    }

    return payload;
}

function encryptResponse(request, payload) {
    logger.debug('KeeWeb -> Extension (decrypted)', payload);

    const nonceBytes = kdbxweb.ByteUtils.base64ToBytes(request.nonce);
    incrementNonce(nonceBytes);
    const nonce = kdbxweb.ByteUtils.bytesToBase64(nonceBytes);

    const client = getClient(request);

    payload.nonce = nonce;

    const json = JSON.stringify(payload);
    const data = new TextEncoder().encode(json);

    const encrypted = tweetnaclBox(data, nonceBytes, client.publicKey, client.keys.secretKey);

    const message = kdbxweb.ByteUtils.bytesToBase64(encrypted);

    return {
        action: request.action,
        message,
        nonce
    };
}

function makeError(def) {
    const e = new Error(def.message);
    e.code = def.code;
    return e;
}

function ensureAtLeastOneFileIsOpen() {
    if (!appModel.files.hasOpenFiles()) {
        throw makeError(Errors.noOpenFiles);
    }
}

async function checkContentRequestPermissions(request) {
    if (!appModel.files.hasOpenFiles()) {
        if (AppSettingsModel.extensionFocusIfLocked) {
            try {
                focusKeeWeb();
                await appModel.unlockAnyFile(
                    'extensionUnlockMessage',
                    Timeouts.KeeWebConnectRequest
                );
            } catch {
                throw makeError(Errors.noOpenFiles);
            }
        } else {
            throw makeError(Errors.noOpenFiles);
        }
    }

    const client = getClient(request);
    if (client.permissions) {
        return;
    }

    if (Alerts.alertDisplayed) {
        throw new Error(Locale.extensionErrorAlertDisplayed);
    }

    focusKeeWeb();

    const config = RuntimeDataModel.extensionConnectConfig;
    const files = appModel.files.map((f) => ({
        id: f.id,
        name: f.name,
        checked: !config || config.allFiles || config.files.includes(f.id)
    }));
    if (!files.some((f) => f.checked)) {
        for (const f of files) {
            f.checked = true;
        }
    }

    const extensionConnectView = new ExtensionConnectView({
        extensionName: getHumanReadableExtensionName(client),
        identityVerified: !Launcher,
        files,
        allFiles: config?.allFiles ?? true,
        askGet: config?.askGet || 'multiple'
    });

    try {
        await alertWithTimeout({
            header: Locale.extensionConnectHeader,
            icon: 'right-left',
            buttons: [Alerts.buttons.allow, Alerts.buttons.deny],
            view: extensionConnectView,
            wide: true,
            opaque: true
        });
    } catch (e) {
        client.permissionsDenied = true;
        Events.emit('browser-extension-sessions-changed');
        throw e;
    }

    RuntimeDataModel.extensionConnectConfig = extensionConnectView.config;
    client.permissions = extensionConnectView.config;
    Events.emit('browser-extension-sessions-changed');
}

function alertWithTimeout(config) {
    return new Promise((resolve, reject) => {
        let inactivityTimer = 0;

        const alert = Alerts.alert({
            ...config,
            enter: 'yes',
            esc: '',
            success: (res) => {
                clearTimeout(inactivityTimer);
                resolve(res);
            },
            cancel: () => {
                clearTimeout(inactivityTimer);
                reject(makeError(Errors.userRejected));
            }
        });

        inactivityTimer = setTimeout(() => {
            alert.closeWithResult('');
        }, Timeouts.KeeWebConnectRequest);
    });
}

function getAvailableFiles(request) {
    const client = getClient(request);
    if (!client.permissions) {
        return;
    }

    const files = appModel.files.filter(
        (file) =>
            file.active &&
            (client.permissions.allFiles || client.permissions.files.includes(file.id))
    );
    if (!files.length) {
        throw makeError(Errors.noOpenFiles);
    }

    return files;
}

function getVersion(request) {
    return isKeePassXcBrowser(request) ? KnownAppVersions.KeePassXC : RuntimeInfo.version;
}

function isKeeWebConnect(request) {
    return getClient(request).connection.extensionName === 'KeeWeb Connect';
}

function isKeePassXcBrowser(request) {
    return getClient(request).connection.extensionName === 'KeePassXC-Browser';
}

function getHumanReadableExtensionName(client) {
    return client.connection.appName
        ? `${client.connection.extensionName} (${client.connection.appName})`
        : client.connection.extensionName;
}

function focusKeeWeb() {
    logger.debug('Focus KeeWeb');
    if (Launcher) {
        if (!Launcher.isAppFocused()) {
            Launcher.showMainWindow();
        }
    } else {
        sendEvent({ action: 'attention-required' });
    }
}

async function findEntry(request, returnIfOneMatch, filterOptions) {
    const payload = decryptRequest(request);
    await checkContentRequestPermissions(request);

    if (!payload.url) {
        throw new Error('Empty url');
    }

    const files = getAvailableFiles(request);
    const client = getClient(request);

    const filter = new SelectEntryFilter(
        { url: payload.url, title: payload.title },
        appModel,
        files,
        filterOptions
    );
    filter.subdomains = false;

    let entries = filter.getEntries();

    filter.subdomains = true;

    let entry;

    if (entries.length) {
        if (entries.length === 1 && returnIfOneMatch && client.permissions.askGet === 'multiple') {
            entry = entries[0];
        }
    } else {
        entries = filter.getEntries();

        if (!entries.length) {
            if (AppSettingsModel.extensionFocusIfEmpty) {
                filter.useUrl = false;
                if (filter.title && AppSettingsModel.autoTypeTitleFilterEnabled) {
                    filter.useTitle = true;
                    entries = filter.getEntries();
                    if (!entries.length) {
                        filter.useTitle = false;
                    }
                }
            } else {
                throw makeError(Errors.noMatches);
            }
        }
    }

    if (!entry) {
        const extName = getHumanReadableExtensionName(client);
        const topMessage = Locale.extensionSelectPasswordFor.replace('{}', extName);
        const selectEntryView = new SelectEntryView({ filter, topMessage });

        focusKeeWeb();

        const inactivityTimer = setTimeout(() => {
            selectEntryView.emit('result', undefined);
        }, Timeouts.KeeWebConnectRequest);

        const result = await selectEntryView.showAndGetResult();

        clearTimeout(inactivityTimer);

        entry = result?.entry;
        if (!entry) {
            throw makeError(Errors.userRejected);
        }
    }

    client.stats.passwordsRead++;

    return entry;
}

const ProtocolHandlers = {
    'ping'({ data }) {
        return { data };
    },

    'change-public-keys'(request, connection) {
        // eslint-disable-next-line prefer-const
        let { publicKey, version, clientID: clientId } = request;

        if (connectedClients.has(clientId)) {
            throw new Error('Changing keys is not allowed');
        }

        if (!Launcher) {
            // on web there can be only one connected client
            connectedClients.clear();
        }

        const keys = tweetnaclBox.keyPair();
        publicKey = kdbxweb.ByteUtils.base64ToBytes(publicKey);

        const stats = {
            connectedDate: new Date(),
            passwordsRead: 0,
            passwordsWritten: 0
        };

        connectedClients.set(clientId, { connection, publicKey, version, keys, stats });

        Events.emit('browser-extension-sessions-changed');

        logger.info('New client key created', clientId, version);

        const nonceBytes = kdbxweb.ByteUtils.base64ToBytes(request.nonce);
        incrementNonce(nonceBytes);
        const nonce = kdbxweb.ByteUtils.bytesToBase64(nonceBytes);

        return {
            action: 'change-public-keys',
            version: getVersion(request),
            publicKey: kdbxweb.ByteUtils.bytesToBase64(keys.publicKey),
            nonce,
            success: 'true',
            ...(isKeeWebConnect(request) ? { appName: 'KeeWeb' } : undefined)
        };
    },

    async 'get-databasehash'(request) {
        decryptRequest(request);

        if (request.triggerUnlock) {
            await checkContentRequestPermissions(request);
        } else {
            ensureAtLeastOneFileIsOpen();
        }

        return encryptResponse(request, {
            hash: KeeWebHash,
            success: 'true',
            version: getVersion(request)
        });
    },

    'generate-password'(request) {
        const password = PasswordGenerator.generate(GeneratorPresets.browserExtensionPreset);

        return encryptResponse(request, {
            version: getVersion(request),
            success: 'true',
            entries: [{ password }]
        });
    },

    'lock-database'(request) {
        decryptRequest(request);
        ensureAtLeastOneFileIsOpen();

        Events.emit('lock-workspace');

        if (Alerts.alertDisplayed) {
            focusKeeWeb();
        }

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request)
        });
    },

    'associate'(request) {
        decryptRequest(request);
        ensureAtLeastOneFileIsOpen();

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            hash: KeeWebHash,
            id: KeeWebAssociationId
        });
    },

    'test-associate'(request) {
        const payload = decryptRequest(request);
        // ensureAtLeastOneFileIsOpen();

        if (payload.id !== KeeWebAssociationId) {
            throw makeError(Errors.noOpenFiles);
        }

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            hash: KeeWebHash,
            id: payload.id
        });
    },

    async 'get-logins'(request) {
        const entry = await findEntry(request, true);

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            hash: KeeWebHash,
            count: 1,
            entries: [
                {
                    group: entry.group.title,
                    login: entry.user || '',
                    name: entry.title || '',
                    password: entry.password?.getText() || '',
                    skipAutoSubmit: 'false',
                    stringFields: [],
                    uuid: kdbxweb.ByteUtils.bytesToHex(entry.entry.uuid.bytes)
                }
            ],
            id: ''
        });
    },

    async 'get-totp-by-url'(request) {
        const entry = await findEntry(request, true, { otp: true });

        entry.initOtpGenerator();

        if (!entry.otpGenerator) {
            throw makeError(Errors.noMatches);
        }

        let selectEntryFieldView;
        if (entry.needsTouch) {
            selectEntryFieldView = new SelectEntryFieldView({
                needsTouch: true,
                deviceShortName: entry.device.shortName
            });
            selectEntryFieldView.render();
        }

        const otpPromise = new Promise((resolve, reject) => {
            selectEntryFieldView?.on('result', () => reject(makeError(Errors.userRejected)));
            entry.otpGenerator.next((err, otp) => {
                if (otp) {
                    resolve(otp);
                } else {
                    reject(err || makeError(Errors.userRejected));
                }
            });
        });

        let totp;
        try {
            totp = await otpPromise;
        } finally {
            selectEntryFieldView?.remove();
        }

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            totp
        });
    },

    async 'get-any-field'(request) {
        const entry = await findEntry(request, false);

        const selectEntryFieldView = new SelectEntryFieldView({
            entry
        });
        const inactivityTimer = setTimeout(() => {
            selectEntryFieldView.emit('result', undefined);
        }, Timeouts.KeeWebConnectRequest);

        const field = await selectEntryFieldView.showAndGetResult();

        clearTimeout(inactivityTimer);

        if (!field) {
            throw makeError(Errors.userRejected);
        }

        let value = entry.getAllFields()[field];
        if (value.isProtected) {
            value = value.getText();
        }

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            field,
            value
        });
    },

    async 'get-totp'(request) {
        decryptRequest(request);
        await checkContentRequestPermissions(request);

        throw new Error('Not implemented');
    },

    async 'set-login'(request) {
        const payload = decryptRequest(request);
        await checkContentRequestPermissions(request);

        focusKeeWeb();

        if (!payload.url) {
            throw new Error('Empty url');
        }
        const url = new URL(payload.url);

        const files = getAvailableFiles(request);
        const client = getClient(request);

        let selectedGroup;

        let entryToUpdate;
        if (payload.uuid) {
            for (const file of files) {
                const entryId = kdbxweb.ByteUtils.bytesToBase64(
                    kdbxweb.ByteUtils.hexToBytes(payload.uuid)
                );
                const foundEntry = file.getEntry(file.subId(entryId));
                if (foundEntry) {
                    if (entryToUpdate) {
                        throw new Error('Two entries with the same ID found');
                    } else {
                        entryToUpdate = foundEntry;
                        selectedGroup = foundEntry.group;
                    }
                }
            }
            if (!entryToUpdate) {
                throw new Error('Updated entry not found');
            }
        }

        if (client.permissions.askSave === 'auto' && client.permissions.saveTo && !selectedGroup) {
            const file = files.find((f) => f.id === client.permissions.saveTo.fileId);
            selectedGroup = file?.getGroup(client.permissions.saveTo.groupId);
        }

        if (client.permissions.askSave !== 'auto' || !selectedGroup) {
            if (!selectedGroup && RuntimeDataModel.extensionSaveConfig) {
                const file = files.find(
                    (f) => f.id === RuntimeDataModel.extensionSaveConfig.fileId
                );
                selectedGroup = file?.getGroup(RuntimeDataModel.extensionSaveConfig.groupId);
            }

            const allGroups = [];
            for (const file of files) {
                file.forEachGroup((group) => {
                    const spaces = [];
                    for (let parent = group; parent.parentGroup; parent = parent.parentGroup) {
                        spaces.push(' ', ' ');
                    }

                    if (
                        !selectedGroup &&
                        group.iconId === ExtensionGroupIconId &&
                        ExtensionGroupNames.has(group.title)
                    ) {
                        selectedGroup = group;
                    }

                    allGroups.push({
                        id: group.id,
                        fileId: file.id,
                        spaces,
                        title: group.title,
                        selected: group.id === selectedGroup?.id
                    });
                });
            }
            if (!selectedGroup) {
                allGroups.splice(1, 0, {
                    id: '',
                    fileId: files[0].id,
                    spaces: [' ', ' '],
                    title: `${DefaultExtensionGroupName} (${Locale.extensionSaveEntryNewGroup})`,
                    selected: true
                });
            }

            const saveEntryView = new ExtensionSaveEntryView({
                extensionName: getHumanReadableExtensionName(client),
                url: payload.url,
                user: payload.login,
                askSave: RuntimeDataModel.extensionSaveConfig?.askSave || 'always',
                update: !!entryToUpdate,
                allGroups
            });

            await alertWithTimeout({
                header: Locale.extensionSaveEntryHeader,
                icon: 'plus',
                buttons: [Alerts.buttons.allow, Alerts.buttons.deny],
                view: saveEntryView
            });

            const config = { ...saveEntryView.config };
            if (!entryToUpdate) {
                if (config.groupId) {
                    const file = files.find((f) => f.id === config.fileId);
                    selectedGroup = file.getGroup(config.groupId);
                } else {
                    selectedGroup = appModel.createNewGroupWithName(
                        files[0].groups[0],
                        files[0],
                        DefaultExtensionGroupName
                    );
                    selectedGroup.setIcon(ExtensionGroupIconId);
                    config.groupId = selectedGroup.id;
                }

                RuntimeDataModel.extensionSaveConfig = config;
                client.permissions.saveTo = { fileId: config.fileId, groupId: config.groupId };
            }

            client.permissions.askSave = config.askSave;
        }

        const entryFields = {
            Title: url.hostname,
            UserName: payload.login,
            Password: kdbxweb.ProtectedValue.fromString(payload.password || ''),
            URL: payload.url
        };

        if (entryToUpdate) {
            for (const [field, value] of Object.entries(entryFields)) {
                if (value) {
                    entryToUpdate.setField(field, value);
                }
            }
        } else {
            appModel.createNewEntryWithFields(selectedGroup, entryFields);
        }

        client.stats.passwordsWritten++;

        Events.emit('browser-extension-sessions-changed');
        Events.emit('refresh');

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            count: null,
            entries: null,
            hash: KeeWebHash
        });
    },

    async 'get-database-groups'(request) {
        decryptRequest(request);
        await checkContentRequestPermissions(request);

        const makeGroups = (group) => {
            const res = {
                name: group.title,
                uuid: kdbxweb.ByteUtils.bytesToHex(group.group.uuid.bytes),
                children: []
            };
            for (const subGroup of group.items) {
                if (subGroup.matches()) {
                    res.children.push(makeGroups(subGroup));
                }
            }
            return res;
        };

        const groups = [];
        for (const file of getAvailableFiles(request)) {
            for (const group of file.groups) {
                groups.push(makeGroups(group));
            }
        }

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            groups: { groups }
        });
    },

    async 'create-new-group'(request) {
        const payload = decryptRequest(request);
        await checkContentRequestPermissions(request);

        if (!payload.groupName) {
            throw new Error('No groupName');
        }

        const groupNames = payload.groupName
            .split('/')
            .map((g) => g.trim())
            .filter((g) => g);

        if (!groupNames.length) {
            throw new Error('Empty group path');
        }

        const files = getAvailableFiles(request);

        for (const file of files) {
            for (const rootGroup of file.groups) {
                let foundGroup = rootGroup;
                const pendingGroups = [...groupNames];
                while (pendingGroups.length && foundGroup) {
                    const title = pendingGroups.shift();
                    foundGroup = foundGroup.items.find((g) => g.title === title);
                }
                if (foundGroup) {
                    return encryptResponse(request, {
                        success: 'true',
                        version: getVersion(request),
                        name: foundGroup.title,
                        uuid: kdbxweb.ByteUtils.bytesToHex(foundGroup.group.uuid.bytes)
                    });
                }
            }
        }

        const client = getClient(request);
        const createGroupView = new ExtensionCreateGroupView({
            extensionName: getHumanReadableExtensionName(client),
            groupPath: groupNames.join(' / '),
            files: files.map((f, ix) => ({ id: f.id, name: f.name, selected: ix === 0 }))
        });

        await alertWithTimeout({
            header: Locale.extensionNewGroupHeader,
            icon: 'folder-plus',
            buttons: [Alerts.buttons.allow, Alerts.buttons.deny],
            view: createGroupView
        });

        const selectedFile = files.find((f) => f.id === createGroupView.selectedFile);

        let newGroup = selectedFile.groups[0];
        const pendingGroups = [...groupNames];

        while (pendingGroups.length) {
            const title = pendingGroups.shift();
            const item = newGroup.items.find((g) => g.title === title);
            if (item) {
                newGroup = item;
            } else {
                newGroup = appModel.createNewGroupWithName(newGroup, selectedFile, title);
            }
        }

        return encryptResponse(request, {
            success: 'true',
            version: getVersion(request),
            name: newGroup.title,
            uuid: kdbxweb.ByteUtils.bytesToHex(newGroup.group.uuid.bytes)
        });
    }
};

const ProtocolImpl = {
    init(vars) {
        appModel = vars.appModel;
        logger = vars.logger;
        sendEvent = vars.sendEvent;

        setupListeners();
    },

    cleanup() {
        const wasNotEmpty = connectedClients.size;

        connectedClients.clear();

        if (wasNotEmpty) {
            Events.emit('browser-extension-sessions-changed');
        }
    },

    deleteConnection(connectionId) {
        for (const [clientId, client] of connectedClients.entries()) {
            if (client.connection.connectionId === connectionId) {
                connectedClients.delete(clientId);
            }
        }
        Events.emit('browser-extension-sessions-changed');
    },

    getClientPermissions(clientId) {
        return connectedClients.get(clientId)?.permissions;
    },

    setClientPermissions(clientId, permissions) {
        const client = connectedClients.get(clientId);
        if (client?.permissions) {
            client.permissions = { ...client.permissions, ...permissions };
        }
    },

    errorToResponse(e, request) {
        return {
            action: request?.action,
            error: e.message || 'Unknown error',
            errorCode: e.code || 0
        };
    },

    async handleRequest(request, connectionInfo) {
        const appWindowWasFocused = Launcher?.isAppFocused();

        let result;
        try {
            const handler = ProtocolHandlers[request.action];
            if (!handler) {
                throw new Error(`Handler not found: ${request.action}`);
            }
            result = await handler(request, connectionInfo);
            if (!result) {
                throw new Error(`Handler returned an empty result: ${request.action}`);
            }
        } catch (e) {
            if (!e.code) {
                logger.error(`Error in handler ${request.action}`, e);
            }
            result = this.errorToResponse(e, request);
        }

        if (!appWindowWasFocused && Launcher?.isAppFocused()) {
            Launcher.hideApp();
        }

        return result;
    },

    get sessions() {
        return [...connectedClients.entries()]
            .map(([clientId, client]) => ({
                clientId,
                connectionId: client.connection.connectionId,
                appName: client.connection.appName,
                extensionName: client.connection.extensionName,
                connectedDate: client.stats.connectedDate,
                passwordsRead: client.stats.passwordsRead,
                passwordsWritten: client.stats.passwordsWritten,
                permissions: client.permissions,
                permissionsDenied: client.permissionsDenied
            }))
            .sort((x, y) => y.connectedDate - x.connectedDate);
    }
};

export { ProtocolImpl };

import kdbxweb from 'kdbxweb';
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
import { RuntimeDataModel } from 'models/runtime-data-model';
import { AppSettingsModel } from 'models/app-settings-model';
import { Timeouts } from 'const/timeouts';

const KeeWebAssociationId = 'KeeWeb';
const KeeWebHash = '398d9c782ec76ae9e9877c2321cbda2b31fc6d18ccf0fed5ca4bd746bab4d64a'; // sha256('KeeWeb')

const Errors = {
    noOpenFiles: {
        message: Locale.extensionErrorNoOpenFiles,
        code: '1'
    },
    userRejected: {
        message: Locale.extensionErrorUserRejected,
        code: '6'
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
                Launcher?.hideApp();
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

    return new Promise((resolve, reject) => {
        if (Alerts.alertDisplayed) {
            return reject(new Error(Locale.extensionErrorAlertDisplayed));
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

        const extensionName = client.connection.appName
            ? `${client.connection.extensionName} (${client.connection.appName})`
            : client.connection.extensionName;

        const extensionConnectView = new ExtensionConnectView({
            extensionName,
            identityVerified: !Launcher,
            files,
            allFiles: config?.allFiles ?? true,
            askGet: config?.askGet || 'multiple'
        });

        let inactivityTimer = 0;

        const alert = Alerts.alert({
            header: Locale.extensionConnectHeader,
            icon: 'exchange-alt',
            view: extensionConnectView,
            wide: true,
            opaque: true,
            buttons: [Alerts.buttons.allow, Alerts.buttons.deny],
            success: () => {
                clearTimeout(inactivityTimer);
                RuntimeDataModel.extensionConnectConfig = extensionConnectView.config;
                client.permissions = extensionConnectView.config;
                Events.emit('browser-extension-sessions-changed');
                resolve();
            },
            cancel: () => {
                client.permissionsDenied = true;
                clearTimeout(inactivityTimer);
                Events.emit('browser-extension-sessions-changed');
                reject(makeError(Errors.userRejected));
            }
        });

        inactivityTimer = setTimeout(() => {
            alert.closeWithResult('');
        }, Timeouts.KeeWebConnectRequest);
    }).catch((e) => {
        Launcher?.hideApp();
        throw e;
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
    const extensionName = getClient(request).connection.extensionName;
    return extensionName ? RuntimeInfo.version : KnownAppVersions.KeePassXC;
}

function isKeeWebConnect(request) {
    return getClient(request).connection.extensionName === 'KeeWeb Connect';
}

function focusKeeWeb() {
    logger.debug('Focus KeeWeb');
    if (Launcher) {
        Launcher.showMainWindow();
    } else {
        sendEvent({ action: 'attention-required' });
    }
}

const ProtocolHandlers = {
    'ping'({ data }) {
        return { data };
    },

    'change-public-keys'(request, connection) {
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

    'get-databasehash'(request) {
        decryptRequest(request);
        ensureAtLeastOneFileIsOpen();

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
        decryptRequest(request);
        await checkContentRequestPermissions(request);

        throw new Error('Not implemented');
    },

    async 'get-totp'(request) {
        decryptRequest(request);
        await checkContentRequestPermissions(request);

        throw new Error('Not implemented');
    },

    async 'set-login'(request) {
        decryptRequest(request);
        await checkContentRequestPermissions(request);

        throw new Error('Not implemented');
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

        // TODO: show file selector
        // throw makeError(Errors.userRejected);

        const groupNames = payload.groupName
            .split('/')
            .map((g) => g.trim())
            .filter((g) => g);

        if (!groupNames.length) {
            throw new Error('Empty group path');
        }

        // TODO: create a new group
        throw new Error('Not implemented');

        // return encryptResponse(request, {
        //     success: 'true',
        //     version: getVersion(request),
        //     name: groupNames[groupNames.length - 1],
        //     uuid: kdbxweb.ByteUtils.bytesToHex(appModel.files[0].groups[0].group.uuid.bytes)
        // });
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
        try {
            const handler = ProtocolHandlers[request.action];
            if (!handler) {
                throw new Error(`Handler not found: ${request.action}`);
            }
            return await handler(request, connectionInfo);
        } catch (e) {
            return this.errorToResponse(e, request);
        }
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

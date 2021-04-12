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

let logger;
let appModel;
let connectedClients;
let sendEvent;

function initProtocolHandlers(vars) {
    appModel = vars.appModel;
    logger = vars.logger;
    connectedClients = vars.connectedClients;
    sendEvent = vars.sendEvent;
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

function checkContentRequestPermissions(request) {
    ensureAtLeastOneFileIsOpen();

    const client = getClient(request);
    if (client.authorized) {
        return;
    }

    return new Promise((resolve, reject) => {
        if (Alerts.alertDisplayed) {
            return reject(new Error(Locale.extensionErrorAlertDisplayed));
        }

        focusKeeWeb();

        // TODO: make a proper dialog here instead of a simple question

        if (Launcher) {
            Alerts.yesno({
                header: 'Extension connection',
                body: 'Allow this extension to connect?',
                success: () => {
                    resolve();
                },
                cancel: () => reject(makeError(Errors.userRejected))
            });
        } else {
            // it's 'confirm' here because other browser extensions can't interact with browser alerts
            //  while they can easily press a button on our alert
            // eslint-disable-next-line no-alert
            const allowed = confirm('Allow this extension to connect?');
            if (allowed) {
                resolve();
            } else {
                reject(makeError(Errors.userRejected));
            }
        }
    })
        .then(() => {
            client.authorized = true;
            Launcher.hideApp();
        })
        .catch((e) => {
            Launcher.hideApp();
            throw e;
        });
}

function getVersion(request) {
    const extensionName = getClient(request).extensionName;
    return extensionName ? RuntimeInfo.version : KnownAppVersions.KeePassXC;
}

function isKeeWebConnect(request) {
    return getClient(request).extensionName === 'keeweb-connect';
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

    'change-public-keys'(request) {
        let { publicKey, extensionName, version, clientID: clientId } = request;

        if (connectedClients.has(clientId)) {
            throw new Error('Changing keys is not allowed');
        }

        if (!Launcher) {
            // on web there can be only one connected client
            connectedClients.clear();
        }

        const keys = tweetnaclBox.keyPair();
        publicKey = kdbxweb.ByteUtils.base64ToBytes(publicKey);

        connectedClients.set(clientId, { publicKey, extensionName, version, keys });

        logger.info('New client key created', clientId, extensionName, version);

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
        ensureAtLeastOneFileIsOpen();

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
        for (const file of appModel.files.filter((f) => f.active)) {
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

export { ProtocolHandlers, initProtocolHandlers };

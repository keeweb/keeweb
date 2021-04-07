import kdbxweb from 'kdbxweb';
import { box as tweetnaclBox } from 'tweetnacl';
import { Events } from 'framework/events';
import { RuntimeInfo } from 'const/runtime-info';
import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';
import { AppModel } from 'models/app-model';

const connectedClients = {};

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
    const client = connectedClients[request.clientID];
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

    if (payload?.action !== request.action) {
        throw new Error(`Bad action in decrypted payload`);
    }

    return payload;
}

function encryptResponse(request, payload) {
    const client = getClient(request);

    const json = JSON.stringify(payload);
    const data = new TextEncoder().encode(json);

    let nonce = kdbxweb.ByteUtils.base64ToBytes(request.nonce);
    incrementNonce(nonce);

    const encrypted = tweetnaclBox(data, nonce, client.publicKey, client.keys.secretKey);

    const message = kdbxweb.ByteUtils.bytesToBase64(encrypted);
    nonce = kdbxweb.ByteUtils.bytesToBase64(nonce);

    return {
        action: request.action,
        message,
        nonce
    };
}

const ProtocolHandlers = {
    'ping'({ data }) {
        return { data };
    },

    'change-public-keys'({ publicKey, clientID: clientId }) {
        const keys = tweetnaclBox.keyPair();
        publicKey = kdbxweb.ByteUtils.base64ToBytes(publicKey);

        connectedClients[clientId] = { publicKey, keys };

        return {
            action: 'change-public-keys',
            version: RuntimeInfo.version,
            appName: 'KeeWeb',
            publicKey: kdbxweb.ByteUtils.bytesToBase64(keys.publicKey),
            success: 'true'
        };
    },

    'get-databasehash'(request) {
        decryptRequest(request);

        const firstFile = AppModel.instance.files.firstActiveKdbxFile();
        if (firstFile?.defaultGroupHash) {
            return encryptResponse(request, {
                action: 'hash',
                version: RuntimeInfo.version,
                hash: firstFile.defaultGroupHash,
                hashes: AppModel.instance.files
                    .filter((file) => file.active && !file.backend)
                    .map((file) => file.defaultGroupHash)
            });
        } else {
            return { action: 'get-databasehash', error: 'No open files', errorCode: '1' };
        }
    },

    'lock-database'(request) {
        decryptRequest(request);

        Events.emit('lock-workspace');

        return encryptResponse(request, {
            action: 'lock-database',
            error: 'No open files',
            errorCode: '1'
        });
    }
};

const BrowserExtensionConnector = {
    enabled: false,

    init() {
        this.browserWindowMessage = this.browserWindowMessage.bind(this);
        this.fileOpened = this.fileOpened.bind(this);
        this.oneFileClosed = this.oneFileClosed.bind(this);
        this.allFilesClosed = this.allFilesClosed.bind(this);

        AppSettingsModel.on('change:browserExtension', (model, enabled) => {
            this.enabled = enabled;
            if (enabled) {
                this.start();
            } else {
                this.stop();
            }
        });
        if (AppSettingsModel.browserExtension) {
            this.enabled = true;
            this.start();
        }
    },

    start() {
        if (!Launcher) {
            this.startWebMessageListener();
        }
        Events.on('file-opened', this.fileOpened);
        Events.on('one-file-closed', this.oneFileClosed);
        Events.on('all-files-closed', this.allFilesClosed);
    },

    stop() {
        if (!Launcher) {
            this.stopWebMessageListener();
        }
        Events.off('file-opened', this.fileOpened);
        Events.off('one-file-closed', this.oneFileClosed);
        Events.off('all-files-closed', this.allFilesClosed);
    },

    startWebMessageListener() {
        window.addEventListener('message', this.browserWindowMessage);
    },

    stopWebMessageListener() {
        window.removeEventListener('message', this.browserWindowMessage);
    },

    browserWindowMessage(e) {
        if (e.origin !== location.origin) {
            return;
        }
        if (e.source !== window) {
            return;
        }
        if (e?.data?.kwConnect !== 'request') {
            return;
        }
        let response;
        try {
            const handler = ProtocolHandlers[e.data.action];
            if (!handler) {
                throw new Error(`Handler not found: ${e.data.action}`);
            }
            response = handler(e.data) || {};
        } catch (e) {
            response = { error: e.message || 'Unknown error' };
        }
        if (response) {
            this.sendResponse(response);
        }
    },

    sendResponse(response) {
        response.kwConnect = 'response';
        postMessage(response, window.location.origin);
    },

    fileOpened() {
        this.sendResponse({ action: 'database-unlocked' });
    },

    oneFileClosed() {
        this.sendResponse({ action: 'database-locked' });
        if (AppModel.instance.files.hasOpenFiles()) {
            this.sendResponse({ action: 'database-unlocked' });
        }
    },

    allFilesClosed() {
        this.sendResponse({ action: 'database-locked' });
    }
};

export { BrowserExtensionConnector };

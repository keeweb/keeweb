import kdbxweb from 'kdbxweb';
import { box as tweetnaclBox } from 'tweetnacl';
import { Events } from 'framework/events';
import { RuntimeInfo } from 'const/runtime-info';
import { KnownAppVersions } from 'const/known-app-versions';
import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';
import { Alerts } from 'comp/ui/alerts';
import { PasswordGenerator } from 'util/generators/password-generator';
import { GeneratorPresets } from 'comp/app/generator-presets';

let appModel;
const connectedClients = {};
const MaxIncomingDataLength = 10000;

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

    if (!payload) {
        throw new Error('Empty request payload');
    }
    if (payload.action !== request.action) {
        throw new Error(`Bad action in decrypted payload`);
    }

    return payload;
}

function encryptResponse(request, payload) {
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

function getVersion(request) {
    const extensionName = getClient(request).extensionName;
    return extensionName ? RuntimeInfo.version : KnownAppVersions.KeePassXC;
}

function isKeeWebConnect(request) {
    return getClient(request).extensionName === 'keeweb-connect';
}

const ProtocolHandlers = {
    'ping'({ data }) {
        return { data };
    },

    'change-public-keys'(request) {
        let { publicKey, extensionName, clientID: clientId } = request;

        const keys = tweetnaclBox.keyPair();
        publicKey = kdbxweb.ByteUtils.base64ToBytes(publicKey);

        connectedClients[clientId] = { publicKey, extensionName, keys };

        return {
            action: 'change-public-keys',
            version: getVersion(request),
            appName: 'KeeWeb',
            publicKey: kdbxweb.ByteUtils.bytesToBase64(keys.publicKey),
            success: 'true'
        };
    },

    'get-databasehash'(request) {
        decryptRequest(request);

        const firstFile = appModel.files.firstActiveKdbxFile();
        if (firstFile?.defaultGroupHash) {
            return encryptResponse(request, {
                action: 'hash',
                version: getVersion(request),
                hash: firstFile.defaultGroupHash,
                ...(isKeeWebConnect(request)
                    ? {
                          hashes: appModel.files
                              .filter((file) => file.active && !file.backend)
                              .map((file) => file.defaultGroupHash)
                      }
                    : undefined)
            });
        } else {
            return { action: 'get-databasehash', error: 'No open files', errorCode: '1' };
        }
    },

    'generate-password'(request) {
        const password = PasswordGenerator.generate(GeneratorPresets.browserExtensionPreset);

        return encryptResponse(request, {
            action: 'generate-password',
            version: getVersion(request),
            success: 'true',
            entries: [
                {
                    login: Math.random() * 200,
                    password
                }
            ]
        });
    },

    'lock-database'(request) {
        decryptRequest(request);

        Events.emit('lock-workspace');

        if (Alerts.alertDisplayed) {
            BrowserExtensionConnector.focusKeeWeb();
        }

        return encryptResponse(request, {
            action: 'lock-database',
            error: 'No open files',
            errorCode: '1'
        });
    }
};

const BrowserExtensionConnector = {
    enabled: false,

    init(model) {
        appModel = model;

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
        if (Launcher) {
            this.startDesktopAppListener();
        } else {
            this.startWebMessageListener();
        }
        Events.on('file-opened', this.fileOpened);
        Events.on('one-file-closed', this.oneFileClosed);
        Events.on('all-files-closed', this.allFilesClosed);
    },

    stop() {
        if (Launcher) {
            this.stopDesktopAppListener();
        } else {
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

    startDesktopAppListener() {
        Launcher.closeOldBrowserExtensionSocket(() => {
            const sockName = Launcher.getBrowserExtensionSocketName();
            const { createServer } = Launcher.req('net');
            this.connectedSockets = [];
            this.connectedSocketState = new WeakMap();
            this.server = createServer((socket) => {
                this.connectedSockets.push(socket);
                this.connectedSocketState.set(socket, {});
                this.checkSocketIdentity(socket);
                socket.on('data', (data) => this.onSocketData(socket, data));
                socket.on('close', () => this.onSocketClose(socket));
            });
            this.server.listen(sockName);
        });
    },

    stopDesktopAppListener() {
        for (const socket of this.connectedSockets) {
            socket.destroy();
        }
        if (this.server) {
            this.server.close();
        }
        this.connectedSockets = [];
        this.connectedSocketState = new WeakMap();
    },

    checkSocketIdentity(socket) {
        const state = this.connectedSocketState.get(socket);
        if (!state) {
            return;
        }

        // TODO: check the process

        state.active = true;
        this.processPendingSocketData(socket);
    },

    onSocketClose(socket) {
        // TODO: remove the client
        this.connectedSockets = this.connectedSockets.filter((s) => s !== socket);
        this.connectedSocketState.delete(socket);
    },

    onSocketData(socket, data) {
        if (data.byteLength > MaxIncomingDataLength) {
            socket.destroy();
            return;
        }
        const state = this.connectedSocketState.get(socket);
        if (!state) {
            return;
        }
        if (state.pendingData) {
            state.pendingData = Buffer.concat([state.pendingData, data]);
        } else {
            state.pendingData = data;
        }
        if (state.active) {
            this.processPendingSocketData(socket);
        }
    },

    processPendingSocketData(socket) {
        const state = this.connectedSocketState.get(socket);
        if (!state) {
            return;
        }

        while (state.pendingData) {
            if (state.pendingData.length < 4) {
                return;
            }

            const lengthBuffer = state.pendingData.slice(0, 4);
            const length = new Uint32Array(lengthBuffer)[0];

            if (length > MaxIncomingDataLength) {
                socket.destroy();
                return;
            }

            if (state.pendingData.byteLength < length + 4) {
                return;
            }

            const messageBytes = state.pendingData.slice(4, length + 4);
            if (state.pendingData.byteLength > length + 4) {
                state.pendingData = state.pendingData.slice(length + 4);
            } else {
                state.pendingData = null;
            }

            const str = messageBytes.toString();
            let request;
            try {
                request = JSON.parse(str);
            } catch {
                socket.destroy();
                return;
            }

            let response;
            try {
                const handler = ProtocolHandlers[request.action];
                if (!handler) {
                    throw new Error(`Handler not found: ${request.action}`);
                }
                response = handler(request) || {};
            } catch (e) {
                response = { error: e.message || 'Unknown error' };
            }
            if (response) {
                this.sendSocketResponse(socket, response);
            }
        }
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
            this.sendWebResponse(response);
        }
    },

    sendWebResponse(response) {
        response.kwConnect = 'response';
        postMessage(response, window.location.origin);
    },

    sendSocketResponse(socket, response) {
        const responseData = Buffer.from(JSON.stringify(response));
        const lengthBytes = Buffer.from(new Uint32Array([responseData.byteLength]).buffer);
        const data = Buffer.concat([lengthBytes, responseData]);
        socket.write(data);
    },

    sendSocketEvent(data) {
        for (const socket of this.connectedSockets) {
            const state = this.connectedSocketState.get(socket);
            if (state?.active) {
                this.sendSocketResponse(socket, data);
            }
        }
    },

    sendEvent(data) {
        if (Launcher) {
            this.sendSocketEvent(data);
        } else {
            this.sendWebResponse(data);
        }
    },

    fileOpened() {
        this.sendEvent({ action: 'database-unlocked' });
    },

    oneFileClosed() {
        this.sendEvent({ action: 'database-locked' });
        if (appModel.files.hasOpenFiles()) {
            this.sendEvent({ action: 'database-unlocked' });
        }
    },

    allFilesClosed() {
        this.sendEvent({ action: 'database-locked' });
    },

    focusKeeWeb() {
        if (Launcher) {
            Launcher.showMainWindow();
        } else {
            this.sendEvent({ action: 'attention-required' });
        }
    }
};

export { BrowserExtensionConnector };

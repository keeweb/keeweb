import kdbxweb from 'kdbxweb';
import { Launcher } from 'comp/launcher';
import { Logger } from 'util/logger';
import { ProtocolHandlers, initProtocolImpl } from './protocol-impl';

const logger = new Logger('browser-extension-connector');
if (!localStorage.debugBrowserExtension) {
    logger.level = Logger.Level.Info;
}

const connectedClients = new Map();
const pendingBrowserMessages = [];
let processingBrowserMessage = false;
const MaxIncomingDataLength = 10_000;

const BrowserExtensionConnector = {
    enabled: true,
    logger,
    connectedClients,

    init(appModel) {
        const sendEvent = this.sendEvent.bind(this);
        initProtocolImpl({ appModel, logger, connectedClients, sendEvent });

        this.browserWindowMessage = this.browserWindowMessage.bind(this);

        this.start();
    },

    start() {
        if (Launcher) {
            this.startDesktopAppListener();
        } else {
            this.startWebMessageListener();
        }

        logger.info('Started');
    },

    stop() {
        if (Launcher) {
            this.stopDesktopAppListener();
        } else {
            this.stopWebMessageListener();
        }

        logger.info('Stopped');
    },

    startWebMessageListener() {
        window.addEventListener('message', this.browserWindowMessage);
    },

    stopWebMessageListener() {
        window.removeEventListener('message', this.browserWindowMessage);
    },

    isSocketNameTooLong(socketName) {
        const maxLength = process.platform === 'win32' ? 256 : 104;
        return socketName.length > maxLength;
    },

    startDesktopAppListener() {
        Launcher.prepareBrowserExtensionSocket(() => {
            const sockName = Launcher.getBrowserExtensionSocketName();
            if (this.isSocketNameTooLong(sockName)) {
                logger.error(
                    "Socket name is too big, browser connection won't be possible, probably OS username is very long.",
                    sockName
                );
                return;
            }
            const { createServer } = Launcher.req('net');
            this.connectedSockets = [];
            this.connectedSocketState = new WeakMap();
            this.server = createServer((socket) => {
                logger.info('New connection');
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
        const state = this.connectedSocketState.get(socket);
        if (state?.clientId) {
            connectedClients.delete(state.clientId);
        }
        this.connectedSocketState.delete(socket);

        this.connectedSockets = this.connectedSockets.filter((s) => s !== socket);

        logger.info('Connection closed', state?.clientId);
    },

    onSocketData(socket, data) {
        if (data.byteLength > MaxIncomingDataLength) {
            logger.warn('Too many bytes rejected', data.byteLength);
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

    async processPendingSocketData(socket) {
        const state = this.connectedSocketState.get(socket);
        if (!state?.pendingData || state.processingData) {
            return;
        }

        if (state.pendingData.length < 4) {
            return;
        }

        const lengthBuffer = kdbxweb.ByteUtils.arrayToBuffer(state.pendingData.slice(0, 4));
        const length = new Uint32Array(lengthBuffer)[0];

        if (length > MaxIncomingDataLength) {
            logger.warn('Large message rejected', length);
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
            logger.warn('Failed to parse message', str);
            socket.destroy();
            return;
        }

        logger.debug('Extension -> KeeWeb', request);

        if (!request) {
            logger.warn('Empty request', request);
            socket.destroy();
            return;
        }

        if (request.clientID) {
            const clientId = request.clientID;
            if (!state.clientId) {
                state.clientId = clientId;
            } else if (state.clientId !== clientId) {
                logger.warn(`Changing client ID is not allowed: ${state.clientId} => ${clientId}`);
                socket.destroy();
                return;
            }
        } else {
            if (request.action !== 'ping') {
                logger.warn('Empty client ID in request', request);
                socket.destroy();
                return;
            }
        }

        state.processingData = true;

        let response;
        try {
            const handler = ProtocolHandlers[request.action];
            if (!handler) {
                throw new Error(`Handler not found: ${request.action}`);
            }
            response = await handler(request);
        } catch (e) {
            response = this.errorToResponse(e, request);
        }

        state.processingData = false;

        if (response) {
            this.sendSocketResponse(socket, response);
        }

        this.processPendingSocketData(socket);
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
        logger.debug('Extension -> KeeWeb', e.data);
        pendingBrowserMessages.push(e.data);
        this.processBrowserMessages();
    },

    async processBrowserMessages() {
        if (!pendingBrowserMessages.length || processingBrowserMessage) {
            return;
        }

        processingBrowserMessage = true;

        const request = pendingBrowserMessages.shift();

        let response;
        try {
            const handler = ProtocolHandlers[request.action];
            if (!handler) {
                throw new Error(`Handler not found: ${request.action}`);
            }
            response = await handler(request);
        } catch (e) {
            response = this.errorToResponse(e, request);
        }

        processingBrowserMessage = false;

        if (response) {
            this.sendWebResponse(response);
        }

        this.processBrowserMessages();
    },

    errorToResponse(e, request) {
        return {
            action: request.action,
            error: e.message || 'Unknown error',
            errorCode: e.code || 0
        };
    },

    sendWebResponse(response) {
        logger.debug('KeeWeb -> Extension', response);
        response.kwConnect = 'response';
        postMessage(response, window.location.origin);
    },

    sendSocketResponse(socket, response) {
        logger.debug('KeeWeb -> Extension', response);
        const responseData = Buffer.from(JSON.stringify(response));
        const lengthBuf = kdbxweb.ByteUtils.arrayToBuffer(
            new Uint32Array([responseData.byteLength])
        );
        const lengthBytes = Buffer.from(lengthBuf);
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
        if (!this.enabled) {
            return;
        }
        if (Launcher) {
            this.sendSocketEvent(data);
        } else {
            this.sendWebResponse(data);
        }
    }
};

export { BrowserExtensionConnector };

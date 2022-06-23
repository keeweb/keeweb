const os = require('os');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { ipcMain, app } = require('electron');
const { Logger } = require('../logger');
const { getProcessInfo } = require('../util/process-utils');
const { ExtensionIds } = require('../const/extension-ids');
const browserExtensionInstaller = require('../util/browser-extension-installer');

ipcMain.handle('browserExtensionConnectorStart', browserExtensionConnectorStart);
ipcMain.handle('browserExtensionConnectorStop', browserExtensionConnectorStop);
ipcMain.handle('browserExtensionConnectorEnable', browserExtensionConnectorEnable);
ipcMain.handle('browserExtensionConnectorSocketResult', browserExtensionConnectorSocketResult);
ipcMain.handle('browserExtensionConnectorSocketEvent', browserExtensionConnectorSocketEvent);
ipcMain.handle('browserExtensionConnectorCloseSocket', browserExtensionConnectorCloseSocket);

const logger = new Logger('browser-extension-connector');

const BrowserExtensionNames = {
    KWC: 'KeeWeb Connect',
    KPXC: 'KeePassXC-Browser'
};

const MaxIncomingDataLength = 10_000;
const ExtensionOrigins = {
    [ExtensionIds.Origins.KeeWebConnectSafari]: BrowserExtensionNames.KWC,
    [ExtensionIds.Origins.KeeWebConnectFirefox]: BrowserExtensionNames.KWC,
    [ExtensionIds.Origins.KeeWebConnectChrome]: BrowserExtensionNames.KWC,
    [ExtensionIds.Origins.KeeWebConnectEdge]: BrowserExtensionNames.KWC,
    [ExtensionIds.Origins.KeePassXcBrowserFirefox]: BrowserExtensionNames.KPXC,
    [ExtensionIds.Origins.KeePassXcBrowserChrome]: BrowserExtensionNames.KPXC,
    [ExtensionIds.Origins.KeePassXcBrowserEdge]: BrowserExtensionNames.KPXC
};

for (const devExtId of process.env.KEEWEB_BROWSER_EXTENSION_IDS_CHROMIUM?.split(',') || []) {
    ExtensionOrigins[`chrome-extension://${devExtId}/`] = BrowserExtensionNames.KWC;
}

const AppNames = {
    'msedge': 'Microsoft Edge',
    'chrome': 'Google Chrome'
};

let connectedSockets = new Map();
let connectedSocketState = new WeakMap();
let server;
let serverSocketName;
let socketId = 0;

async function browserExtensionConnectorStart(e, config) {
    serverSocketName = getBrowserExtensionSocketName(config);
    await prepareBrowserExtensionSocket();

    if (isSocketNameTooLong(serverSocketName)) {
        logger.error(
            "Socket name is too long, browser connection won't be possible, probably OS username is very long.",
            serverSocketName
        );
        return;
    }

    server = net.createServer(async (socket) => {
        socketId++;

        logger.info(`New connection with socket ${socketId}`);

        connectedSockets.set(socketId, socket);
        connectedSocketState.set(socket, { socketId });

        socket.on('data', (data) => onSocketData(socket, data));
        socket.on('close', () => onSocketClose(socket));
    });
    server.listen(serverSocketName);

    logger.info('Started');
}

function browserExtensionConnectorStop() {
    for (const socket of connectedSockets.values()) {
        socket.destroy();
    }
    if (server) {
        server.close();
        server = null;
    }
    connectedSockets = new Map();
    connectedSocketState = new WeakMap();

    logger.info('Stopped');
}

async function browserExtensionConnectorEnable(e, browser, extension, enabled) {
    logger.info(enabled ? 'Enable' : 'Disable', browser, extension);

    try {
        if (enabled) {
            await browserExtensionInstaller.install(browser, extension);
        } else {
            await browserExtensionInstaller.uninstall(browser, extension);
        }
    } catch (e) {
        logger.error(`Error installing extension: ${e}`);
    }
}

function browserExtensionConnectorSocketResult(e, socketId, result) {
    sendResultToSocket(socketId, result);
}

function browserExtensionConnectorSocketEvent(e, data) {
    sendEventToAllSockets(data);
}

function browserExtensionConnectorCloseSocket(e, socketId) {
    const socket = connectedSockets.get(socketId);
    socket?.destroy();
}

function getBrowserExtensionSocketName(config) {
    const { username, uid } = os.userInfo();
    if (process.platform === 'darwin') {
        const appleTeamId = config.appleTeamId;
        return `/Users/${username}/Library/Group Containers/${appleTeamId}.keeweb/conn.sock`;
    } else if (process.platform === 'win32') {
        return `\\\\.\\pipe\\keeweb-connect-${username}`;
    } else {
        const sockFileName = `keeweb-connect-${uid}.sock`;
        return path.join(app.getPath('temp'), sockFileName);
    }
}

function prepareBrowserExtensionSocket() {
    return new Promise((resolve) => {
        if (process.platform === 'darwin') {
            fs.access(serverSocketName, fs.constants.F_OK, (err) => {
                if (err) {
                    const dir = path.dirname(serverSocketName);
                    fs.mkdir(dir, () => resolve());
                } else {
                    fs.unlink(serverSocketName, () => resolve());
                }
            });
        } else if (process.platform === 'win32') {
            return resolve();
        } else {
            fs.unlink(serverSocketName, () => resolve());
        }
    });
}

function isSocketNameTooLong(socketName) {
    const maxLength = process.platform === 'win32' ? 256 : 104;
    return socketName.length > maxLength;
}

function onSocketClose(socket) {
    const state = connectedSocketState.get(socket);
    connectedSocketState.delete(socket);

    if (state?.socketId) {
        connectedSockets.delete(state.socketId);
        sendToRenderer('browserExtensionSocketClosed', state.socketId);
    }

    logger.info(`Socket ${state?.socketId} closed`);
}

function onSocketData(socket, data) {
    const state = connectedSocketState.get(socket);
    if (!state) {
        logger.warn('Received data without connection state');
        return;
    }

    if (data.byteLength > MaxIncomingDataLength) {
        logger.warn(`Too many bytes rejected from socket ${state.socketId}`, data.byteLength);
        socket.destroy();
        return;
    }
    if (state.pendingData) {
        state.pendingData = Buffer.concat([state.pendingData, data]);
    } else {
        state.pendingData = data;
    }
    processPendingSocketData(socket);
}

async function processPendingSocketData(socket) {
    const state = connectedSocketState.get(socket);
    if (!state) {
        return;
    }
    if (!state.pendingData || state.processingData) {
        return;
    }

    if (state.pendingData.length < 4) {
        return;
    }

    const lengthBuffer = state.pendingData.buffer.slice(
        state.pendingData.byteOffset,
        state.pendingData.byteOffset + 4
    );
    const length = new Uint32Array(lengthBuffer)[0];

    if (length > MaxIncomingDataLength) {
        logger.warn(`Large message rejected from socket ${state.socketId}`, length);
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
        logger.warn(`Failed to parse message from socket ${state.socketId}`, str);
        socket.destroy();
        return;
    }

    if (!state.active) {
        await processFirstMessageFromSocket(socket, request);
        return;
    }

    logger.debug(`Extension[${state.socketId}] -> KeeWeb`, request);

    if (!request) {
        logger.warn(`Empty request for socket ${state.socketId}`, request);
        socket.destroy();
        return;
    }

    if (request.clientID) {
        const clientId = request.clientID;
        if (!state.clientId) {
            state.clientId = clientId;
        } else if (state.clientId !== clientId) {
            logger.warn(
                `Changing client ID for socket ${state.socketId} is not allowed`,
                `${state.clientId} => ${clientId}`
            );
            socket.destroy();
            return;
        }
    } else {
        if (request.action !== 'ping') {
            logger.warn(`Empty client ID in socket request ${state.socketId}`, request);
            socket.destroy();
            return;
        }
    }

    state.processingData = true;

    sendToRenderer('browserExtensionSocketRequest', state.socketId, request);
}

async function processFirstMessageFromSocket(socket, message) {
    const state = connectedSocketState.get(socket);
    if (!state) {
        return;
    }

    logger.debug(`Init connection ${state.socketId}`, message);

    state.processingData = true;

    if (!message.origin) {
        logger.error('Empty origin');
        socket.destroy();
        return;
    }
    if (!message.pid) {
        logger.error('Empty pid');
        socket.destroy();
        return;
    }

    const extensionName = ExtensionOrigins[message.origin] || 'unknown';
    const isSafari = message.origin === ExtensionIds.Origins.KeeWebConnectSafari;
    let appName;

    if (isSafari) {
        appName = 'Safari';
    } else {
        if (!message.ppid) {
            logger.error('Empty ppid');
            socket.destroy();
            return;
        }

        let parentProcessInfo;
        try {
            try {
                parentProcessInfo = await getProcessInfo(message.ppid);
            } catch (e) {
                logger.error(`Cannot get info for PID ${message.ppid}: ${e}`);
                throw e;
            }

            if (process.platform === 'win32' && parentProcessInfo.appName === 'cmd') {
                try {
                    parentProcessInfo = await getProcessInfo(parentProcessInfo.ppid);
                } catch (e) {
                    logger.error(
                        `Cannot get info for PID ${parentProcessInfo.ppid}: ${e}, assuming cmd is the launcher`
                    );
                }
            }
        } catch (e) {
            logger.warn('Cannot get process info, assuming the connection is not identified');
        }

        appName = parentProcessInfo
            ? AppNames[parentProcessInfo.appName] ?? parentProcessInfo.appName
            : 'Unidentified browser';
        appName = appName[0].toUpperCase() + appName.slice(1);
    }

    state.active = true;
    state.appName = appName;
    state.extensionName = extensionName;
    state.pid = message.pid;
    state.ppid = message.ppid;
    state.supportsNotifications = !isSafari;
    state.processingData = false;

    logger.info(
        `Socket ${state.socketId} activated for ` +
            `app: "${state.appName}", ` +
            `extension: "${state.extensionName}", ` +
            `pid: ${state.pid}, ` +
            `ppid: ${state.ppid}`
    );

    sendToRenderer('browserExtensionSocketConnected', state.socketId, {
        connectionId: state.socketId,
        appName: state.appName,
        extensionName: state.extensionName,
        pid: state.pid,
        supportsNotifications: state.supportsNotifications
    });

    processPendingSocketData(socket);
}

function sendResultToSocket(socketId, result) {
    const socket = connectedSockets.get(socketId);
    if (socket) {
        sendMessageToSocket(socket, result);
        const state = connectedSocketState.get(socket);
        if (state.processingData) {
            state.processingData = false;
            processPendingSocketData(socket);
        }
    }
}

function sendEventToAllSockets(data) {
    for (const socket of connectedSockets.values()) {
        const state = connectedSocketState.get(socket);
        if (state?.active && state?.supportsNotifications) {
            sendMessageToSocket(socket, data);
        }
    }
}

function sendMessageToSocket(socket, message) {
    const state = connectedSocketState.get(socket);
    if (!state) {
        logger.warn('Ignoring a socket message without connection state');
        return;
    }
    if (!state.active) {
        logger.warn(`Ignoring a message to inactive socket ${state.socketId}`);
        return;
    }

    logger.debug(`KeeWeb -> Extension[${state.socketId}]`, message);

    const responseData = Buffer.from(JSON.stringify(message));
    const lengthBuf = Buffer.from(new Uint32Array([responseData.byteLength]).buffer);
    const lengthBytes = Buffer.from(lengthBuf);
    const data = Buffer.concat([lengthBytes, responseData]);

    try {
        socket.write(data);
    } catch (e) {
        logger.error(`Error writing to socket ${state.socketId}`, e);
    }
}

function sendToRenderer(event, socketId, data) {
    app.getMainWindow().webContents.send(event, socketId, data);
}

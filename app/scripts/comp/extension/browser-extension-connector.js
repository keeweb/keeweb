import { Launcher } from 'comp/launcher';
import { Logger } from 'util/logger';
import { ProtocolImpl } from './protocol-impl';
import { RuntimeInfo } from 'const/runtime-info';
import { AppSettingsModel } from 'models/app-settings-model';
import { Features } from 'util/features';

const WebConnectionInfo = {
    connectionId: 1,
    extensionName: 'keeweb-connect',
    supportsNotifications: true
};

const SupportedExtensions = [
    { alias: 'KWC', name: 'KeeWeb Connect' },
    { alias: 'KPXC', name: 'KeePassXC-Browser' }
];
const SupportedBrowsers = ['Chrome', 'Firefox', 'Edge', 'Other'];
if (Features.isMac) {
    SupportedBrowsers.unshift('Safari');
}

const logger = new Logger('browser-extension-connector');
if (!localStorage.debugBrowserExtension) {
    logger.level = Logger.Level.Info;
}

const connections = new Map();
const pendingBrowserMessages = [];
let processingBrowserMessage = false;

const BrowserExtensionConnector = {
    enabled: true,
    logger,

    init(appModel) {
        const sendEvent = this.sendEvent.bind(this);
        ProtocolImpl.init({ appModel, logger, sendEvent });

        this.browserWindowMessage = this.browserWindowMessage.bind(this);

        if (Launcher) {
            const { ipcRenderer } = Launcher.electron();
            ipcRenderer.on('browserExtensionSocketConnected', (e, socketId, connectionInfo) =>
                this.socketConnected(socketId, connectionInfo)
            );
            ipcRenderer.on('browserExtensionSocketClosed', (e, socketId) =>
                this.socketClosed(socketId)
            );
            ipcRenderer.on('browserExtensionSocketRequest', (e, socketId, request) =>
                this.socketRequest(socketId, request)
            );
        }

        this.start();
    },

    start() {
        if (Launcher) {
            this.startDesktopAppListener();
        } else {
            this.startWebMessageListener();
        }
    },

    stop() {
        if (Launcher) {
            this.stopDesktopAppListener();
        } else {
            this.stopWebMessageListener();
        }

        ProtocolImpl.cleanup();
        connections.clear();

        logger.info('Stopped');
    },

    startWebMessageListener() {
        window.addEventListener('message', this.browserWindowMessage);
        logger.info('Started');
    },

    stopWebMessageListener() {
        window.removeEventListener('message', this.browserWindowMessage);
    },

    isEnabledOnDesktop() {
        for (const browser of SupportedBrowsers) {
            for (const ext of SupportedExtensions) {
                if (AppSettingsModel[`extensionEnabled${ext.alias}${browser}`]) {
                    return true;
                }
            }
        }
        return false;
    },

    async startDesktopAppListener() {
        const { ipcRenderer } = Launcher.electron();
        ipcRenderer.invoke('browserExtensionConnectorStart', {
            appleTeamId: RuntimeInfo.appleTeamId
        });
    },

    stopDesktopAppListener() {
        const { ipcRenderer } = Launcher.electron();
        ipcRenderer.invoke('browserExtensionConnectorStop');
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

        const response = await ProtocolImpl.handleRequest(request, WebConnectionInfo);

        processingBrowserMessage = false;

        if (response) {
            this.sendWebResponse(response);
        }

        this.processBrowserMessages();
    },

    sendWebResponse(response) {
        logger.debug('KeeWeb -> Extension', response);
        response.kwConnect = 'response';
        postMessage(response, window.location.origin);
    },

    sendSocketEvent(data) {
        const { ipcRenderer } = Launcher.electron();
        ipcRenderer.invoke('browserExtensionConnectorSocketEvent', data);
    },

    sendSocketResult(socketId, data) {
        const { ipcRenderer } = Launcher.electron();
        ipcRenderer.invoke('browserExtensionConnectorSocketResult', socketId, data);
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
    },

    socketConnected(socketId, connectionInfo) {
        connections.set(socketId, connectionInfo);
    },

    socketClosed(socketId) {
        connections.delete(socketId);
        ProtocolImpl.deleteConnection(socketId);
    },

    async socketRequest(socketId, request) {
        let result;

        const connectionInfo = connections.get(socketId);
        if (connectionInfo) {
            result = await ProtocolImpl.handleRequest(request, connectionInfo);
        } else {
            const message = `Connection not found: ${socketId}`;
            result = ProtocolImpl.errorToResponse({ message }, request);
        }

        this.sendSocketResult(socketId, result);
    }
};

export { BrowserExtensionConnector, SupportedExtensions, SupportedBrowsers };

import { Launcher } from 'comp/launcher';
import { Logger } from 'util/logger';
import { ProtocolImpl } from './protocol-impl';
import { RuntimeInfo } from 'const/runtime-info';
import { AppSettingsModel } from 'models/app-settings-model';
import { Features } from 'util/features';

const WebConnectionInfo = {
    connectionId: 1,
    extensionName: 'KeeWeb Connect',
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
    started: false,
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

            AppSettingsModel.on('change', () => this.appSettingsChanged());
        }

        if (this.isEnabled()) {
            this.start();
        }
    },

    start() {
        if (Launcher) {
            this.startDesktopAppListener();
        } else {
            this.startWebMessageListener();
        }

        this.started = true;
    },

    stop() {
        if (Launcher) {
            this.stopDesktopAppListener();
        } else {
            this.stopWebMessageListener();
        }

        ProtocolImpl.cleanup();
        connections.clear();

        this.started = false;
    },

    appSettingsChanged() {
        if (this.isEnabled()) {
            if (!this.started) {
                this.start();
            }
        } else if (this.started) {
            this.stop();
        }
    },

    isEnabled() {
        if (!Launcher) {
            return true;
        }
        for (const ext of SupportedExtensions) {
            for (const browser of SupportedBrowsers) {
                if (AppSettingsModel[`extensionEnabled${ext.alias}${browser}`]) {
                    return true;
                }
            }
        }
        return false;
    },

    startWebMessageListener() {
        window.addEventListener('message', this.browserWindowMessage);
        logger.info('Started');
    },

    stopWebMessageListener() {
        window.removeEventListener('message', this.browserWindowMessage);
    },

    enable(browser, extension, enabled) {
        const { ipcRenderer } = Launcher.electron();
        ipcRenderer.invoke('browserExtensionConnectorEnable', browser, extension, enabled);
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

        if (!connections.has(WebConnectionInfo.connectionId)) {
            connections.set(WebConnectionInfo.connectionId, WebConnectionInfo);
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
        if (!this.isEnabled() || !connections.size) {
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
    },

    get sessions() {
        return ProtocolImpl.sessions;
    },

    terminateConnection(connectionId) {
        connectionId = +connectionId;
        if (Launcher) {
            const { ipcRenderer } = Launcher.electron();
            ipcRenderer.invoke('browserExtensionConnectorCloseSocket', connectionId);
        } else {
            ProtocolImpl.deleteConnection(connectionId);
        }
    },

    getClientPermissions(clientId) {
        return ProtocolImpl.getClientPermissions(clientId);
    },

    setClientPermissions(clientId, permissions) {
        ProtocolImpl.setClientPermissions(clientId, permissions);
    }
};

export { BrowserExtensionConnector, SupportedExtensions, SupportedBrowsers };

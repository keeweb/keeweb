const fs = require('fs');
const path = require('path');
const windowsRegistry = require('./windows-registry');
const { isDev } = require('./app-info');
const { app } = require('electron');
const { ExtensionIds } = require('../const/extension-ids');

function getManifestDir(browser) {
    const home = app.getPath('home');
    switch (process.platform) {
        case 'darwin':
            switch (browser) {
                case 'Chrome':
                    return `${home}/Library/Application Support/Google/Chrome/NativeMessagingHosts/`;
                case 'Firefox':
                    return `${home}/Library/Application Support/Mozilla/NativeMessagingHosts/`;
                case 'Edge':
                    return `${home}/Library/Application Support/Microsoft Edge/NativeMessagingHosts/`;
                default:
                    return undefined;
            }
        case 'linux':
            switch (browser) {
                case 'Chrome':
                    return `${home}/.config/google-chrome/NativeMessagingHosts/`;
                case 'Firefox':
                    return `${home}/.mozilla/native-messaging-hosts/`;
                case 'Edge':
                    return `${home}/.config/microsoft-edge/NativeMessagingHosts/`;
                default:
                    return undefined;
            }
    }
}

function getWindowsRegistryPath(browser) {
    switch (browser) {
        case 'Chrome':
            return 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\';
        case 'Firefox':
            return 'HKCU\\Software\\Mozilla\\NativeMessagingHosts\\';
        case 'Edge':
            return 'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\';
        default:
            return undefined;
    }
}

function getWindowsManifestFileName(browser, extension) {
    const suffix = browser === 'Firefox' ? 'firefox' : 'chrome';
    const manifestName = `native-messaging-${extension.toLowerCase()}.${suffix}.json`;
    return path.join(app.getPath('userData'), manifestName);
}

function getNativeHostName(extension) {
    switch (extension) {
        case 'KWC':
            return 'net.antelle.keeweb.keeweb_connect';
        case 'KPXC':
            return 'org.keepassxc.keepassxc_browser';
    }
}

function getManifestFileName(extension) {
    const nativeHostName = getNativeHostName(extension);
    return nativeHostName ? nativeHostName + '.json' : undefined;
}

function createManifest(browser, extension) {
    switch (extension) {
        case 'KWC': {
            const devIdsChromium =
                process.env.KEEWEB_BROWSER_EXTENSION_IDS_CHROMIUM?.split(',')?.map(
                    (devExtId) => `chrome-extension://${devExtId}/`
                ) || [];
            return {
                ...(browser === 'Firefox'
                    ? { 'allowed_extensions': [ExtensionIds.Origins.KeeWebConnectFirefox] }
                    : {
                          'allowed_origins': [
                              ExtensionIds.Origins.KeeWebConnectChrome,
                              ExtensionIds.Origins.KeeWebConnectEdge,
                              ...devIdsChromium
                          ]
                      }),
                description: 'KeeWeb native messaging host',
                name: 'net.antelle.keeweb.keeweb_connect',
                type: 'stdio'
            };
        }
        case 'KPXC':
            return {
                ...(browser === 'Firefox'
                    ? { 'allowed_extensions': [ExtensionIds.Origins.KeePassXcBrowserFirefox] }
                    : {
                          'allowed_origins': [
                              ExtensionIds.Origins.KeePassXcBrowserChrome,
                              ExtensionIds.Origins.KeePassXcBrowserEdge
                          ]
                      }),
                description: 'Native messaging host created by KeeWeb',
                name: 'org.keepassxc.keepassxc_browser',
                type: 'stdio'
            };
    }
}

function getNativeMessagingHostPath() {
    if (isDev) {
        const packageBase = path.resolve('node_modules/@keeweb/keeweb-native-messaging-host');
        const extension = process.platform === 'win32' ? '.exe' : '';
        const exeName = `keeweb-native-messaging-host${extension}`;
        return path.join(packageBase, `${process.platform}-${process.arch}`, exeName);
    }
    switch (process.platform) {
        case 'darwin':
            return path.join(app.getPath('exe'), '..', 'util', 'keeweb-native-messaging-host');
        case 'win32':
            return path.join(app.getPath('exe'), '..', 'keeweb-native-messaging-host.exe');
        case 'linux':
            return path.join(app.getPath('exe'), '..', 'keeweb-native-messaging-host');
    }
}

module.exports.install = async function (browser, extension) {
    const manifest = createManifest(browser, extension);
    if (!manifest) {
        return;
    }
    manifest.path = getNativeMessagingHostPath();

    if (process.platform === 'win32') {
        const registryPath = getWindowsRegistryPath(browser);
        if (!registryPath) {
            return;
        }

        const registryKeyName = getNativeHostName(extension);
        if (!registryKeyName) {
            return;
        }

        const manifestFileName = getWindowsManifestFileName(browser, extension);
        await fs.promises.writeFile(manifestFileName, JSON.stringify(manifest, null, 4));

        windowsRegistry.createKey(registryPath + registryKeyName, manifestFileName);
    } else {
        const manifestDir = getManifestDir(browser);
        if (!manifestDir) {
            return;
        }

        await fs.promises.mkdir(manifestDir, { recursive: true });

        const manifestFileName = getManifestFileName(extension);
        if (!manifestFileName) {
            return;
        }

        const fullPath = path.join(manifestDir, manifestFileName);

        await fs.promises.writeFile(fullPath, JSON.stringify(manifest, null, 4));
    }
};

module.exports.uninstall = async function (browser, extension) {
    if (process.platform === 'win32') {
        const registryPath = getWindowsRegistryPath(browser);
        if (!registryPath) {
            return;
        }

        const registryKeyName = getNativeHostName(extension);
        if (!registryKeyName) {
            return;
        }

        windowsRegistry.deleteKey(registryPath + registryKeyName);
    } else {
        const manifestDir = getManifestDir(browser);
        if (!manifestDir) {
            return;
        }

        const manifestFileName = getManifestFileName(extension);
        if (!manifestFileName) {
            return;
        }
        const fullPath = path.join(manifestDir, manifestFileName);

        await fs.promises.unlink(fullPath);
    }
};

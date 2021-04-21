const fs = require('fs');
const path = require('path');
const { isDev } = require('./app-info');
const { app } = require('electron');

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
        case 'win32':
            throw new Error('not implemented');
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

function getManifestFileName(extension) {
    switch (extension) {
        case 'KWC':
            return 'net.antelle.keeweb.keeweb_connect.json';
        case 'KPXC':
            return 'org.keepassxc.keepassxc_browser.json';
    }
}

function createManifest(browser, extension) {
    switch (extension) {
        case 'KWC':
            return {
                ...(browser === 'Firefox'
                    ? { 'allowed_extensions': ['keeweb-connect@keeweb.info'] }
                    : {
                          'allowed_origins': [
                              'chrome-extension://aphablpbogbpmocgkpeeadeljldnphon/'
                          ]
                      }),
                description: 'KeeWeb native messaging host',
                name: 'net.antelle.keeweb.keeweb_connect',
                type: 'stdio'
            };
        case 'KPXC':
            return {
                ...(browser === 'Firefox'
                    ? { 'allowed_extensions': ['keepassxc-browser@keepassxc.org'] }
                    : {
                          'allowed_origins': [
                              'chrome-extension://pdffhmdngciaglkoonimfcmckehcpafo/',
                              'chrome-extension://oboonakemofpalcgghocfoadofidjkkk/'
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

    const manifest = createManifest(browser, extension);
    if (!manifest) {
        return;
    }

    manifest.path = getNativeMessagingHostPath();

    await fs.promises.writeFile(fullPath, JSON.stringify(manifest, null, 4));
};

module.exports.uninstall = async function (browser, extension) {
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
};

import * as kdbxweb from 'kdbxweb';
import { Events } from 'framework/events';
import { RuntimeInfo } from 'const/runtime-info';
import { Transport } from 'comp/browser/transport';
import { Launcher } from 'comp/launcher';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { UpdateModel } from 'models/update-model';
import { SemVer } from 'util/data/semver';
import { Logger } from 'util/logger';
import { SignatureVerifier } from 'util/data/signature-verifier';

const logger = new Logger('updater');

const Updater = {
    UpdateInterval: 1000 * 60 * 60 * 24,
    MinUpdateTimeout: 500,
    MinUpdateSize: 10000,
    nextCheckTimeout: null,
    updateCheckDate: new Date(0),
    enabled: Launcher?.updaterEnabled(),

    getAutoUpdateType() {
        if (!this.enabled) {
            return false;
        }
        let autoUpdate = AppSettingsModel.autoUpdate;
        if (autoUpdate && autoUpdate === true) {
            autoUpdate = 'install';
        }
        return autoUpdate;
    },

    updateInProgress() {
        return (
            UpdateModel.status === 'checking' ||
            ['downloading', 'extracting', 'updating'].indexOf(UpdateModel.updateStatus) >= 0
        );
    },

    init() {
        logger.dev(
            '<fnc>:init',
            '<msg>:service worker initialized [launcher] ' +
                Launcher +
                ' [worker] ' +
                navigator.serviceWorker
        );

        this.scheduleNextCheck();
        if (!Launcher && navigator.serviceWorker && !RuntimeInfo.beta && !RuntimeInfo.devMode) {
            navigator.serviceWorker
                .register('service-worker.js')
                .then((reg) => {
                    logger.info('<fnc>:init', '<msg>:service worker registered');

                    reg.addEventListener('updatefound', () => {
                        if (reg.active) {
                            logger.info('<fnc>:init', '<msg>:service worker found an update');
                            UpdateModel.set({ updateStatus: 'ready' });
                        }
                    });
                })
                .catch((e) => {
                    logger.dev('<fnc>:init', '<msg>:checking service worker');
                    logger.error('<fnc>:init', '<msg>:Failed to register a service worker', e);
                });
        }
    },

    scheduleNextCheck() {
        if (this.nextCheckTimeout) {
            clearTimeout(this.nextCheckTimeout);
            this.nextCheckTimeout = null;
        }
        if (!this.getAutoUpdateType()) {
            return;
        }
        let timeDiff = this.MinUpdateTimeout;
        const lastCheckDate = UpdateModel.lastCheckDate;
        if (lastCheckDate) {
            timeDiff = Math.min(
                Math.max(this.UpdateInterval + (lastCheckDate - new Date()), this.MinUpdateTimeout),
                this.UpdateInterval
            );
        }
        this.nextCheckTimeout = setTimeout(this.check.bind(this), timeDiff);

        logger.info(
            '<fnc>:scheduleNextCheck',
            '<msg>:Next update check will happen in ' + Math.round(timeDiff / 1000) + 's'
        );
    },

    check(startedByUser) {
        if (!this.enabled || this.updateInProgress()) {
            return;
        }
        UpdateModel.set({ status: 'checking' });
        if (!startedByUser) {
            // additional protection from broken program logic, to ensure that auto-checks are not performed more than once an hour
            const diffMs = new Date() - this.updateCheckDate;
            if (isNaN(diffMs) || diffMs < 1000 * 60 * 60) {
                logger.error(
                    '<fnc>:check',
                    '<msg>:Prevented update check; last check was performed at ' +
                        this.updateCheckDate
                );

                this.scheduleNextCheck();
                return;
            }
            this.updateCheckDate = new Date();
        }

        logger.info('<fnc>:check', '<msg>:Checking for updates');

        Transport.httpGet({
            url: Links.UpdateJson,
            json: true,
            success: (updateJson) => {
                const dt = new Date();

                logger.info(
                    '<fnc>:check',
                    '<msg>:Update check: ' + (updateJson.version || 'unknown')
                );

                if (!updateJson.version) {
                    const errMsg = 'No version info found';
                    UpdateModel.set({
                        status: 'error',
                        lastCheckDate: dt,
                        lastCheckError: errMsg
                    });
                    UpdateModel.save();
                    this.scheduleNextCheck();
                    return;
                }
                const prevLastVersion = UpdateModel.lastVersion;
                UpdateModel.set({
                    status: 'ok',
                    lastCheckDate: dt,
                    lastSuccessCheckDate: dt,
                    lastVersionReleaseDate: new Date(updateJson.date),
                    lastVersion: updateJson.version,
                    lastCheckError: null,
                    lastCheckUpdMin: updateJson.minVersion || null
                });
                UpdateModel.save();
                this.scheduleNextCheck();
                if (!this.canAutoUpdate()) {
                    return;
                }
                if (
                    prevLastVersion === UpdateModel.lastVersion &&
                    UpdateModel.updateStatus === 'ready'
                ) {
                    logger.info(
                        '<fnc>:check',
                        '<msg>:Waiting for the user to apply downloaded update'
                    );

                    return;
                }
                if (!startedByUser && this.getAutoUpdateType() === 'install') {
                    this.update(startedByUser);
                } else if (
                    SemVer.compareVersions(UpdateModel.lastVersion, RuntimeInfo.version) > 0
                ) {
                    UpdateModel.set({ updateStatus: 'found' });
                }
            },
            error: (e) => {
                logger.error('<fnc>:check', '<msg>:Update check error', e);

                UpdateModel.set({
                    status: 'error',
                    lastCheckDate: new Date(),
                    lastCheckError: 'Error checking last version'
                });
                UpdateModel.save();
                this.scheduleNextCheck();
            }
        });
    },

    canAutoUpdate() {
        const minLauncherVersion = UpdateModel.lastCheckUpdMin;
        if (minLauncherVersion) {
            const cmp = SemVer.compareVersions(RuntimeInfo.version, minLauncherVersion);
            if (cmp < 0) {
                UpdateModel.set({ updateStatus: 'ready', updateManual: true });
                return false;
            }
        }
        return true;
    },

    update(startedByUser, successCallback) {
        const ver = UpdateModel.lastVersion;
        if (!this.enabled) {
            logger.info('<fnc>:update', '<msg>:Updater is disabled');
            return;
        }
        if (SemVer.compareVersions(RuntimeInfo.version, ver) >= 0) {
            logger.info('<fnc>:update', '<msg>:You are using the latest version');
            return;
        }
        UpdateModel.set({ updateStatus: 'downloading', updateError: null });
        logger.info('Downloading update', ver);
        const updateAssetName = this.getUpdateAssetName(ver);
        if (!updateAssetName) {
            logger.error(
                '<fnc>:update',
                '<msg>:Empty updater asset name for',
                Launcher.platform(),
                Launcher.arch()
            );
            return;
        }
        const updateUrlBasePath = Links.UpdateBasePath.replace('{ver}', ver);
        const updateAssetUrl = updateUrlBasePath + updateAssetName;
        Transport.httpGet({
            url: updateAssetUrl,
            file: updateAssetName,
            cleanupOldFiles: true,
            cache: true,
            success: (assetFilePath) => {
                logger.info('<fnc>:update', '<msg>:Downloading update signatures');

                Transport.httpGet({
                    url: updateUrlBasePath + 'Verify.sign.sha256',
                    text: true,
                    file: updateAssetName + '.sign',
                    cleanupOldFiles: true,
                    cache: true,
                    success: (assetFileSignaturePath) => {
                        this.verifySignature(assetFilePath, updateAssetName, (err, valid) => {
                            if (err || !valid) {
                                UpdateModel.set({
                                    updateStatus: 'error',
                                    updateError: err
                                        ? 'Error verifying update signature'
                                        : 'Invalid update signature'
                                });
                                Launcher.deleteFile(assetFilePath);
                                Launcher.deleteFile(assetFileSignaturePath);
                                return;
                            }

                            logger.info('<fnc>:update', '<msg>:Update is ready', assetFilePath);
                            UpdateModel.set({ updateStatus: 'ready', updateError: null });
                            if (!startedByUser) {
                                Events.emit('update-app');
                            }
                            if (typeof successCallback === 'function') {
                                successCallback();
                            }
                        });
                    },
                    error(e) {
                        logger.error(
                            '<fnc>:update',
                            '<msg>:Error downloading update signatures',
                            e
                        );

                        UpdateModel.set({
                            updateStatus: 'error',
                            updateError: 'Error downloading update signatures'
                        });
                    }
                });
            },
            error(e) {
                logger.error('<fnc>:update', '<msg>:Error downloading update', e);

                UpdateModel.set({
                    updateStatus: 'error',
                    updateError: 'Error downloading update'
                });
            }
        });
    },

    verifySignature(assetFilePath, assetName, callback) {
        logger.info('<fnc>:verifySignature', '<msg>:Verifying update signature', assetName);

        const fs = Launcher.req('fs');
        const signaturesTxt = fs.readFileSync(assetFilePath + '.sign', 'utf8');
        const assetSignatureLine = signaturesTxt
            .split('\n')
            .find((line) => line.endsWith(assetName));
        if (!assetSignatureLine) {
            logger.error('<fnc>:verifySignature', '<msg>:Signature not found for asset', assetName);
            callback('Asset signature not found');
            return;
        }
        const signature = kdbxweb.ByteUtils.hexToBytes(assetSignatureLine.split(' ')[0]);
        const fileBytes = fs.readFileSync(assetFilePath);
        SignatureVerifier.verify(fileBytes, signature)
            .catch((e) => {
                logger.error('<fnc>:verifySignature', '<msg>:Error verifying signature', e);
                callback('Error verifying signature');
            })
            .then((valid) => {
                logger.info(
                    `<fnc>:verifySignature', '<msg>:Update asset signature is ${valid ? 'valid' : 'invalid'}`
                );
                callback(undefined, valid);
            });
    },

    getUpdateAssetName(ver) {
        const platform = Launcher.platform();
        const arch = Launcher.arch();
        switch (platform) {
            case 'win32':
                switch (arch) {
                    case 'x64':
                        return `KeeWeb-${ver}.win.x64.exe`;
                    case 'ia32':
                        return `KeeWeb-${ver}.win.ia32.exe`;
                    case 'arm64':
                        return `KeeWeb-${ver}.win.arm64.exe`;
                }
                break;
            case 'darwin':
                switch (arch) {
                    case 'x64':
                        return `KeeWeb-${ver}.mac.x64.dmg`;
                    case 'arm64':
                        return `KeeWeb-${ver}.mac.arm64.dmg`;
                }
                break;
        }
        return undefined;
    },

    installAndRestart() {
        if (!Launcher) {
            return;
        }
        const updateAssetName = this.getUpdateAssetName(UpdateModel.lastVersion);
        const updateFilePath = Transport.cacheFilePath(updateAssetName);
        Launcher.requestRestartAndUpdate(updateFilePath);
    }
};

export { Updater };

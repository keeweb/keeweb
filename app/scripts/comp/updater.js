const Backbone = require('backbone');
const RuntimeInfo = require('./runtime-info');
const Links = require('../const/links');
const Launcher = require('../comp/launcher');
const AppSettingsModel = require('../models/app-settings-model');
const UpdateModel = require('../models/update-model');
const Transport = require('../comp/transport');
const Logger = require('../util/logger');
const SemVer = require('../util/semver');
const publicKey = require('raw-loader!../../resources/public-key.pem');

const logger = new Logger('updater');

const Updater = {
    UpdateInterval: 1000 * 60 * 60 * 24,
    MinUpdateTimeout: 500,
    MinUpdateSize: 10000,
    UpdateCheckFiles: ['app.asar'],
    nextCheckTimeout: null,
    updateCheckDate: new Date(0),
    enabled: Launcher && Launcher.updaterEnabled(),

    getAutoUpdateType: function() {
        if (!this.enabled) {
            return false;
        }
        let autoUpdate = AppSettingsModel.instance.get('autoUpdate');
        if (autoUpdate && autoUpdate === true) {
            autoUpdate = 'install';
        }
        return autoUpdate;
    },

    updateInProgress: function() {
        return UpdateModel.instance.get('status') === 'checking' ||
            ['downloading', 'extracting'].indexOf(UpdateModel.instance.get('updateStatus')) >= 0;
    },

    init: function() {
        this.scheduleNextCheck();
        if (!Launcher && window.applicationCache) {
            window.applicationCache.addEventListener('updateready', this.checkAppCacheUpdateReady.bind(this));
            this.checkAppCacheUpdateReady();
        }
    },

    scheduleNextCheck: function() {
        if (this.nextCheckTimeout) {
            clearTimeout(this.nextCheckTimeout);
            this.nextCheckTimeout = null;
        }
        if (!this.getAutoUpdateType()) {
            return;
        }
        let timeDiff = this.MinUpdateTimeout;
        const lastCheckDate = UpdateModel.instance.get('lastCheckDate');
        if (lastCheckDate) {
            timeDiff = Math.min(Math.max(this.UpdateInterval + (lastCheckDate - new Date()), this.MinUpdateTimeout), this.UpdateInterval);
        }
        this.nextCheckTimeout = setTimeout(this.check.bind(this), timeDiff);
        logger.info('Next update check will happen in ' + Math.round(timeDiff / 1000) + 's');
    },

    check: function(startedByUser) {
        if (!this.enabled || this.updateInProgress()) {
            return;
        }
        UpdateModel.instance.set('status', 'checking');
        if (!startedByUser) {
            // additional protection from broken program logic, to ensure that auto-checks are not performed more than once an hour
            const diffMs = new Date() - this.updateCheckDate;
            if (isNaN(diffMs) || diffMs < 1000 * 60 * 60) {
                logger.error('Prevented update check; last check was performed at ' + this.updateCheckDate);
                this.scheduleNextCheck();
                return;
            }
            this.updateCheckDate = new Date();
        }
        logger.info('Checking for update...');
        Transport.httpGet({
            url: Links.Manifest,
            utf8: true,
            success: data => {
                const dt = new Date();
                const match = data.match(/#\s*(\d+\-\d+\-\d+):v([\d+\.\w]+)/);
                logger.info('Update check: ' + (match ? match[0] : 'unknown'));
                if (!match) {
                    const errMsg = 'No version info found';
                    UpdateModel.instance.set({ status: 'error', lastCheckDate: dt, lastCheckError: errMsg });
                    UpdateModel.instance.save();
                    this.scheduleNextCheck();
                    return;
                }
                const updateMinVersionMatch = data.match(/#\s*updmin:v([\d+\.\w]+)/);
                const prevLastVersion = UpdateModel.instance.get('lastVersion');
                UpdateModel.instance.set({
                    status: 'ok',
                    lastCheckDate: dt,
                    lastSuccessCheckDate: dt,
                    lastVersionReleaseDate: new Date(match[1]),
                    lastVersion: match[2],
                    lastCheckError: null,
                    lastCheckUpdMin: updateMinVersionMatch ? updateMinVersionMatch[1] : null
                });
                UpdateModel.instance.save();
                this.scheduleNextCheck();
                if (!this.canAutoUpdate()) {
                    return;
                }
                if (prevLastVersion === UpdateModel.instance.get('lastVersion') &&
                    UpdateModel.instance.get('updateStatus') === 'ready') {
                    logger.info('Waiting for the user to apply downloaded update');
                    return;
                }
                if (!startedByUser && this.getAutoUpdateType() === 'install') {
                    this.update(startedByUser);
                } else if (SemVer.compareVersions(UpdateModel.instance.get('lastVersion'), RuntimeInfo.version) > 0) {
                    UpdateModel.instance.set('updateStatus', 'found');
                }
            },
            error: e => {
                logger.error('Update check error', e);
                UpdateModel.instance.set({
                    status: 'error',
                    lastCheckDate: new Date(),
                    lastCheckError: 'Error checking last version'
                });
                UpdateModel.instance.save();
                this.scheduleNextCheck();
            }
        });
    },

    canAutoUpdate: function() {
        const minLauncherVersion = UpdateModel.instance.get('lastCheckUpdMin');
        if (minLauncherVersion) {
            const cmp = SemVer.compareVersions(Launcher.version, minLauncherVersion);
            if (cmp < 0) {
                UpdateModel.instance.set({ updateStatus: 'ready', updateManual: true });
                return false;
            }
        }
        return true;
    },

    update: function(startedByUser, successCallback) {
        const ver = UpdateModel.instance.get('lastVersion');
        if (!this.enabled) {
            logger.info('Updater is disabled');
            return;
        }
        if (SemVer.compareVersions(RuntimeInfo.version, ver) >= 0) {
            logger.info('You are using the latest version');
            return;
        }
        UpdateModel.instance.set({ updateStatus: 'downloading', updateError: null });
        logger.info('Downloading update', ver);
        Transport.httpGet({
            url: Links.UpdateDesktop.replace('{ver}', ver),
            file: 'KeeWeb-' + ver + '.zip',
            cache: !startedByUser,
            success: filePath => {
                UpdateModel.instance.set('updateStatus', 'extracting');
                logger.info('Extracting update file', this.UpdateCheckFiles, filePath);
                this.extractAppUpdate(filePath, err => {
                    if (err) {
                        logger.error('Error extracting update', err);
                        UpdateModel.instance.set({ updateStatus: 'error', updateError: 'Error extracting update' });
                    } else {
                        UpdateModel.instance.set({ updateStatus: 'ready', updateError: null });
                        if (!startedByUser) {
                            Backbone.trigger('update-app');
                        }
                        if (typeof successCallback === 'function') {
                            successCallback();
                        }
                    }
                });
            },
            error: function(e) {
                logger.error('Error downloading update', e);
                UpdateModel.instance.set({ updateStatus: 'error', updateError: 'Error downloading update' });
            }
        });
    },

    extractAppUpdate: function(updateFile, cb) {
        const expectedFiles = this.UpdateCheckFiles;
        const appPath = Launcher.getUserDataPath();
        const StreamZip = Launcher.req('node-stream-zip');
        StreamZip.setFs(Launcher.req('original-fs'));
        const zip = new StreamZip({ file: updateFile, storeEntries: true });
        zip.on('error', cb);
        zip.on('ready', () => {
            const containsAll = expectedFiles.every(expFile => {
                const entry = zip.entry(expFile);
                return entry && entry.isFile;
            });
            if (!containsAll) {
                return cb('Bad archive');
            }
            const validationError = this.validateArchiveSignature(updateFile, zip);
            if (validationError) {
                return cb('Invalid archive: ' + validationError);
            }
            zip.extract(null, appPath, err => {
                zip.close();
                if (err) {
                    return cb(err);
                }
                Launcher.deleteFile(updateFile);
                cb();
            });
        });
    },

    validateArchiveSignature: function(archivePath, zip) {
        if (!zip.comment) {
            return 'No comment in ZIP';
        }
        if (zip.comment.length !== 512) {
            return 'Bad comment length in ZIP: ' + zip.comment.length;
        }
        try {
            const zipFileData = Launcher.req('fs').readFileSync(archivePath);
            const verify = Launcher.req('crypto').createVerify('RSA-SHA256');
            verify.write(zipFileData.slice(0, zip.centralDirectory.headerOffset + 22));
            verify.end();
            const signature = window.Buffer.from(zip.comment, 'hex');
            if (!verify.verify(publicKey, signature)) {
                return 'Invalid signature';
            }
        } catch (err) {
            return err.toString();
        }
        return null;
    },

    checkAppCacheUpdateReady: function() {
        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
            try { window.applicationCache.swapCache(); } catch (e) { }
            UpdateModel.instance.set('updateStatus', 'ready');
        }
    }
};

module.exports = Updater;

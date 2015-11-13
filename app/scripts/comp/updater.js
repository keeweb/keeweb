'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('./runtime-info'),
    Links = require('../const/links'),
    Launcher = require('../comp/launcher'),
    AppSettingsModel = require('../models/app-settings-model'),
    UpdateModel = require('../models/update-model'),
    Transport = require('../comp/transport');

var Updater = {
    UpdateInterval: 1000*60*60*24,
    MinUpdateTimeout: 500*10,
    MinUpdateSize: 10000,
    UpdateCheckFiles: ['index.html', 'app.js'],
    nextCheckTimeout: null,
    updateCheckDate: new Date(0),
    enabledAutoUpdate: function() {
        return Launcher && AppSettingsModel.instance.get('autoUpdate');
    },
    init: function() {
        var willCheckNow = this.scheduleNextCheck();
        if (!willCheckNow && this.enabledAutoUpdate()) {
            this.check();
        }
    },
    scheduleNextCheck: function() {
        if (this.nextCheckTimeout) {
            clearTimeout(this.nextCheckTimeout);
            this.nextCheckTimeout = null;
        }
        if (!this.enabledAutoUpdate()) {
            return;
        }
        var timeDiff = this.MinUpdateTimeout;
        var lastCheckDate = UpdateModel.instance.get('lastCheckDate');
        if (lastCheckDate) {
            timeDiff = Math.min(Math.max(this.UpdateInterval + (lastCheckDate - new Date()), this.MinUpdateTimeout), this.UpdateInterval);
        }
        this.nextCheckTimeout = setTimeout(this.check.bind(this), timeDiff);
        console.log('Update check will happen in ' + Math.round(timeDiff / 1000) + ' s');
        return timeDiff === this.MinUpdateTimeout;
    },
    check: function(startedByUser) {
        if (!Launcher) {
            return;
        }
        UpdateModel.instance.set('status', 'checking');
        var that = this;
        if (!startedByUser) {
            // additional protection from broken program logic, to ensure that auto-checks are not performed more than once an hour
            var diffMs = new Date() - this.updateCheckDate;
            if (isNaN(diffMs) || diffMs < 1000 * 60 * 60) {
                console.error('Prevented update check; last check was performed at ' + this.updateCheckDate);
                that.scheduleNextCheck();
                return;
            }
            this.updateCheckDate = new Date();
        }
        console.log('Checking for update...');
        Transport.httpGet({
            url: Links.WebApp + 'manifest.appcache',
            utf8: true,
            success: function(data) {
                var dt = new Date();
                var match = data.match(/#\s*(\d+\-\d+\-\d+):v([\d+\.\w]+)/);
                console.log('Update check: ' + (match ? match[0] : 'unknown'));
                if (!match) {
                    var errMsg = 'No version info found';
                    UpdateModel.instance.set({ status: 'error', lastCheckDate: dt, lastCheckError: errMsg });
                    UpdateModel.instance.save();
                    that.scheduleNextCheck();
                    return;
                }
                UpdateModel.instance.set({
                    status: 'ok',
                    lastCheckDate: dt,
                    lastSuccessCheckDate: dt,
                    lastVersionReleaseDate: new Date(match[1]),
                    lastVersion: match[2],
                    lastcheckError: null
                });
                UpdateModel.instance.save();
                that.scheduleNextCheck();
                that.update(startedByUser);
            },
            error: function(e) {
                console.error('Update check error', e);
                UpdateModel.instance.set({
                    status: 'error',
                    lastCheckDate: new Date(),
                    lastCheckError: 'Error checking last version'
                });
                UpdateModel.instance.save();
                that.scheduleNextCheck();
            }
        });
    },
    update: function(startedByUser) {
        var ver = UpdateModel.instance.get('lastVersion');
        if (!Launcher || ver === RuntimeInfo.version || UpdateModel.instance.get('updateStatus')) {
            console.log('You are using the latest version');
            return;
        }
        UpdateModel.instance.set({ updateStatus: 'downloading', updateError: null });
        var that = this;
        console.log('Downloading update', ver);
        Transport.httpGet({
            url: Links.UpdateDesktop.replace('{ver}', ver),
            file: 'KeeWeb-' + ver + '.zip',
            cache: !startedByUser,
            success: function(filePath) {
                UpdateModel.instance.set('updateStatus', 'downloaded');
                console.error('Extracting update file', that.UpdateCheckFiles, filePath);
                that.extractAppUpdate(filePath, function(err) {
                    if (err) {
                        console.error('Error extracting update', err);
                        UpdateModel.instance.set({ updateStatus: 'error', updateError: 'Error extracting update' });
                    } else {
                        UpdateModel.instance.set({ updateStatus: 'ready', updateError: null });
                        Backbone.trigger('update-app');
                    }
                });
            },
            error: function(e) {
                console.error('Error downloading update', e);
                UpdateModel.instance.set({ updateStatus: 'error', updateError: 'Error downloading update' });
            }
        });
    },

    extractAppUpdate: function(updateFile, expectedFiles, cb) {
        var appPath = Launcher.getUserDataPath();
        var StreamZip = Launcher.req('node-stream-zip');
        var zip = new StreamZip({ file: updateFile, storeEntries: true });
        zip.on('error', cb);
        zip.on('ready', function() {
            var containsAll = expectedFiles.every(function(expFile) {
                var entry = zip.entry(expFile);
                return entry && entry.isFile;
            });
            if (!containsAll) {
                return cb('Bad archive');
            }
            zip.extract(null, appPath, function(err) {
                zip.close();
                if (err) {
                    return cb(err);
                }
                Launcher.req('fs').unlink(updateFile);
                cb();
            });
        });
    }
};

module.exports = Updater;

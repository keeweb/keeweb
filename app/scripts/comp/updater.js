'use strict';

var Backbone = require('backbone'),
    RuntimeInfo = require('./runtime-info'),
    Links = require('../const/links'),
    Launcher = require('../comp/launcher'),
    AppSettingsModel = require('../models/app-settings-model'),
    UpdateModel = require('../models/update-model');

var Updater = {
    UpdateInterval: 1000*60*60*24,
    MinUpdateTimeout: 500,
    MinUpdateSize: 100000,
    nextCheckTimeout: null,
    enabledAutoUpdate: function() {
        return Launcher && AppSettingsModel.instance.get('autoUpdate');
    },
    init: function() {
        var willCheckNow = this.scheduleNextCheck();
        if (!willCheckNow && this.enabledAutoUpdate()) {
            this.update();
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
        var timeDiff = this.StartupUpdateInterval;
        var lastCheckDate = UpdateModel.instance.get('lastCheckDate');
        if (lastCheckDate) {
            timeDiff = Math.min(Math.max(this.UpdateInterval + (lastCheckDate - new Date()), this.MinUpdateTimeout), this.UpdateInterval);
        }
        this.nextCheckTimeout = setTimeout(this.check.bind(this), timeDiff);
        return timeDiff === this.MinUpdateTimeout;
    },
    check: function() {
        if (!Launcher) {
            return;
        }
        UpdateModel.instance.set('status', 'checking');
        var that = this;
        // TODO: potential DDoS in case on any error! Introduce rate limiting here
        $.ajax({
            type: 'GET',
            url: Links.WebApp + 'manifest.appcache',
            dataType: 'text',
            success: function (data) {
                var dt = new Date();
                UpdateModel.instance.set('lastCheckDate', dt);
                var match = data.match(/#\s*(\d+\-\d+\-\d+):v([\d+\.\w]+)/);
                if (!match) {
                    var errMsg = 'No version info found';
                    UpdateModel.instance.set('lastError', errMsg);
                    UpdateModel.instance.set('status', 'error');
                    UpdateModel.instance.save();
                    that.scheduleNextCheck();
                    return;
                }
                UpdateModel.instance.set('lastSuccessCheckDate', dt);
                UpdateModel.instance.set('lastVersionReleaseDate', new Date(match[1]));
                UpdateModel.instance.set('lastVersion', match[2]);
                UpdateModel.instance.set('status', 'ok');
                UpdateModel.instance.save();
                that.scheduleNextCheck();
                if (that.enabledAutoUpdate()) {
                    that.update();
                }
            },
            error: function() {
                UpdateModel.instance.set('lastCheckDate', new Date());
                UpdateModel.instance.set('lastError', 'Error downloading last version info');
                UpdateModel.instance.set('status', 'error');
                UpdateModel.instance.save();
                that.scheduleNextCheck();
            }
        });
    },
    update: function() {
        if (!Launcher ||
            UpdateModel.instance.get('version') === RuntimeInfo.version ||
            UpdateModel.instance.get('updateStatus')) {
            return;
        }
        // TODO: potential DDoS in case on any error! Save file with version and check before the download
        UpdateModel.instance.set('updateStatus', 'downloading');
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', (function() {
            if (xhr.response.byteLength > this.MinUpdateSize) {
                UpdateModel.instance.set('updateStatus', 'downloaded');
                try {
                    Launcher.writeAppFile(xhr.response);
                } catch (e) {
                    console.error('Error writing updated file', e);
                    UpdateModel.instance.set('updateStatus', 'error');
                }
                Backbone.trigger('update-app');
            } else {
                console.error('Bad downloaded file size: ' + xhr.response.byteLength);
                UpdateModel.instance.set('updateStatus', 'error');
            }
        }).bind(this));
        xhr.addEventListener('error', updateFailed);
        xhr.addEventListener('abort', updateFailed);
        xhr.addEventListener('timeout', updateFailed);
        xhr.open('GET', Links.WebApp);
        xhr.responseType = 'arraybuffer';
        xhr.send();

        function updateFailed(e) {
            console.error('XHR error downloading update', e);
            UpdateModel.instance.set('updateStatus', 'error');
        }
    }
};

module.exports = Updater;

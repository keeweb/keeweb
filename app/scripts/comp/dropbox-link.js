'use strict';

var Dropbox = require('dropbox'),
    Alerts = require('./alerts'),
    Launcher = require('./launcher'),
    Logger = require('../util/logger'),
    Locale = require('../util/locale'),
    Links = require('../const/links');

var logger = new Logger('dropbox');

var DropboxKeys = {
    AppFolder: 'qp7ctun6qt5n9d6',
    AppFolderKeyParts: ['qp7ctun6', 'qt5n9d6'] // to allow replace key by sed, compare in this way
};

var DropboxCustomErrors = {
    BadKey: 'bad-key'
};

function isValidKey() {
    var isSelfHostedApp = !/^http(s?):\/\/localhost:8085/.test(location.href) &&
        !/http(s?):\/\/antelle\.github\.io\/keeweb/.test(location.href) &&
        !/http(s?):\/\/app\.keeweb\.info/.test(location.href);
    return Launcher || !isSelfHostedApp || DropboxKeys.AppFolder !== DropboxKeys.AppFolderKeyParts.join('');
}

var DropboxChooser = function(callback) {
    this.cb = callback;
    this.onMessage = this.onMessage.bind(this);
};

DropboxChooser.prototype.callback = function(err, res) {
    if (this.cb) {
        this.cb(err, res);
    }
    this.cb = null;
};

DropboxChooser.prototype.choose = function() {
    var windowFeatures = 'width=640,height=552,left=357,top=100,resizable=yes,location=yes';
    var url = this.buildUrl();
    this.popup = window.open(url, 'dropbox', windowFeatures);
    if (!this.popup) {
        return this.callback('Failed to open window');
    }
    window.addEventListener('message', this.onMessage);
    this.closeInt = setInterval(this.checkClose.bind(this), 200);
};

DropboxChooser.prototype.buildUrl = function() {
    var urlParams = {
        origin: encodeURIComponent(window.location.protocol + '//' + window.location.host),
        'app_key': DropboxKeys.AppFolder,
        'link_type': 'direct',
        trigger: 'js',
        multiselect: 'false',
        extensions: '',
        folderselect: 'false',
        iframe: 'false',
        version: 2
    };
    return 'https://www.dropbox.com/chooser?' + Object.keys(urlParams).map(function(key) {
        return key + '=' + urlParams[key];
    }).join('&');
};

DropboxChooser.prototype.onMessage = function(e) {
    if (e.source !== this.popup) {
        return;
    }
    var data = JSON.parse(e.data);
    switch (data.method) {
        case 'origin_request':
            e.source.postMessage(JSON.stringify({ method: 'origin' }), 'https://www.dropbox.com');
            break;
        case 'files_selected':
            this.popup.close();
            this.success(data.params);
            break;
        case 'close_dialog':
            this.popup.close();
            break;
        case 'web_session_error':
        case 'web_session_unlinked':
            this.callback(data.method);
            break;
        case 'resize':
            this.popup.resize(data.params);
            break;
        case 'error':
            this.callback(data.params);
            break;
    }
};

DropboxChooser.prototype.checkClose = function() {
    if (this.popup.closed) {
        clearInterval(this.closeInt);
        window.removeEventListener('message', this.onMessage);
        if (!this.result) {
            this.callback('closed');
        }
    }
};

DropboxChooser.prototype.success = function(params) {
    /* jshint camelcase:false */
    if (!params || !params[0] || !params[0].link || params[0].is_dir) {
        return this.callback('bad result');
    }
    this.result = params[0];
    this.readFile(this.result.link);
};

DropboxChooser.prototype.readFile = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', (function() {
        this.callback(null, { name: this.result.name, data: xhr.response });
    }).bind(this));
    xhr.addEventListener('error', this.callback.bind(this, 'download error'));
    xhr.addEventListener('abort', this.callback.bind(this, 'download abort'));
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.send();
};

var DropboxLink = {
    ERROR_CONFLICT: Dropbox.ApiError.CONFLICT,
    ERROR_NOT_FOUND: Dropbox.ApiError.NOT_FOUND,
    _getClient: function(complete) {
        if (this._dropboxClient && this._dropboxClient.isAuthenticated()) {
            complete(null, this._dropboxClient);
            return;
        }
        if (!isValidKey()) {
            Alerts.error({
                icon: 'dropbox',
                header: Locale.dropboxNotConfigured,
                body: Locale.dropboxNotConfiguredBody1 + '<br/>' + Locale.dropboxNotConfiguredBody2.replace('{}',
                        '<a href="' + Links.SelfHostedDropbox + '" target="blank">' + Locale.dropboxNotConfiguredLink + '</a>')
            });
            return complete(DropboxCustomErrors.BadKey);
        }
        var client = new Dropbox.Client({key: DropboxKeys.AppFolder});
        if (Launcher) {
            client.authDriver(new Dropbox.AuthDriver.Electron({ receiverUrl: location.href }));
        } else {
            client.authDriver(new Dropbox.AuthDriver.Popup({ receiverUrl: location.href }));
        }
        client.authenticate((function(error, client) {
            if (!error) {
                this._dropboxClient = client;
            }
            complete(error, client);
        }).bind(this));
    },

    _handleUiError: function(err, alertCallback, callback) {
        if (!alertCallback) {
            if (!Alerts.alertDisplayed) {
                alertCallback = Alerts.error.bind(Alerts);
            }
        }
        logger.error('Dropbox error', err);
        switch (err.status) {
            case Dropbox.ApiError.INVALID_TOKEN:
                if (!Alerts.alertDisplayed) {
                    Alerts.yesno({
                        icon: 'dropbox',
                        header: Locale.dropboxLogin,
                        body: Locale.dropboxLoginBody,
                        buttons: [{result: 'yes', title: Locale.alertSignIn}, {result: '', title: Locale.alertCancel}],
                        success: (function () {
                            this.authenticate(function (err) { callback(!err); });
                        }).bind(this),
                        cancel: function () {
                            callback(false);
                        }
                    });
                    return;
                }
                break;
            case Dropbox.ApiError.NOT_FOUND:
                alertCallback({
                    header: Locale.dropboxSyncError,
                    body: Locale.dropboxNotFoundBody
                });
                break;
            case Dropbox.ApiError.OVER_QUOTA:
                alertCallback({
                    header: Locale.dropboxFull,
                    body: Locale.dropboxFullBody
                });
                break;
            case Dropbox.ApiError.RATE_LIMITED:
                alertCallback({
                    header: Locale.dropboxSyncError,
                    body: Locale.dropboxRateLimitedBody
                });
                break;
            case Dropbox.ApiError.NETWORK_ERROR:
                alertCallback({
                    header: Locale.dropboxNetError,
                    body: Locale.dropboxNetErrorBody
                });
                break;
            case Dropbox.ApiError.INVALID_PARAM:
            case Dropbox.ApiError.OAUTH_ERROR:
            case Dropbox.ApiError.INVALID_METHOD:
                alertCallback({
                    header: Locale.dropboxSyncError,
                    body: Locale.dropboxErrorBody + err.status
                });
                break;
            case Dropbox.ApiError.CONFLICT:
                break;
            default:
                alertCallback({
                    header: Locale.dropboxSyncError,
                    body: Locale.dropboxErrorRepeatBody + err
                });
                break;
        }
        callback(false);
    },

    _callAndHandleError: function(callName, args, callback, errorAlertCallback) {
        var that = this;
        this._getClient(function(err, client) {
            if (err) {
                return callback(err);
            }
            var ts = logger.ts();
            logger.debug('Call', callName);
            client[callName].apply(client, args.concat(function(err) {
                logger.debug('Result', callName, logger.ts(ts), arguments);
                if (err) {
                    that._handleUiError(err, errorAlertCallback, function(repeat) {
                        if (repeat) {
                            that._callAndHandleError(callName, args, callback, errorAlertCallback);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback.apply(null, arguments);
                }
            }));
        });
    },

    authenticate: function(copmlete) {
        this._getClient(function(err) { copmlete(err); });
    },

    receive: function() {
        Dropbox.AuthDriver.Popup.oauthReceiver();
    },

    saveFile: function(fileName, data, rev, complete, alertCallback) {
        if (rev) {
            var opts = typeof rev === 'string' ? { lastVersionTag: rev, noOverwrite: true, noAutoRename: true } : undefined;
            this._callAndHandleError('writeFile', [fileName, data, opts], complete, alertCallback);
        } else {
            this.getFileList((function(err, files) {
                if (err) { return complete(err); }
                var exists = files.some(function(file) { return file.toLowerCase() === fileName.toLowerCase(); });
                if (exists) { return complete({ exists: true }); }
                this._callAndHandleError('writeFile', [fileName, data], complete);
            }).bind(this));
        }
    },

    openFile: function(fileName, complete, errorAlertCallback) {
        this._callAndHandleError('readFile', [fileName, { arrayBuffer: true }], complete, errorAlertCallback);
    },

    stat: function(fileName, complete, errorAlertCallback) {
        this._callAndHandleError('stat', [fileName], complete, errorAlertCallback);
    },

    getFileList: function(complete) {
        this._callAndHandleError('readdir', [''], function(err, files, dirStat, filesStat) {
            if (files) {
                files = files.filter(function(f) { return /\.kdbx$/i.test(f); });
            }
            complete(err, files, dirStat, filesStat);
        });
    },

    deleteFile: function(fileName, complete) {
        this._callAndHandleError('remove', [fileName], complete);
    },

    chooseFile: function(callback) {
        new DropboxChooser(callback).choose();
    }
};

module.exports = DropboxLink;

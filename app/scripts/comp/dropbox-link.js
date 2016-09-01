'use strict';

var Dropbox = require('dropbox'),
    Alerts = require('./alerts'),
    Launcher = require('./launcher'),
    Logger = require('../util/logger'),
    Locale = require('../util/locale'),
    UrlUtil = require('../util/url-util'),
    AppSettingsModel = require('../models/app-settings-model');

var logger = new Logger('dropbox');

var DropboxKeys = {
    AppFolder: 'qp7ctun6qt5n9d6',
    FullDropbox: 'eor7hvv6u6oslq9'
};

var DropboxCustomErrors = {
    BadKey: 'bad-key'
};

function getKey() {
    return AppSettingsModel.instance.get('dropboxAppKey') || DropboxKeys.AppFolder;
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
        'app_key': getKey(),
        'link_type': 'direct',
        trigger: 'js',
        multiselect: 'false',
        extensions: '',
        folderselect: 'false',
        iframe: 'false',
        version: 2
    };
    return 'https://www.dropbox.com/chooser?' + Object.keys(urlParams).map(key => {
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
    if (!params || !params[0] || !params[0].link || params[0].is_dir) {
        return this.callback('bad result');
    }
    this.result = params[0];
    this.readFile(this.result.link);
};

DropboxChooser.prototype.readFile = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
        this.callback(null, { name: this.result.name, data: xhr.response });
    });
    xhr.addEventListener('error', this.callback.bind(this, 'download error'));
    xhr.addEventListener('abort', this.callback.bind(this, 'download abort'));
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.send();
};

var DropboxLink = {
    ERROR_CONFLICT: Dropbox.ApiError.CONFLICT,
    ERROR_NOT_FOUND: Dropbox.ApiError.NOT_FOUND,

    Keys: DropboxKeys,

    _getClient: function(complete, overrideAppKey) {
        if (this._dropboxClient && this._dropboxClient.isAuthenticated()) {
            complete(null, this._dropboxClient);
            return;
        }
        if (!overrideAppKey && !this.isValidKey()) {
            return complete(DropboxCustomErrors.BadKey);
        }
        var client = new Dropbox.Client({key: overrideAppKey || getKey()});
        if (Launcher) {
            client.authDriver(new Dropbox.AuthDriver.Electron({ receiverUrl: location.href }));
        } else {
            client.authDriver(new Dropbox.AuthDriver.Popup({ receiverUrl: location.href }));
        }
        client.authenticate((error, client) => {
            if (!error) {
                this._dropboxClient = client;
            }
            complete(error, client);
        });
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
                        success: () => {
                            this.authenticate(err => { callback(!err); });
                        },
                        cancel: () => {
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
                    body: Locale.dropboxErrorBody + ' ' + err.status
                });
                break;
            case Dropbox.ApiError.CONFLICT:
                break;
            default:
                alertCallback({
                    header: Locale.dropboxSyncError,
                    body: Locale.dropboxErrorRepeatBody + ' ' + err
                });
                break;
        }
        callback(false);
    },

    _callAndHandleError: function(callName, args, callback, errorAlertCallback) {
        this._getClient((err, client) => {
            if (err) {
                return callback(err);
            }
            var ts = logger.ts();
            logger.debug('Call', callName);
            client[callName].apply(client, args.concat((...args) => {
                let [err] = args;
                logger.debug('Result', callName, logger.ts(ts), args);
                if (err) {
                    this._handleUiError(err, errorAlertCallback, repeat => {
                        if (repeat) {
                            this._callAndHandleError(callName, args, callback, errorAlertCallback);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(...args);
                }
            }));
        });
    },

    canUseBuiltInKeys: function() {
        var isSelfHosted = !/^http(s?):\/\/localhost:8085/.test(location.href) &&
            !/http(s?):\/\/(app|beta)\.keeweb\.info/.test(location.href);
        return !!Launcher || !isSelfHosted;
    },

    getKey: getKey,

    isValidKey: function() {
        var key = getKey();
        var isBuiltIn = key === DropboxKeys.AppFolder || key === DropboxKeys.FullDropbox;
        return key && key.indexOf(' ') < 0 && (!isBuiltIn || this.canUseBuiltInKeys());
    },

    authenticate: function(complete, overrideAppKey) {
        this._getClient(err => { complete(err); }, overrideAppKey);
    },

    logout: function() {
        if (this._dropboxClient) {
            try {
                this._dropboxClient.signOut();
            } catch (e) {
            } finally {
                this._dropboxClient.reset();
            }
        }
    },

    resetClient: function() {
        this._dropboxClient = null;
    },

    receive: function() {
        Dropbox.AuthDriver.Popup.oauthReceiver();
    },

    saveFile: function(fileName, data, rev, complete, alertCallback) {
        if (rev) {
            var opts = typeof rev === 'string' ? { lastVersionTag: rev, noOverwrite: true, noAutoRename: true } : undefined;
            this._callAndHandleError('writeFile', [fileName, data, opts], complete, alertCallback);
        } else {
            var dir = UrlUtil.fileToDir(fileName);
            this.list(dir, (err, files) => {
                if (err) { return complete(err); }
                var exists = files.some(file => file.toLowerCase() === fileName.toLowerCase());
                if (exists) { return complete({ exists: true }); }
                this._callAndHandleError('writeFile', [fileName, data], complete);
            });
        }
    },

    openFile: function(fileName, complete, errorAlertCallback) {
        this._callAndHandleError('readFile', [fileName, { arrayBuffer: true }], complete, errorAlertCallback);
    },

    stat: function(fileName, complete, errorAlertCallback) {
        this._callAndHandleError('stat', [fileName], complete, errorAlertCallback);
    },

    list: function(dir, complete) {
        this._callAndHandleError('readdir', [dir || ''], (err, files, dirStat, filesStat) => {
            if (files) {
                files = files.filter(f => /\.kdbx$/i.test(f));
            }
            complete(err, files, dirStat, filesStat);
        });
    },

    deleteFile: function(fileName, complete) {
        this._callAndHandleError('remove', [fileName], complete);
    },

    mkdir: function(path, complete) {
        this._callAndHandleError('mkdir', [path], complete);
    },

    canChooseFile: function() {
        return !Launcher;
    },

    chooseFile: function(callback) {
        new DropboxChooser(callback).choose();
    }
};

module.exports = DropboxLink;

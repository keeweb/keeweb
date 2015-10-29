'use strict';

var Dropbox = require('dropbox'),
    Alerts = require('./alerts');

var DropboxKeys = {
    AppFolder: 'qp7ctun6qt5n9d6'
};

var DropboxLink = {
    _getClient: function(complete) {
        if (this._dropboxClient && this._dropboxClient.isAuthenticated()) {
            complete(null, this._dropboxClient);
            return;
        }
        var client = new Dropbox.Client({ key: DropboxKeys.AppFolder });
        client.authDriver(new Dropbox.AuthDriver.Popup({ receiverUrl: location.href }));
        client.authenticate((function(error, client) {
            if (!error) {
                this._dropboxClient = client;
            }
            complete(error, client);
        }).bind(this));
    },

    _handleUiError: function(err, callback) {
        switch (err.status) {
            case Dropbox.ApiError.INVALID_TOKEN:
                Alerts.yesno({
                    icon: 'dropbox',
                    header: 'Dropbox Login',
                    body: 'To continue, you have to sign in to Dropbox.',
                    buttons: [{result: 'yes', title: 'Sign In'}, {result: '', title: 'Cancel'}],
                    success: (function() {
                        this.authenticate(function(err) { callback(!err); });
                    }).bind(this),
                    cancel: function() { callback(false); }
                });
                return;
            case Dropbox.ApiError.NOT_FOUND:
                Alerts.error({
                    header: 'Dropbox Sync Error',
                    body: 'The file was not found. Has it been removed from another computer?'
                });
                break;
            case Dropbox.ApiError.OVER_QUOTA:
                Alerts.error({
                    header: 'Dropbox Full',
                    body: 'Your Dropbox is full, there\'s no space left anymore.'
                });
                break;
            case Dropbox.ApiError.RATE_LIMITED:
                Alerts.error({
                    header: 'Dropbox Sync Error',
                    body: 'Too many requests to Dropbox have been made by this app. Please, try again later.'
                });
                break;
            case Dropbox.ApiError.NETWORK_ERROR:
                Alerts.error({
                    header: 'Dropbox Sync Network Error',
                    body: 'Network error occured during Dropbox sync. Please, check your connection and try again.'
                });
                break;
            case Dropbox.ApiError.INVALID_PARAM:
            case Dropbox.ApiError.OAUTH_ERROR:
            case Dropbox.ApiError.INVALID_METHOD:
                Alerts.error({
                    header: 'Dropbox Sync Error',
                    body: 'Something went wrong during Dropbox sync. Please, try again later. Error code: ' + err.status
                });
                break;
            default:
                Alerts.error({
                    header: 'Dropbox Sync Error',
                    body: 'Something went wrong during Dropbox sync. Please, try again later. Error: ' + err
                });
                break;
        }
        callback(false);
    },

    _callAndHandleError: function(callName, args, callback) {
        var that = this;
        this._getClient(function(err, client) {
            if (err) {
                return callback(err);
            }
            client[callName].apply(client, args.concat(function(err, res) {
                if (err) {
                    that._handleUiError(err, function(repeat) {
                        if (repeat) {
                            that._callAndHandleError(callName, args, callback);
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err, res);
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

    saveFile: function(fileName, data, overwrite, complete) {
        if (overwrite) {
            this._callAndHandleError('writeFile', [fileName, data], complete);
        } else {
            this.getFileList((function(err, files) {
                if (err) { return complete(err); }
                var exists = files.some(function(file) { return file.toLowerCase() === fileName.toLowerCase(); });
                if (exists) { return complete({ exists: true }); }
                this._callAndHandleError('writeFile', [fileName, data], complete);
            }).bind(this));
        }
    },

    openFile: function(fileName, complete) {
        this._callAndHandleError('readFile', [fileName, { blob: true }], complete);
    },

    getFileList: function(complete) {
        this._callAndHandleError('readdir', [''], function(err, files) {
            if (files) {
                files = files.filter(function(f) { return /\.kdbx$/i.test(f); });
            }
            complete(err, files);
        });
    }
};

module.exports = DropboxLink;

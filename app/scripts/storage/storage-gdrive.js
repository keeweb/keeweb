'use strict';

var StorageBase = require('./storage-base'),
    Backbone = require('backbone'),
    Timeouts = require('../const/timeouts');

var StorageGDrive = StorageBase.extend({
    name: 'gdrive',
    icon: '',
    enabled: true,
    uipos: 30,

    _clientId: '847548101761-koqkji474gp3i2gn3k5omipbfju7pbt1.apps.googleusercontent.com',
    _gapi: null,

    iconSvg: '<svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" version="1.1">' +
        '<path d="M120.76421 71.989219 84.87226 9.6679848l-41.828196 0 35.899791 62.3212342zM58.014073 56.294956 37.107816 19.986746 1.2237094 82.284404 ' +
        '22.137808 118.59261Zm-21.415974 63.012814 69.180421 0 20.9141-39.459631-67.635587 0z"/></svg>',

    load: function(path, opts, callback) {
        var that = this;
        that.stat(path, opts, function(err, stat) {
            if (err) { return callback && callback(err); }
            that.logger.debug('Load', path);
            var ts = that.logger.ts();
            var url = 'https://www.googleapis.com/drive/v3/files/{id}/revisions/{rev}?alt=media'
                .replace('{id}', path)
                .replace('{rev}', stat.rev);
            that._xhr({
                url: url,
                responseType: 'arraybuffer',
                headers: { 'Authorization': that._getAuthHeader() },
                success: function(response) {
                    that.logger.debug('Loaded', path, stat.rev, that.logger.ts(ts));
                    return callback && callback(null, response, { rev: stat.rev });
                },
                error: function(err) {
                    that.logger.debug('Load error', path, err, that.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    stat: function(path, opts, callback) {
        var that = this;
        this._getClient(function(err) {
            if (err) {
                return callback && callback(err);
            }
            that.logger.debug('Stat', path);
            var ts = that.logger.ts();
            var url = 'https://www.googleapis.com/drive/v3/files/{id}?fields=headRevisionId'
                .replace('{id}', path);
            that._xhr({
                url: url,
                responseType: 'json',
                headers: { 'Authorization': that._getAuthHeader() },
                success: function(response) {
                    var rev = response.headRevisionId;
                    that.logger.debug('Stated', path, rev, that.logger.ts(ts));
                    return callback && callback(null, { rev: rev });
                },
                error: function(err) {
                    that.logger.error('Stat error', that.logger.ts(ts), resp.result.error);
                    return callback && callback(err);
                }
            });
        });
    },

    save: function(path, opts, data, callback, rev) {
        var that = this;
        that.stat(path, opts, function(err, stat) {
            if (rev) {
                if (err) { return callback && callback(err); }
                if (stat.rev !== rev) {
                    return callback && callback({revConflict: true}, stat);
                }
            }
            that.logger.debug('Save', path);
            var ts = that.logger.ts();
            var url = 'https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media&fields=headRevisionId'
                .replace('{id}', path)
                .replace('{rev}', stat.rev);
            that._xhr({
                url: url,
                method: 'PATCH',
                responseType: 'json',
                headers: { 'Authorization': that._getAuthHeader() },
                data: new Blob([data], {type: 'application/octet-stream'}),
                success: function(response) {
                    that.logger.debug('Saved', path, that.logger.ts(ts));
                    var newRev = response.headRevisionId;
                    if (!newRev) {
                        return callback && callback('save error: no rev');
                    }
                    return callback && callback(null, { rev: newRev });
                },
                error: function(err) {
                    that.logger.debug('Save error', path, err, that.logger.ts(ts));
                    return callback && callback(err);
                }
            });
        });
    },

    list: function(callback) {
        var that = this;
        this._getClient(function(err) {
            if (err) { return callback && callback(err); }
            that.logger.debug('List');
            var url = 'https://www.googleapis.com/drive/v3/files?fields={fields}&q={q}'
                .replace('{fields}', encodeURIComponent('files'))
                .replace('{q}', encodeURIComponent('fileExtension="kdbx" and mimeType="application/octet-stream" and trashed=false'));
            var ts = that.logger.ts();
            that._xhr({
                url: url,
                responseType: 'json',
                headers: { 'Authorization': that._getAuthHeader() },
                success: function(response) {
                    that.logger.debug('Listed', that.logger.ts(ts));
                    if (!response) {
                        return callback && callback('list error');
                    }
                    var fileList = response.files.map(function(f) {
                        return {
                            name: f.name,
                            path: f.id,
                            rev: f.headRevisionId
                        };
                    });
                    return callback && callback(null, fileList);
                },
                error: function(err) {
                    that.logger.error('List error', that.logger.ts(ts), err);
                    return callback && callback(err);
                }
            });
        });
    },

    _getClient: function(callback) {
        var that = this;
        if (that._gapi) {
            return that._authorize(callback);
        }
        that._gapiLoadTimeout = setTimeout(function() {
            callback('Gdrive api load timeout');
            delete that._gapiLoadTimeout;
        }, Timeouts.ScriptLoad);
        if (that._gapi) {
            that._authorize.bind(callback);
        } else {
            that.logger.debug('Loading gapi client');
            window.gApiClientLoaded = function() {
                if (that._gapiLoadTimeout) {
                    that.logger.debug('Loaded gapi client');
                    delete window.gDriveClientLoaded;
                    that._gapi = window.gapi;
                    that._authorize(callback);
                }
            };
            $.getScript('https://apis.google.com/js/client.js?onload=gApiClientLoaded', function() {
                that.logger.debug('Loaded gapi script');
            }).fail(function() {
                that.logger.error('Failed to load gapi');
                return callback('gapi load failed');
            });
        }
    },

    _authorize: function(callback) {
        var that = this;
        var scopes = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.file'];
        if (that._gapi.auth.getToken()) {
            return callback();
        }
        that._gapi.auth.authorize({'client_id': that._clientId, scope: scopes, immediate: true}, function(res) {
            if (res && !res.error) {
                callback();
            } else {
                that.logger.debug('Authorizing...');
                var handlePopupClosed = function() {
                    that.logger.debug('Auth popup closed');
                    Backbone.off('popup-closed', handlePopupClosed);
                    callback('popup closed');
                    callback = null;
                };
                Backbone.on('popup-closed', handlePopupClosed);
                var ts = that.logger.ts();
                that._gapi.auth.authorize({'client_id': that._clientId, scope: scopes, immediate: false}, function(res) {
                    if (!callback) {
                        return;
                    }
                    Backbone.off('popup-closed', handlePopupClosed);
                    if (res && !res.error) {
                        that.logger.debug('Authorized', that.logger.ts(ts));
                        callback();
                    } else {
                        that.logger.error('Authorize error', that.logger.ts(ts), res);
                        callback(res && res.error || 'authorize error');
                    }
                });
            }
        });
    },

    _getAuthHeader: function() {
        // jshint camelcase:false
        var token = this._gapi.auth.getToken();
        return token.token_type + ' ' + token.access_token;
    }
});

module.exports = StorageGDrive;

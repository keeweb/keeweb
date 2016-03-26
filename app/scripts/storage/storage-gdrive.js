'use strict';

var Backbone = require('backbone'),
    Logger = require('../util/logger'),
    Timeouts = require('../const/timeouts');

var logger = new Logger('storage-gdrive');

var StorageGDrive = {
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
            logger.debug('Load', path);
            var ts = logger.ts();
            var url = 'https://www.googleapis.com/drive/v3/files/{id}/revisions/{rev}?alt=media'
                .replace('{id}', path)
                .replace('{rev}', stat.rev);
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.addEventListener('load', function() {
                if (xhr.status !== 200) {
                    logger.debug('Load error', path, 'http status ' + xhr.status, logger.ts(ts));
                    return callback && callback('load error ' + xhr.status);
                }
                logger.debug('Loaded', path, stat.rev, logger.ts(ts));
                return callback && callback(null, xhr.response, { rev: stat.rev });
            });
            xhr.addEventListener('error', function() {
                logger.debug('Load error', path, logger.ts(ts));
                return callback && callback('network error');
            });
            xhr.open('GET', url);
            xhr.setRequestHeader('Authorization', that._getAuthHeader());
            xhr.send();
        });
    },

    stat: function(path, opts, callback) {
        var that = this;
        this._getClient(function(err) {
            if (err) {
                return callback && callback(err);
            }
            logger.debug('Stat', path);
            var ts = logger.ts();
            that._gapi.client.drive.files.get({
                fileId: path,
                fields: 'headRevisionId'
            }).then(function (resp) {
                var rev = resp.result.headRevisionId;
                logger.debug('Stated', path, rev, logger.ts(ts));
                return callback && callback(null, { rev: rev });
            }, function(resp) {
                logger.error('Stat error', logger.ts(ts), resp.result.error);
                return callback && callback(resp.result.error.message || 'stat error');
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
            logger.debug('Save', path);
            var ts = logger.ts();
            var url = 'https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=media&fields=headRevisionId'
                .replace('{id}', path)
                .replace('{rev}', stat.rev);
            var xhr = new XMLHttpRequest();
            xhr.responseType = 'json';
            xhr.addEventListener('load', function() {
                if (xhr.status !== 200) {
                    logger.debug('Save error', path, 'http status ' + xhr.status, logger.ts(ts));
                    return callback && callback('load error ' + xhr.status);
                }
                logger.debug('Saved', path, logger.ts(ts));
                var newRev = xhr.response.headRevisionId;
                if (!newRev) {
                    return callback && callback('save error: no rev');
                }
                return callback && callback(null, { rev: newRev });
            });
            xhr.addEventListener('error', function() {
                logger.debug('Save error', path, logger.ts(ts));
                return callback && callback('network error');
            });
            xhr.open('PATCH', url);
            xhr.setRequestHeader('Authorization', that._getAuthHeader());
            var blob = new Blob([data], {type: 'application/octet-stream'});
            xhr.send(blob);
        });
    },

    list: function(callback) {
        var that = this;
        this._getClient(function(err) {
            if (err) { return callback && callback(err); }
            logger.debug('List');
            var ts = logger.ts();
            that._gapi.client.drive.files.list({
                fields: 'files',
                q: 'fileExtension="kdbx" and mimeType="application/octet-stream" and trashed=false'
            }).then(function(resp) {
                logger.debug('Listed', logger.ts(ts));
                if (!resp.result.files) {
                    return callback && callback('list error');
                }
                var fileList = resp.result.files.map(function(f) {
                    return {
                        name: f.name,
                        path: f.id,
                        rev: f.headRevisionId
                    };
                });
                return callback && callback(null, fileList);
            }, function(resp) {
                logger.error('List error', logger.ts(ts), resp.result.error);
                return callback && callback(resp.result.error.message || 'list error');
            });
        });
    },

    _getClient: function(callback) {
        var that = this;
        if (that._gapi && that._gapi.client.drive) {
            return that._authorize(callback);
        }
        that._gapiLoadTimeout = setTimeout(function() {
            callback('Gdrive api load timeout');
            delete that._gapiLoadTimeout;
        }, Timeouts.ScriptLoad);
        if (that._gapi) {
            that._loadDriveApi(that._authorize.bind(that, callback));
        } else {
            logger.debug('Loading gapi client');
            window.gApiClientLoaded = function() {
                if (that._gapiLoadTimeout) {
                    logger.debug('Loaded gapi client');
                    delete window.gDriveClientLoaded;
                    that._gapi = window.gapi;
                    that._loadDriveApi(that._authorize.bind(that, callback));
                }
            };
            $.getScript('https://apis.google.com/js/client.js?onload=gApiClientLoaded', function() {
                logger.debug('Loaded gapi script');
            }).fail(function() {
                logger.error('Failed to load gapi');
                return callback('gapi load failed');
            });
        }
    },

    _loadDriveApi: function(callback) {
        logger.debug('Loading gdrive api');
        var that = this;
        this._gapi.client.load('drive', 'v3', function(result) {
            if (that._gapiLoadTimeout) {
                clearTimeout(that._gapiLoadTimeout);
                delete that._gapiLoadTimeout;
                logger.debug('Loaded gdrive api');
                if (result && result.error) {
                    logger.error('Error loading gdrive api', result.error);
                    callback(result.error);
                } else {
                    callback();
                }
            }
        });
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
                logger.debug('Authorizing...');
                var handlePopupClosed = function() {
                    logger.debug('Auth popup closed');
                    Backbone.off('popup-closed', handlePopupClosed);
                    callback('popup closed');
                    callback = null;
                };
                Backbone.on('popup-closed', handlePopupClosed);
                var ts = logger.ts();
                that._gapi.auth.authorize({'client_id': that._clientId, scope: scopes, immediate: false}, function(res) {
                    if (!callback) {
                        return;
                    }
                    Backbone.off('popup-closed', handlePopupClosed);
                    if (res && !res.error) {
                        logger.debug('Authorized', logger.ts(ts));
                        callback();
                    } else {
                        logger.error('Authorize error', logger.ts(ts), res);
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
};

module.exports = StorageGDrive;

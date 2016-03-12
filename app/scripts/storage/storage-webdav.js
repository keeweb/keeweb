'use strict';

var Logger = require('../util/logger');

var logger = new Logger('storage-webdav');

var StorageDropbox = {
    name: 'webdav',
    icon: 'server',
    enabled: true,

    openFields: [
        { id: 'path', title: 'openUrl', desc: 'openUrlDesc', type: 'text', required: true },
        { id: 'user', title: 'openUser', desc: 'openUserDesc', placeholder: 'openUserPlaceholder', type: 'text' },
        { id: 'password', title: 'openPass', desc: 'openPassDesc', placeholder: 'openPassPlaceholder', type: 'password' }
    ],

    load: function(path, opts, callback) {
        logger.debug('Load', path);
        this._request({
            op: 'Load',
            method: 'GET',
            path: path,
            user: opts ? opts.user : null,
            password: opts ? opts.password : null
        }, callback ? function(err, xhr, stat) {
            callback(err, xhr.response, stat);
        } : null);
    },

    stat: function(path, opts, callback) {
        logger.debug('Stat', path);
        this._request({
            op: 'Stat',
            method: 'HEAD',
            path: path,
            user: opts ? opts.user : null,
            password: opts ? opts.password : null
        }, callback ? function(err, xhr, stat) {
            callback(err, stat);
        } : null);
    },

    save: function(path, opts, data, callback, rev) {
        logger.debug('Save', path, rev);
        var etag, lastModified;
        if (rev && rev.charAt(0) === 'E') {
            etag = rev.substr(1);
        } else if (rev && rev.charAt(0) === 'T') {
            lastModified = rev.substr(1);
        }
        var cb = callback ? function(err, xhr, stat) {
            callback(err, stat);
        } : null;
        var saveOpts = {
            op: 'Save',
            method: 'POST',
            path: path,
            user: opts ? opts.user : null,
            password: opts ? opts.password : null,
            data: data,
            etag: etag
        };
        if (lastModified) {
            logger.debug('Stat before save', path, rev);
            this.stat(path, opts, function(err, stat) {
                if (err) { return cb(err); }
                if (stat.rev !== rev) {
                    logger.debug('Save error', path, 'rev conflict', stat.rev, rev);
                    return cb({ revConflict: true });
                }
                this._request(saveOpts, cb);
            });
        } else {
            this._request(saveOpts, cb);
        }
    },

    _request: function(config, callback) {
        var ts = logger.ts();
        var xhr = new XMLHttpRequest();
        xhr.addEventListener('load', function() {
            if (xhr.status !== 200) {
                logger.debug(config.op + ' error', config.path, xhr.status, logger.ts(ts));
                var err;
                switch (xhr.status) {
                    case 404:
                        err = { notFound: true };
                        break;
                    case 412:
                        err = { revConflict: true };
                        break;
                    default:
                        err = 'HTTP status ' + xhr.status;
                        break;
                }
                if (callback) { callback(err); callback = null; }
                return;
            }
            var rev = xhr.getResponseHeader('ETag');
            if (rev) {
                rev = 'E' + rev;
            } else {
                rev = xhr.getResponseHeader('Last-Modified');
                if (rev) {
                    rev = 'T' + rev;
                }
            }
            if (!rev) {
                logger.debug(config.op + ' error', config.path, 'no headers', logger.ts(ts));
                if (callback) { callback('No header ETag or Last-Modified'); callback = null; }
                return;
            }
            logger.debug(config.op + 'ed', config.path, rev, logger.ts(ts));
            if (callback) { callback(null, xhr, rev ? { rev: rev } : null); callback = null; }
        });
        xhr.addEventListener('error', function() {
            logger.debug(config.op + ' error', config.path, logger.ts(ts));
            if (callback) { callback('network error'); callback = null; }
        });
        xhr.addEventListener('abort', function() {
            logger.debug(config.op + ' error', config.path, 'aborted', logger.ts(ts));
            if (callback) { callback('aborted'); callback = null; }
        });
        xhr.responseType = 'arraybuffer';
        xhr.open(config.method, config.path);
        if (config.user) {
            xhr.setRequestHeader('Authorization', 'Basic ' + btoa(config.user + ':' + config.password));
        }
        if (config.etag) {
            xhr.setRequestHeader('If-Match', config.etag);
        }
        if (config.data) {
            var blob = new Blob([config.data], {type: 'application/octet-stream'});
            xhr.send(blob);
        } else {
            xhr.send();
        }
    }
};

module.exports = StorageDropbox;

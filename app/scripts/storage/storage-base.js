'use strict';

var Backbone = require('backbone'),
    Logger = require('../util/logger'),
    AppSettingsModel = require('../models/app-settings-model'),
    RuntimeDataModel = require('../models/runtime-data-model');

var StorageBase = function() {
};

_.extend(StorageBase.prototype, {
    name: null,
    icon: null,
    iconSvg: null,
    enabled: false,
    system: false,
    uipos: null,

    logger: null,
    appSettings: AppSettingsModel.instance,
    runtimeData: RuntimeDataModel.instance,

    init: function() {
        if (!this.name) {
            throw 'Failed to init provider: no name';
        }
        if (!this.system) {
            var enabled = this.appSettings.get(this.name);
            if (typeof enabled === 'boolean') {
                this.enabled = enabled;
            }
        }
        this.logger = new Logger('storage-' + this.name);
        return this;
    },

    _xhr: function(config) {
        var xhr = new XMLHttpRequest();
        if (config.responseType) {
            xhr.responseType = config.responseType;
        }
        var statuses = config.statuses || [200];
        xhr.addEventListener('load', function() {
            if (statuses.indexOf(xhr.status) < 0) {
                return config.error && config.error('http status ' + xhr.status, xhr);
            }
            return config.success && config.success(xhr.response, xhr);
        });
        xhr.addEventListener('error', function() {
            return config.error && config.error('network error');
        });
        xhr.addEventListener('timeout', function() {
            return config.error && config.error('timeout');
        });
        xhr.open(config.method || 'GET', config.url);
        if (this._oauthToken) {
            xhr.setRequestHeader('Authorization',
                this._oauthToken.tokenType + ' ' + this._oauthToken.accessToken);
        }
        _.forEach(config.headers, function(value, key) {
            xhr.setRequestHeader(key, value);
        });
        xhr.send(config.data);
    },

    _openPopup: function(url, title, width, height) {
        var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
        var dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;

        var winWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        var winHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

        var left = ((winWidth / 2) - (width / 2)) + dualScreenLeft;
        var top = ((winHeight / 2) - (height / 2)) + dualScreenTop;

        var settings = {
            width: width,
            height: height,
            left: left,
            top: top,
            dialog: 'yes',
            dependent: 'yes',
            scrollbars: 'yes',
            location: 'yes'
        };
        settings = Object.keys(settings).map(function(key) { return key + '=' + settings[key]; }).join(',');

        var win = window.open(url, title, settings);
        if (win.focus) {
            win.focus();
        }
        return win;
    },

    _oauthAuthorize: function(opts) {
        var that = this;
        var oldToken = that.runtimeData.get(that.name + 'OAuthToken');
        if (oldToken) {
            that._oauthToken = oldToken;
            opts.callback();
            return;
        }
        that.logger.debug('OAuth popup opened');
        that._openPopup(opts.url, 'OAuth', opts.width, opts.height);
        var popupClosed = function() {
            Backbone.off('popup-closed', popupClosed);
            window.removeEventListener('message', windowMessage);
            that.logger.error('OAuth error', 'popup closed');
            opts.callback('popup closed');
        };
        var windowMessage = function(e) {
            if (!e.data) {
                return;
            }
            Backbone.off('popup-closed', popupClosed);
            window.removeEventListener('message', windowMessage);
            var token = that._oauthMsgToToken(e.data);
            if (token.error) {
                that.logger.error('OAuth error', token.error, token.errorDescription);
                opts.callback(token.error);
            } else {
                that._oauthToken = token;
                that.runtimeData.set(that.name + 'OAuthToken', token);
                that.logger.debug('OAuth success');
                opts.callback();
            }
        };
        Backbone.on('popup-closed', popupClosed);
        window.addEventListener('message', windowMessage);
    },

    _oauthMsgToToken: function(data) {
        // jshint camelcase:false
        if (data.error || !data.token_type) {
            return { error: data.error || 'no token', errorDescription: data.error_description };
        }
        return {
            tokenType: data.token_type,
            accessToken: data.access_token,
            authenticationToken: data.authentication_token,
            expiresIn: data.expires_in,
            scope: data.scope,
            userId: data.user_id
        };
    }
});

StorageBase.extend = Backbone.Model.extend;

module.exports = StorageBase;

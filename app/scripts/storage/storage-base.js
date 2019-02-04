const Backbone = require('backbone');
const Logger = require('../util/logger');
const AppSettingsModel = require('../models/app-settings-model');
const RuntimeDataModel = require('../models/runtime-data-model');
const Links = require('../const/links');
const FeatureDetector = require('../util/feature-detector');

const MaxRequestRetries = 3;

const StorageBase = function() {
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
            const enabled = this.appSettings.get(this.name);
            if (typeof enabled === 'boolean') {
                this.enabled = enabled;
            }
        }
        this.logger = new Logger('storage-' + this.name);
        if (this._oauthReturnMessage) {
            this.logger.debug('OAuth return message', this._oauthReturnMessage);
            this._oauthProcessReturn(this._oauthReturnMessage);
            delete this._oauthReturnMessage;
            delete sessionStorage.authStorage;
        }
        return this;
    },

    setEnabled: function(enabled) {
        this.enabled = enabled;
    },

    handleOAuthReturnMessage(message) {
        this._oauthReturnMessage = message;
    },

    _xhr: function(config) {
        const xhr = new XMLHttpRequest();
        if (config.responseType) {
            xhr.responseType = config.responseType;
        }
        const statuses = config.statuses || [200];
        xhr.addEventListener('load', () => {
            if (statuses.indexOf(xhr.status) >= 0) {
                return config.success && config.success(xhr.response, xhr);
            }
            if (xhr.status === 401 && this._oauthToken) {
                this._oauthRefreshToken(err => {
                    if (err) {
                        return config.error && config.error('unauthorized', xhr);
                    } else {
                        config.tryNum = (config.tryNum || 0) + 1;
                        if (config.tryNum >= MaxRequestRetries) {
                            this.logger.info('Too many authorize attempts, fail request', config.url);
                            return config.error && config.error('unauthorized', xhr);
                        }
                        this.logger.info('Repeat request, try #' + config.tryNum, config.url);
                        this._xhr(config);
                    }
                });
            } else {
                return config.error && config.error('http status ' + xhr.status, xhr);
            }
        });
        xhr.addEventListener('error', () => {
            return config.error && config.error('network error', xhr);
        });
        xhr.addEventListener('timeout', () => {
            return config.error && config.error('timeout', xhr);
        });
        xhr.open(config.method || 'GET', config.url);
        if (this._oauthToken && !config.skipAuth) {
            xhr.setRequestHeader('Authorization', 'Bearer ' + this._oauthToken.accessToken);
        }
        _.forEach(config.headers, (value, key) => {
            xhr.setRequestHeader(key, value);
        });
        xhr.send(config.data);
    },

    _openPopup: function(url, title, width, height) {
        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;

        const winWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
        const winHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

        const left = ((winWidth / 2) - (width / 2)) + dualScreenLeft;
        const top = ((winHeight / 2) - (height / 2)) + dualScreenTop;

        let settings = {
            width: width,
            height: height,
            left: left,
            top: top,
            dialog: 'yes',
            dependent: 'yes',
            scrollbars: 'yes',
            location: 'yes'
        };
        settings = Object.keys(settings).map(key => key + '=' + settings[key]).join(',');
        if (FeatureDetector.isStandalone) {
            sessionStorage.authStorage = this.name;
        }

        return window.open(url, title, settings);
    },

    _getOauthRedirectUrl: function() {
        let redirectUrl = window.location.href;
        if (redirectUrl.lastIndexOf('file:', 0) === 0) {
            redirectUrl = Links.WebApp;
        }
        redirectUrl = redirectUrl.split('?')[0];
        return redirectUrl;
    },

    _oauthAuthorize: function(callback) {
        if (this._tokenIsValid(this._oauthToken)) {
            return callback();
        }
        const opts = this._getOAuthConfig();
        const oldToken = this.runtimeData.get(this.name + 'OAuthToken');
        if (this._tokenIsValid(oldToken)) {
            this._oauthToken = oldToken;
            return callback();
        }
        const url = opts.url + '?client_id={cid}&scope={scope}&response_type=token&redirect_uri={url}'
            .replace('{cid}', encodeURIComponent(opts.clientId))
            .replace('{scope}', encodeURIComponent(opts.scope))
            .replace('{url}', encodeURIComponent(this._getOauthRedirectUrl()));
        this.logger.debug('OAuth: popup opened');
        const popupWindow = this._openPopup(url, 'OAuth', opts.width, opts.height);
        if (!popupWindow) {
            return callback('OAuth: cannot open popup');
        }
        this._popupOpened(popupWindow);
        const popupClosed = () => {
            Backbone.off('popup-closed', popupClosed);
            window.removeEventListener('message', windowMessage);
            this.logger.error('OAuth error', 'popup closed');
            callback('OAuth: popup closed');
        };
        const windowMessage = e => {
            if (!e.data) {
                return;
            }
            const token = this._oauthProcessReturn(e.data);
            if (token) {
                Backbone.off('popup-closed', popupClosed);
                window.removeEventListener('message', windowMessage);
                if (token.error) {
                    this.logger.error('OAuth error', token.error, token.errorDescription);
                    callback('OAuth: ' + token.error);
                } else {
                    callback();
                }
            } else {
                this.logger.debug('Skipped OAuth message', e.data);
            }
        };
        Backbone.on('popup-closed', popupClosed);
        window.addEventListener('message', windowMessage);
    },

    _popupOpened(popupWindow) {
    },

    _oauthProcessReturn: function(message) {
        const token = this._oauthMsgToToken(message);
        if (token && !token.error) {
            this._oauthToken = token;
            this.runtimeData.set(this.name + 'OAuthToken', token);
            this.logger.debug('OAuth token received');
        }
        return token;
    },

    _oauthMsgToToken: function(data) {
        if (!data.token_type) {
            if (data.error) {
                return {error: data.error, errorDescription: data.error_description};
            } else {
                return undefined;
            }
        }
        return {
            dt: Date.now() - 60 * 1000,
            tokenType: data.token_type,
            accessToken: data.access_token,
            authenticationToken: data.authentication_token,
            expiresIn: +data.expires_in,
            scope: data.scope,
            userId: data.user_id
        };
    },

    _oauthRefreshToken: function(callback) {
        this._oauthToken.expired = true;
        this.runtimeData.set(this.name + 'OAuthToken', this._oauthToken);
        this._oauthAuthorize(callback);
    },

    _oauthRevokeToken: function(url) {
        const token = this.runtimeData.get(this.name + 'OAuthToken');
        if (token) {
            if (url) {
                this._xhr({
                    url: url.replace('{token}', token.accessToken),
                    statuses: [200, 401]
                });
            }
            this.runtimeData.unset(this.name + 'OAuthToken');
            this._oauthToken = null;
        }
    },

    _tokenIsValid(token) {
        if (!token || token.expired) {
            return false;
        }
        if (token.dt && token.expiresIn && token.dt + token.expiresIn * 1000 < Date.now()) {
            return false;
        }
        return true;
    }
});

StorageBase.extend = Backbone.Model.extend;

module.exports = StorageBase;

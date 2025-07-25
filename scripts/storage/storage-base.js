import { Events } from 'framework/events';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { RuntimeDataModel } from 'models/runtime-data-model';
import { Logger } from 'util/logger';
import { StorageOAuthListener } from 'storage/storage-oauth-listener';
import { UrlFormat } from 'util/formatting/url-format';
import { Launcher } from 'comp/launcher';
import { omitEmpty } from 'util/fn';
import { Features } from 'util/features';
import { createOAuthSession } from 'storage/pkce';

const MaxRequestRetries = 3;

class StorageBase {
    name = null;
    icon = null;
    enabled = false;
    system = false;
    uipos = null;

    logger = null;
    appSettings = AppSettingsModel;
    runtimeData = RuntimeDataModel;

    init() {
        if (!this.name) {
            throw 'Failed to init provider: no name';
        }
        if (!this.system) {
            const enabled = this.appSettings[this.name];
            if (typeof enabled === 'boolean') {
                this.enabled = enabled;
            }
        }
        this.logger = new Logger('storage-' + this.name);
        return this;
    }

    setEnabled(enabled) {
        if (!enabled) {
            this.logout();
        }
        this.enabled = enabled;
    }

    get loggedIn() {
        return !!this.runtimeData[this.name + 'OAuthToken'];
    }

    logout() {}

    deleteStoredToken() {
        delete this.runtimeData[this.name + 'OAuthToken'];
    }

    _xhr(config) {
        this.logger.info('HTTP request', config.method || 'GET', config.url);
        if (config.data) {
            if (!config.dataType) {
                config.dataType = 'application/octet-stream';
            }
            config.headers = {
                ...config.headers,
                'Content-Type': config.dataType
            };
        }
        if (this._oauthToken && !config.skipAuth) {
            config.headers = {
                ...config.headers,
                'Authorization': 'Bearer ' + this._oauthToken.accessToken
            };
        }
        this._httpRequest(config, (response) => {
            this.logger.info('HTTP response', response.status);
            const statuses = config.statuses || [200];
            if (statuses.indexOf(response.status) >= 0) {
                return config.success && config.success(response.response, response);
            }
            if (response.status === 401 && this._oauthToken) {
                this._oauthGetNewToken((err) => {
                    if (err) {
                        return config.error && config.error('unauthorized', response);
                    } else {
                        config.tryNum = (config.tryNum || 0) + 1;
                        if (config.tryNum >= MaxRequestRetries) {
                            this.logger.info(
                                'Too many authorize attempts, fail request',
                                config.url
                            );
                            return config.error && config.error('unauthorized', response);
                        }
                        this.logger.info('Repeat request, try #' + config.tryNum, config.url);
                        this._xhr(config);
                    }
                });
            } else {
                return config.error && config.error('http status ' + response.status, response);
            }
        });
    }

    _httpRequest(config, onLoad) {
        const httpRequest = Features.isDesktop ? this._httpRequestLauncher : this._httpRequestWeb;
        httpRequest.call(this, config, onLoad);
    }

    _httpRequestWeb(config, onLoad) {
        const xhr = new XMLHttpRequest();
        if (config.responseType) {
            xhr.responseType = config.responseType;
        }
        xhr.addEventListener('load', () => {
            onLoad({
                status: xhr.status,
                response: xhr.response,
                getResponseHeader: (name) => xhr.getResponseHeader(name)
            });
        });
        xhr.addEventListener('error', () => {
            return config.error && config.error('network error', xhr);
        });
        xhr.addEventListener('timeout', () => {
            return config.error && config.error('timeout', xhr);
        });
        xhr.open(config.method || 'GET', config.url);
        if (config.headers) {
            for (const [key, value] of Object.entries(config.headers)) {
                xhr.setRequestHeader(key, value);
            }
        }
        let data = config.data;
        if (data) {
            if (!config.dataIsMultipart) {
                data = [data];
            }
            data = new Blob(data, { type: config.dataType });
        }
        xhr.send(data);
    }

    _httpRequestLauncher(config, onLoad) {
        Launcher.remoteApp().httpRequest(
            config,
            (level, ...args) => this.logger[level](...args),
            ({ status, response, headers }) => {
                response = Buffer.from(response, 'hex');
                if (config.responseType === 'json') {
                    try {
                        response = JSON.parse(response.toString('utf8'));
                    } catch (e) {
                        return config.error && config.error('json parse error');
                    }
                } else {
                    response = response.buffer.slice(
                        response.byteOffset,
                        response.byteOffset + response.length
                    );
                }
                onLoad({
                    status,
                    response,
                    getResponseHeader: (name) => headers[name.toLowerCase()]
                });
            }
        );
    }

    _openPopup(url, title, width, height, extras) {
        const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
        const dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;

        const winWidth = window.innerWidth
            ? window.innerWidth
            : document.documentElement.clientWidth
            ? document.documentElement.clientWidth
            : screen.width;
        const winHeight = window.innerHeight
            ? window.innerHeight
            : document.documentElement.clientHeight
            ? document.documentElement.clientHeight
            : screen.height;

        const left = winWidth / 2 - width / 2 + dualScreenLeft;
        const top = winHeight / 2 - height / 2 + dualScreenTop;

        let settings = {
            width,
            height,
            left,
            top,
            dialog: 'yes',
            dependent: 'yes',
            scrollbars: 'yes',
            location: 'yes'
        };
        settings = Object.keys(settings)
            .map((key) => key + '=' + settings[key])
            .join(',');

        return window.open(url, title, settings, extras);
    }

    _getOauthRedirectUrl() {
        let redirectUrl = window.location.href;
        if (redirectUrl.lastIndexOf('file:', 0) === 0) {
            redirectUrl = Links.WebApp;
        }
        return new URL(`oauth-result/${this.name}.html`, redirectUrl).href;
    }

    _oauthAuthorize(callback) {
        if (this._tokenIsValid(this._oauthToken)) {
            return callback();
        }
        const opts = this._getOAuthConfig();
        const oldToken = this.runtimeData[this.name + 'OAuthToken'];
        if (this._tokenIsValid(oldToken)) {
            this._oauthToken = oldToken;
            return callback();
        }

        if (oldToken && oldToken.refreshToken) {
            return this._oauthExchangeRefreshToken(callback);
        }

        const session = createOAuthSession();

        let listener;
        if (Features.isDesktop) {
            listener = StorageOAuthListener.listen(this.name);
            session.redirectUri = listener.redirectUri;
        } else {
            session.redirectUri = this._getOauthRedirectUrl();
        }

        const pkceParams = opts.pkce
            ? {
                  'code_challenge': session.codeChallenge,
                  'code_challenge_method': 'S256'
              }
            : undefined;

        const url = UrlFormat.makeUrl(opts.url, {
            'client_id': opts.clientId,
            'scope': opts.scope,
            'state': session.state,
            'redirect_uri': session.redirectUri,
            'response_type': 'code',
            ...pkceParams,
            ...opts.urlParams
        });

        if (listener) {
            listener.on('ready', () => {
                Launcher.openLink(url);
                callback('browser-auth-started');
            });
            listener.on('error', (err) => callback(err));
            listener.on('result', (result) => this._oauthCodeReceived(result, session));
            return;
        }

        const popupWindow = this._openPopup(url, 'OAuth', opts.width, opts.height);
        if (!popupWindow) {
            return callback('OAuth: cannot open popup');
        }

        this.logger.debug('OAuth: popup opened');

        const processWindowMessage = (locationSearch) => {
            const data = {};
            for (const [key, value] of new URLSearchParams(locationSearch).entries()) {
                data[key] = value;
            }
            if (data.error) {
                this.logger.error('OAuth error', data.error, data.error_description);
                callback('OAuth: ' + data.error);
            } else if (data.code) {
                Events.off('popup-closed', popupClosed);
                window.removeEventListener('message', windowMessage);
                this._oauthCodeReceived(data, session, callback);
            } else {
                this.logger.debug('Skipped OAuth message', data);
            }
        };

        const popupClosed = (e) => {
            Events.off('popup-closed', popupClosed);
            window.removeEventListener('message', windowMessage);
            if (e.locationSearch) {
                // see #1711: mobile Safari in PWA mode can't close the pop-up, but it returns the url
                processWindowMessage(e.locationSearch);
            } else {
                this.logger.error('OAuth error', 'popup closed');
                callback('OAuth: popup closed');
            }
        };

        const windowMessage = (e) => {
            if (e.origin !== location.origin) {
                return;
            }
            if (!e.data || !e.data.storage || !e.data.search) {
                this.logger.debug('Skipped empty OAuth message', e.data);
                return;
            }
            if (e.data.storage !== this.name) {
                this.logger.debug('Skipped OAuth message for another storage', e.data.storage);
                return;
            }
            processWindowMessage(e.data.search);
        };
        Events.on('popup-closed', popupClosed);
        window.addEventListener('message', windowMessage);
    }

    _oauthProcessReturn(message) {
        const token = this._oauthMsgToToken(message);
        if (token && !token.error) {
            this._oauthToken = token;
            if (!this.appSettings.shortLivedStorageToken) {
                this.runtimeData[this.name + 'OAuthToken'] = token;
            }
            this.logger.debug('OAuth token received');
        }
        return token;
    }

    _oauthMsgToToken(data) {
        if (!data.token_type) {
            if (data.error) {
                return { error: data.error, errorDescription: data.error_description };
            } else {
                return undefined;
            }
        }
        return omitEmpty({
            dt: Date.now() - 60 * 1000,
            tokenType: data.token_type,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            authenticationToken: data.authentication_token,
            expiresIn: +data.expires_in,
            scope: data.scope,
            userId: data.user_id
        });
    }

    _oauthGetNewToken(callback) {
        this._oauthToken.expired = true;
        if (!this.appSettings.shortLivedStorageToken) {
            this.runtimeData[this.name + 'OAuthToken'] = this._oauthToken;
        }
        if (this._oauthToken.refreshToken) {
            this._oauthExchangeRefreshToken(callback);
        } else {
            this._oauthAuthorize(callback);
        }
    }

    _oauthRevokeToken(url, requestOptions) {
        const token = this.runtimeData[this.name + 'OAuthToken'];
        if (token) {
            if (url) {
                this._xhr({
                    url: url.replace('{token}', token.accessToken),
                    statuses: [200, 401],
                    ...requestOptions
                });
            }
            delete this.runtimeData[this.name + 'OAuthToken'];
            this._oauthToken = null;
        }
    }

    _tokenIsValid(token) {
        if (!token || token.expired) {
            return false;
        }
        if (token.dt && token.expiresIn && token.dt + token.expiresIn * 1000 < Date.now()) {
            return false;
        }
        return true;
    }

    _oauthCodeReceived(result, session, callback) {
        if (!result.state) {
            this.logger.info('OAuth result has no state');
            return callback && callback('OAuth result has no state');
        }
        if (result.state !== session.state) {
            this.logger.info('OAuth result has bad state');
            return callback && callback('OAuth result has bad state');
        }

        if (!result.code) {
            this.logger.info('OAuth result has no code');
            return callback && callback('OAuth result has no code');
        }

        this.logger.debug('OAuth code received');

        if (Features.isDesktop) {
            Launcher.showMainWindow();
        }
        const config = this._getOAuthConfig();
        const pkceParams = config.pkce ? { 'code_verifier': session.codeVerifier } : undefined;

        this._xhr({
            url: config.tokenUrl,
            method: 'POST',
            responseType: 'json',
            skipAuth: true,
            data: UrlFormat.buildFormData({
                'client_id': config.clientId,
                ...(config.clientSecret ? { 'client_secret': config.clientSecret } : null),
                'grant_type': 'authorization_code',
                'code': result.code,
                'redirect_uri': session.redirectUri,
                ...pkceParams
            }),
            dataType: 'application/x-www-form-urlencoded',
            success: (response) => {
                this.logger.debug('OAuth code exchanged', response);
                const token = this._oauthProcessReturn(response);
                if (token && token.error) {
                    return callback && callback('OAuth code exchange error: ' + token.error);
                }
                callback?.();
            },
            error: (err) => {
                this.logger.error('Error exchanging OAuth code', err);
                callback?.('OAuth code exchange error: ' + err);
            }
        });
    }

    _oauthExchangeRefreshToken(callback) {
        this.logger.debug('Exchanging refresh token');
        const { refreshToken } = this.runtimeData[this.name + 'OAuthToken'];
        const config = this._getOAuthConfig();
        this._xhr({
            url: config.tokenUrl,
            method: 'POST',
            responseType: 'json',
            skipAuth: true,
            data: UrlFormat.buildFormData({
                'client_id': config.clientId,
                ...(config.clientSecret ? { 'client_secret': config.clientSecret } : null),
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken
            }),
            dataType: 'application/x-www-form-urlencoded',
            success: (response) => {
                this.logger.debug('Refresh token exchanged');
                this._oauthProcessReturn({
                    'refresh_token': refreshToken,
                    ...response
                });
                callback();
            },
            error: (err, xhr) => {
                if (xhr.status === 400) {
                    delete this.runtimeData[this.name + 'OAuthToken'];
                    this._oauthToken = null;
                    this.logger.error('Error exchanging refresh token, trying to authorize again');
                    this._oauthAuthorize(callback);
                } else {
                    this.logger.error('Error exchanging refresh token', err);
                    callback?.('Error exchanging refresh token');
                }
            }
        });
    }
}

export { StorageBase };

import { Events } from 'framework/events';
import { Links } from 'const/links';
import { AppSettingsModel } from 'models/app-settings-model';
import { RuntimeDataModel } from 'models/runtime-data-model';
import { Logger } from 'util/logger';
import { StorageOAuthListener } from 'storage/storage-oauth-listener';
import { UrlFormat } from 'util/formatting/url-format';
import { Launcher } from 'comp/launcher';
import { omitEmpty } from 'util/fn';
import { Timeouts } from 'const/timeouts';

const MaxRequestRetries = 3;

class StorageBase {
    name = null;
    icon = null;
    iconSvg = null;
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
        this.enabled = enabled;
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
        this._httpRequest(config, response => {
            this.logger.info('HTTP response', response.status);
            const statuses = config.statuses || [200];
            if (statuses.indexOf(response.status) >= 0) {
                return config.success && config.success(response.response, response);
            }
            if (response.status === 401 && this._oauthToken) {
                this._oauthGetNewToken(err => {
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
        const httpRequest = Launcher ? this._httpRequestLauncher : this._httpRequestWeb;
        httpRequest(config, onLoad);
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
                getResponseHeader: name => xhr.getResponseHeader(name)
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
        const https = Launcher.req('https');
        const req = https.request(config.url, {
            method: config.method || 'GET',
            headers: config.headers,
            timeout: Timeouts.DefaultHttpRequest
        });
        req.on('response', res => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                let response = Buffer.concat(chunks);
                if (config.responseType === 'json') {
                    response = JSON.parse(response.toString('utf8'));
                } else {
                    response = response.buffer.slice(
                        response.byteOffset,
                        response.byteOffset + response.length
                    );
                }
                onLoad({
                    status: res.statusCode,
                    response,
                    getResponseHeader: name => res.headers[name.toLowerCase()]
                });
            });
        });
        req.on('error', () => {
            return config.error && config.error('network error', {});
        });
        req.on('timeout', () => {
            req.abort();
            return config.error && config.error('timeout', {});
        });
        if (config.data) {
            let data;
            if (config.dataIsMultipart) {
                data = Buffer.concat(config.data.map(chunk => Buffer.from(chunk)));
            } else {
                data = Buffer.from(config.data);
            }
            req.write(data);
        }
        req.end();
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
            .map(key => key + '=' + settings[key])
            .join(',');

        return window.open(url, title, settings, extras);
    }

    _getOauthRedirectUrl() {
        let redirectUrl = window.location.href;
        if (redirectUrl.lastIndexOf('file:', 0) === 0) {
            redirectUrl = Links.WebApp;
        }
        redirectUrl = redirectUrl.split('?')[0];
        return redirectUrl;
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

        if (this._useLocalOAuthRedirectListener()) {
            return StorageOAuthListener.listen()
                .then(listener => {
                    const url = UrlFormat.makeUrl(opts.url, {
                        'client_id': opts.clientId,
                        'scope': opts.scope,
                        'state': listener.state,
                        'redirect_uri': listener.redirectUri,
                        'response_type': 'code',
                        'code_challenge': listener.codeChallenge,
                        'code_challenge_method': 'S256'
                    });
                    Launcher.openLink(url);
                    callback('browser-auth-started');
                    listener.callback = code => this._oauthCodeReceived(code, listener);
                })
                .catch(err => callback(err));
        }

        const url = UrlFormat.makeUrl(opts.url, {
            'client_id': opts.clientId,
            'scope': opts.scope,
            'response_type': 'token',
            'redirect_uri': this._getOauthRedirectUrl()
        });

        this.logger.debug('OAuth: popup opened');
        const popupWindow = this._openPopup(url, 'OAuth', opts.width, opts.height);
        if (!popupWindow) {
            return callback('OAuth: cannot open popup');
        }
        this._popupOpened(popupWindow);
        const popupClosed = () => {
            Events.off('popup-closed', popupClosed);
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
                Events.off('popup-closed', popupClosed);
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
        Events.on('popup-closed', popupClosed);
        window.addEventListener('message', windowMessage);
    }

    _popupOpened(popupWindow) {}

    _oauthProcessReturn(message) {
        const token = this._oauthMsgToToken(message);
        if (token && !token.error) {
            this._oauthToken = token;
            this.runtimeData[this.name + 'OAuthToken'] = token;
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
        this.runtimeData[this.name + 'OAuthToken'] = this._oauthToken;
        if (this._oauthToken.refreshToken) {
            this._oauthExchangeRefreshToken(callback);
        } else {
            this._oauthAuthorize(callback);
        }
    }

    _oauthRevokeToken(url) {
        const token = this.runtimeData[this.name + 'OAuthToken'];
        if (token) {
            if (url) {
                this._xhr({
                    url: url.replace('{token}', token.accessToken),
                    statuses: [200, 401]
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

    _useLocalOAuthRedirectListener() {
        return false;
    }

    _oauthCodeReceived(code, listener) {
        this.logger.debug('OAuth code received');
        Launcher.showMainWindow();
        const config = this._getOAuthConfig();
        this._xhr({
            url: config.tokenUrl,
            method: 'POST',
            responseType: 'json',
            skipAuth: true,
            data: JSON.stringify({
                'client_id': config.clientId,
                'client_secret': config.clientSecret,
                'grant_type': 'authorization_code',
                code,
                'code_verifier': listener.codeVerifier,
                'redirect_uri': listener.redirectUri
            }),
            dataType: 'application/json',
            success: response => {
                this.logger.debug('OAuth code exchanged');
                this._oauthProcessReturn(response);
            },
            error: err => {
                this.logger.error('Error exchanging OAuth code', err);
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
            data: JSON.stringify({
                'client_id': config.clientId,
                'client_secret': config.clientSecret,
                'grant_type': 'refresh_token',
                'refresh_token': refreshToken
            }),
            dataType: 'application/json',
            success: response => {
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
                }
                this.logger.error('Error exchanging refresh token', err);
                callback && callback('Error exchanging refresh token');
            }
        });
    }
}

export { StorageBase };

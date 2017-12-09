const Logger = require('../util/logger');
const Launcher = require('./launcher');
const RuntimeDataModel = require('../models/runtime-data-model');

const CookieManager = {
    logger: new Logger('cookie-manager'),
    cookies: undefined,
    cookiesStr: undefined,

    init() {
        if (Launcher) {
            this.cookies = RuntimeDataModel.instance.get('cookies');
            this.cookiesStr = JSON.stringify(this.cookies);
            Launcher.setCookies(this.cookies);
        }
    },

    saveCookies() {
        if (Launcher) {
            Launcher.getCookies((err, cookies) => {
                if (err) {
                    return this.logger.error('Error getting cookies', err);
                }
                if (cookies && cookies.length) {
                    cookies = cookies.filter(cookie => !cookie.session).map(cookie => ({
                        url: (cookie.secure ? 'https' : 'http') + '://' + cookie.domain + (cookie.path || ''),
                        name: cookie.name,
                        value: cookie.value,
                        domain: cookie.domain,
                        path: cookie.path,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        expirationDate: cookie.expirationDate
                    }));
                    const cookiesStr = JSON.stringify(cookies);
                    if (cookiesStr !== this.cookiesStr) {
                        this.cookies = cookies;
                        this.cookiesStr = cookiesStr;
                        RuntimeDataModel.instance.set('cookies', cookies);
                    }
                }
            });
        }
    }
};

module.exports = CookieManager;

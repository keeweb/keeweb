const Launcher = require('./launcher');
const Logger = require('../util/logger');

const logger = new Logger('transport');

const Transport = {
    httpGet: function(config) {
        let tmpFile;
        const fs = Launcher.req('fs');
        if (config.file) {
            tmpFile = Launcher.getTempPath(config.file);
            if (fs.existsSync(tmpFile)) {
                try {
                    if (config.cache && fs.statSync(tmpFile).size > 0) {
                        logger.info('File already downloaded ' + config.url);
                        return config.success(tmpFile);
                    } else {
                        fs.unlinkSync(tmpFile);
                    }
                } catch (e) {
                    fs.unlink(tmpFile, _.noop);
                }
            }
        }
        const proto = config.url.split(':')[0];
        logger.info('GET ' + config.url);
        const opts = Launcher.req('url').parse(config.url);
        opts.headers = { 'User-Agent': navigator.userAgent };
        Launcher.resolveProxy(config.url, proxy => {
            logger.info('Request to ' + config.url + ' ' + (proxy ? 'using proxy ' + proxy.host + ':' + proxy.port : 'without proxy'));
            if (proxy) {
                opts.headers.Host = opts.host;
                opts.host = proxy.host;
                opts.port = proxy.port;
                opts.path = config.url;
            }
            Launcher.req(proto).get(opts, res => {
                logger.info('Response from ' + config.url + ': ' + res.statusCode);
                if (res.statusCode === 200) {
                    if (config.file) {
                        const file = fs.createWriteStream(tmpFile);
                        res.pipe(file);
                        file.on('finish', () => {
                            file.close(() => {
                                config.success(tmpFile);
                            });
                        });
                        file.on('error', err => {
                            config.error(err);
                        });
                    } else {
                        let data = [];
                        res.on('data', chunk => {
                            data.push(chunk);
                        });
                        res.on('end', () => {
                            data = window.Buffer.concat(data);
                            if (config.utf8) {
                                data = data.toString('utf8');
                            }
                            config.success(data);
                        });
                    }
                } else if (res.headers.location && [301, 302].indexOf(res.statusCode) >= 0) {
                    if (config.noRedirect) {
                        return config.error('Too many redirects');
                    }
                    config.url = res.headers.location;
                    config.noRedirect = true;
                    Transport.httpGet(config);
                } else {
                    config.error('HTTP status ' + res.statusCode);
                }
            }).on('error', e => {
                logger.error('Cannot GET ' + config.url, e);
                if (tmpFile) {
                    fs.unlink(tmpFile, _.noop);
                }
                config.error(e);
            });
        });
    }
};

module.exports = Transport;

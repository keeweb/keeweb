'use strict';

var Launcher = require('./launcher'),
    Logger = require('../util/logger');

var logger = new Logger('transport');

var Transport = {
    httpGet: function(config) {
        var tmpFile;
        var fs = Launcher.req('fs');
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
                    fs.unlink(tmpFile);
                }
            }
        }
        var proto = config.url.split(':')[0];
        logger.info('GET ' + config.url);
        var opts = Launcher.req('url').parse(config.url);
        opts.headers = { 'User-Agent': navigator.userAgent };
        Launcher.resolveProxy(config.url, function(proxy) {
            logger.info('Request to ' + config.url + ' ' + (proxy ? 'using proxy ' + proxy.host + ':' + proxy.port : 'without proxy'));
            if (proxy) {
                opts.headers.Host = opts.host;
                opts.host = proxy.host;
                opts.port = proxy.port;
                opts.path = config.url;
            }
            Launcher.req(proto).get(opts, function (res) {
                logger.info('Response from ' + config.url + ': ' + res.statusCode);
                if (res.statusCode === 200) {
                    if (config.file) {
                        var file = fs.createWriteStream(tmpFile);
                        res.pipe(file);
                        file.on('finish', function () {
                            file.close(function () {
                                config.success(tmpFile);
                            });
                        });
                        file.on('error', function (err) {
                            config.error(err);
                        });
                    } else {
                        var data = [];
                        res.on('data', function (chunk) {
                            data.push(chunk);
                        });
                        res.on('end', function () {
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
            }).on('error', function (e) {
                logger.error('Cannot GET ' + config.url, e);
                if (tmpFile) {
                    fs.unlink(tmpFile);
                }
                config.error(e);
            });
        });
    }
};

module.exports = Transport;

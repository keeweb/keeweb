import { Launcher } from 'comp/launcher';
import { Logger } from 'util/logger';
import { noop } from 'util/fn';
import { StringFormat } from 'util/formatting/string-format';

const logger = new Logger('transport');

const Transport = {
    cacheFilePath(fileName) {
        return Launcher.getTempPath(fileName);
    },

    httpGet(config) {
        let tmpFile;
        const fs = Launcher.req('fs');
        if (config.file) {
            const baseTempPath = Launcher.getTempPath();
            if (config.cleanupOldFiles) {
                const allFiles = fs.readdirSync(baseTempPath);
                for (const file of allFiles) {
                    if (
                        file !== config.file &&
                        StringFormat.replaceVersion(file, '0') ===
                            StringFormat.replaceVersion(config.file, '0')
                    ) {
                        fs.unlinkSync(Launcher.joinPath(baseTempPath, file));
                    }
                }
            }
            tmpFile = Launcher.joinPath(baseTempPath, config.file);
            if (fs.existsSync(tmpFile)) {
                try {
                    if (config.cache && fs.statSync(tmpFile).size > 0) {
                        logger.info('File already downloaded ' + config.url);
                        return config.success(tmpFile);
                    } else {
                        fs.unlinkSync(tmpFile);
                    }
                } catch (e) {
                    fs.unlink(tmpFile, noop);
                }
            }
        }
        const proto = config.url.split(':')[0];
        logger.info('GET ' + config.url);
        const opts = Launcher.req('url').parse(config.url);
        opts.headers = { 'User-Agent': navigator.userAgent };
        Launcher.resolveProxy(config.url, (proxy) => {
            logger.info(
                'Request to ' +
                    config.url +
                    ' ' +
                    (proxy ? 'using proxy ' + proxy.host + ':' + proxy.port : 'without proxy')
            );
            if (proxy) {
                opts.headers.Host = opts.host;
                opts.host = proxy.host;
                opts.port = proxy.port;
                opts.path = config.url;
            }
            Launcher.req(proto)
                .get(opts, (res) => {
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
                            file.on('error', (err) => {
                                config.error(err);
                            });
                        } else {
                            let data = [];
                            res.on('data', (chunk) => {
                                data.push(chunk);
                            });
                            res.on('end', () => {
                                data = window.Buffer.concat(data);
                                if (config.text || config.json) {
                                    data = data.toString('utf8');
                                }
                                if (config.json) {
                                    try {
                                        data = JSON.parse(data);
                                    } catch (e) {
                                        config.error('Error parsing JSON: ' + e.message);
                                    }
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
                })
                .on('error', (e) => {
                    logger.error('Cannot GET ' + config.url, e);
                    if (tmpFile) {
                        fs.unlink(tmpFile, noop);
                    }
                    config.error(e);
                });
        });
    }
};

export { Transport };

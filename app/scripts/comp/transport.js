'use strict';

var Launcher = require('./launcher');

var Transport = {
    httpGet: function(config) {
        var tmpFile;
        var fs = Launcher.req('fs');
        if (config.file) {
            tmpFile = Launcher.getTempPath(config.file);
            if (fs.existsSync(tmpFile)) {
                try {
                    if (config.cache && fs.statSync(tmpFile).size > 0) {
                        console.log('File already downloaded ' + config.url);
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
        console.log('GET ' + config.url);
        var opts = Launcher.req('url').parse(config.url);
        opts.headers = { 'User-Agent': navigator.userAgent };
        Launcher.req(proto).get(opts, function(res) {
            console.log('Response from ' + config.url + ': ' + res.statusCode);
            if (res.statusCode === 200) {
                if (config.file) {
                    var file = fs.createWriteStream(tmpFile);
                    res.pipe(file);
                    file.on('finish', function() {
                        file.close(function() { config.success(tmpFile); });
                    });
                    file.on('error', function(err) { config.error(err); });
                } else {
                    var data = [];
                    res.on('data', function(chunk) { data.push(chunk); });
                    res.on('end', function() {
                        data = window.Buffer.concat(data);
                        if (config.utf8) {
                            data = data.toString('utf8');
                        }
                        config.success(data);
                    });
                }
            } else {
                config.error('HTTP status ' + res.statusCode);
            }
        }).on('error', function(e) {
            console.error('Cannot GET ' + config.url, e);
            if (tmpFile) {
                fs.unlink(tmpFile);
            }
            config.error(e);
        });
    }
};

module.exports = Transport;

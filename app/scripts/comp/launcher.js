'use strict';

var Backbone = require('backbone');
var Launcher;

if (window.process && window.process.versions && window.process.versions.electron) {
    /* jshint node:true */
    Launcher = {
        name: 'electron',
        version: window.process.versions.electron,
        req: window.require,
        openLink: function(href) {
            this.req('shell').openExternal(href);
        },
        devTools: true,
        openDevTools: function() {
            this.req('remote').getCurrentWindow().openDevTools();
        },
        getSaveFileName: function(defaultPath, cb) {
            var remote = this.req('remote');
            if (defaultPath) {
                var homePath = remote.require('app').getPath('userDesktop');
                defaultPath = this.req('path').join(homePath, defaultPath);
            }
            remote.require('dialog').showSaveDialog({
                title: 'Save Passwords Database',
                defaultPath: defaultPath,
                filters: [{ name: 'KeePass files', extensions: ['kdbx'] }]
            }, cb);
        },
        writeFile: function(path, data) {
            this.req('fs').writeFileSync(path, new window.Buffer(data));
        },
        readFile: function(path) {
            return new Uint8Array(this.req('fs').readFileSync(path));
        },
        fileExists: function(path) {
            return this.req('fs').existsSync(path);
        },
        httpGet: function(config) {
            var http = require(config.url.lastIndexOf('https', 0) === 0 ? 'https' : 'http');
            http.get(config.url, function(res) {
                var data = [];
                res.on('data', function (chunk) { data.push(chunk); });
                res.on('end', function() {
                    console.log('data', data);
                    data = Buffer.concat(data);
                    console.log('data', data);
                    if (config.utf8) {
                        data = data.toString('utf8');
                    }
                    console.log('data', data);
                    if (config.complete) {
                        config.copmlete(null, data);
                    }
                });
            }).on('error', function(err) {
                if (config.complete) { config.complete(err); }
            });
        }
    };
    window.launcherOpen = function(path) {
        Backbone.trigger('launcher-open-file', path);
    };
    if (window.launcherOpenedFile) {
        Backbone.trigger('launcher-open-file', window.launcherOpenedFile);
        delete window.launcherOpenedFile;
    }
}

module.exports = Launcher;

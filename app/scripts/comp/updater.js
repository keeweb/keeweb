'use strict';

var RuntimeInfo = require('./runtime-info'),
    Links = require('../const/links'),
    Launcher = require('../comp/launcher');

var Updater = {
    lastCheckDate: null,
    lastVersion: null,
    lastVersionReleaseDate: null,
    needUpdate: null,
    status: 'ready',
    check: function(complete) {
        if (!Launcher) {
            return;
        }
        this.status = 'checking';
        Launcher.httpGet({
            url: Links.WebApp + 'manifest.appcache',
            utf8: true,
            complete: (function (err, data) {
                if (err) {
                    this.status = 'err';
                    if (complete) {
                        complete(err);
                    }
                    return;
                }
                var match = data.match('#\s*(\d+\-\d+\-\d+):v([\d+\.\w]+)');
                if (!match) {
                    this.status = 'err';
                    if (complete) {
                        complete(err);
                    }
                    return;
                }
                this.lastVersionReleaseDate = new Date(match[1]);
                this.lastVersion = match[2];
                this.lastCheckDate = new Date();
                this.status = 'ok';
                this.needUpdate = this.lastVersion === RuntimeInfo.version;
                if (complete) {
                    complete();
                }
            }).bind(this)
        });
    }
};

module.exports = Updater;

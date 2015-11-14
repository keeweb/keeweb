'use strict';

/* jshint node:true */
/* jshint browser:false */

var app = require('app'),
    path = require('path'),
    fs = require('fs');

var userDataDir = app.getPath('userData'),
    appPathUserData = path.join(userDataDir, 'app.js'),
    appPath = path.join(__dirname, 'app.js');

if (fs.existsSync(appPathUserData)) {
    var versionLocal = require('./package.json').version;
    try {
        var versionUserData = require(path.join(userDataDir, 'package.json')).version;
        versionLocal = versionLocal.split('.');
        versionUserData = versionUserData.split('.');
        for (var i = 0; i < versionLocal.length; i++) {
            if (+versionUserData[i] > +versionLocal[i]) {
                appPath = appPathUserData;
            }
        }
    }
    catch (e) {
        console.error('Error reading user file version', e);
    }
}

require(appPath);

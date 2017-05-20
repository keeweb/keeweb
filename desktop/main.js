// KeeWeb launcher script

// This script is distributed with the app and is its entry point
// It checks whether the app is available in userData folder and if its version is higher than local, launches it
// This script is the only part which will be updated only with the app itself, auto-update will not change it

// (C) Antelle 2015, MIT license https://github.com/keeweb/keeweb

const app = require('electron').app;
const path = require('path');
const fs = require('fs');

const userDataDir = app.getPath('userData');
const appPathUserData = path.join(userDataDir, 'app.js');
let appPath = path.join(__dirname, 'app.js');

if (fs.existsSync(appPathUserData)) {
    let versionLocal = require('./package.json').version;
    try {
        let versionUserData = require(path.join(userDataDir, 'package.json')).version;
        versionLocal = versionLocal.split('.');
        versionUserData = versionUserData.split('.');
        for (let i = 0; i < versionLocal.length; i++) {
            if (+versionUserData[i] > +versionLocal[i]) {
                appPath = appPathUserData;
                break;
            }
            if (+versionUserData[i] < +versionLocal[i]) {
                break;
            }
        }
    } catch (e) {
        console.error('Error reading user file version', e); // eslint-disable-line no-console
    }
}

require(appPath);

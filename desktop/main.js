// KeeWeb launcher script

// This script is distributed with the app and is its entry point
// It checks whether the app is available in userData folder and if its version is higher than local, launches it
// This script is the only part which will be updated only with the app itself, auto-update will not change it

// (C) Antelle 2019, MIT license https://github.com/keeweb/keeweb

global.perfTimestamps = [{ name: 'pre-init', ts: process.hrtime() }];

const app = require('electron').app;
const path = require('path');
const fs = require('original-fs');

global.perfTimestamps.push({ name: 'loading main requires', ts: process.hrtime() });

const userDataDir = app.getPath('userData');
const userDataAppArchivePath = path.join(userDataDir, 'app.asar');
let entryPointDir = __dirname;

global.perfTimestamps.push({ name: 'getting data dir', ts: process.hrtime() });

try {
    const appFilePath = entryPointDir.endsWith('app.asar') ? entryPointDir : __filename;
    let userPackageStat;
    try {
        userPackageStat = fs.statSync(userDataAppArchivePath);
    } catch (e) {}
    global.perfTimestamps.push({ name: 'checking for new version', ts: process.hrtime() });

    if (userPackageStat) {
        const packageStat = fs.statSync(appFilePath);
        const userPackageStatTime = Math.max(
            userPackageStat.mtime.getTime(),
            userPackageStat.ctime.getTime()
        );
        global.perfTimestamps.push({ name: 'getting asar file time', ts: process.hrtime() });

        const packageStatTime = Math.max(packageStat.mtime.getTime(), packageStat.ctime.getTime());
        if (userPackageStatTime > packageStatTime) {
            let versionLocal = require('./package.json').version;
            let versionUserData = require(path.join(userDataAppArchivePath, 'package.json'))
                .version;
            global.perfTimestamps.push({ name: 'getting package version', ts: process.hrtime() });

            versionLocal = versionLocal.split('.');
            versionUserData = versionUserData.split('.');
            for (let i = 0; i < versionLocal.length; i++) {
                if (+versionUserData[i] > +versionLocal[i]) {
                    entryPointDir = userDataAppArchivePath;
                    try {
                        validateSignature(userDataDir);
                        global.perfTimestamps.push({
                            name: 'validating signature',
                            ts: process.hrtime()
                        });
                    } catch (e) {
                        exitWithError('Error validating signatures: ' + e);
                    }
                    break;
                }
                if (+versionUserData[i] < +versionLocal[i]) {
                    break;
                }
            }
        }
    }
} catch (e) {
    console.error('Error reading user file version', e); // eslint-disable-line no-console
}
const entryPointFile = path.join(entryPointDir, 'app.js');
require(entryPointFile);

function validateSignature(appPath) {
    const signatures = JSON.parse(fs.readFileSync(path.join(appPath, 'signatures.json')));
    const selfSignature = signatures.kwResSelf;
    if (!selfSignature || !signatures['app.asar']) {
        exitWithError('Invalid signature file');
    }
    delete signatures.kwResSelf;
    const data = JSON.stringify(signatures);
    validateDataSignature(Buffer.from(data), selfSignature, 'self');
    Object.keys(signatures).forEach((signedFilePath) => {
        const resourcePath = path.join(appPath, signedFilePath);
        const fileData = fs.readFileSync(resourcePath);
        validateDataSignature(fileData, signatures[signedFilePath], signedFilePath);
    });
}

function validateDataSignature(data, signature, name) {
    const crypto = require('crypto');
    const verify = crypto.createVerify('RSA-SHA256');
    let publicKey = '@@PUBLIC_KEY_CONTENT';
    if (publicKey.startsWith('@@')) {
        publicKey = fs.readFileSync('app/resources/public-key.pem', { encoding: 'utf8' }).trim();
    }
    verify.write(data);
    verify.end();
    signature = Buffer.from(signature, 'base64');
    if (!verify.verify(publicKey, signature)) {
        exitWithError('Resource corrupted: ' + name);
    }
}

function exitWithError(err) {
    console.error(err); // eslint-disable-line no-console
    process.exit(1);
}

// KeeWeb launcher script

// This script is distributed with the app and is its entry point
// It checks whether the app is available in userData folder and if its version is higher than local, launches it
// This script is the only part which will be updated only with the app itself, auto-update will not change it

// (C) Antelle 2017, MIT license https://github.com/keeweb/keeweb

const app = require('electron').app;
const path = require('path');
const fs = require('fs');

const userDataDir = app.getPath('userData');
const userDataAppArchivePath = path.join(userDataDir, 'app.asar');
let entryPointDir = __dirname;

if (fs.existsSync(userDataAppArchivePath)) {
    let versionLocal = require('./package.json').version;
    try {
        let versionUserData = require(path.join(userDataAppArchivePath, 'package.json')).version;
        versionLocal = versionLocal.split('.');
        versionUserData = versionUserData.split('.');
        for (let i = 0; i < versionLocal.length; i++) {
            if (+versionUserData[i] > +versionLocal[i]) {
                entryPointDir = userDataAppArchivePath;
                try {
                    validateSignature(userDataDir);
                } catch (e) {
                    exitWithError('Error validating signatures: ' + e);
                }
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

function validateSignature(appPath) {
    const fs = require('original-fs');
    const signatures = JSON.parse(fs.readFileSync(path.join(appPath, 'signatures.json')));
    const selfSignature = signatures.kwResSelf;
    if (!selfSignature || !signatures['app.asar']) {
        exitWithError('Invalid signature file');
    }
    delete signatures.kwResSelf;
    const data = JSON.stringify(signatures);
    validateDataSignature(Buffer.from(data), selfSignature, 'self');
    Object.keys(signatures).forEach(signedFilePath => {
        const resourcePath = path.join(appPath, signedFilePath);
        const fileData = fs.readFileSync(resourcePath);
        validateDataSignature(fileData, signatures[signedFilePath], signedFilePath);
    });
}

function validateDataSignature(data, signature, name) {
    const crypto = require('crypto');
    const publicKey = 'PUBLIC_KEY_CONTENT';
    const verify = crypto.createVerify('RSA-SHA256');
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

const entryPointFile = path.join(entryPointDir, 'app.js');
require(entryPointFile);

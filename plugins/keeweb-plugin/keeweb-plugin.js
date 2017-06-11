#! /usr/bin/env node

/**
 * KeeWeb plugin creator
 * (C) Antelle 2017, MIT license https://github.com/keeweb/keeweb
 */

/* eslint-disable no-console */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const args = process.argv.splice(2);
const pkg = require('./package.json');

const op = args.shift();

const bumpVersion = args.some(arg => arg === '--bump-version');
const privateKeyPath = args.filter(arg => arg.startsWith('--private-key=')).map(arg => arg.replace('--private-key=', ''))[0];
const signerModule = args.filter(arg => arg.startsWith('--signer-module=')).map(arg => arg.replace('--signer-module=', ''))[0];

showBanner();

switch (op) {
    case 'sign':
        signPlugin();
        break;
    case 'watch':
        watchSignPlugin();
        break;
    default:
        showHelp();
}

function showBanner() {
    console.log(`KeeWeb plugin utils v${pkg.version}`);
}

function showHelp() {
    console.log('Usage:');
    console.log(' - node keeweb-plugin sign <plugin_name>');
    console.log('    sign plugin and exit');
    console.log(' - node keeweb-plugin watch <plugin_name>');
    console.log('    watch plugin directory and sign on changes');
    console.log('');
    console.log('Optional arguments:');
    console.log('  --bump-version');
    console.log('    bump version in package.json');
    console.log('  --private-key=/path/to/your/key.pem');
    console.log('    path to your private key');
}

function signPlugin(packageName) {
    if (!packageName) {
        packageName = getPackageArg();
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(packageName, 'manifest.json')));
    let signPromise = Promise.resolve(false);
    for (const res of Object.keys(manifest.resources)) {
        console.log(`Signing ${res}...`);
        let fileName;
        switch (res) {
            case 'js':
                fileName = 'plugin.js';
                break;
            case 'css':
                fileName = 'plugin.css';
                break;
            case 'loc':
                fileName = manifest.locale.name + '.json';
                break;
        }
        signPromise = signPromise.then(changed => {
            return signResource(packageName, fileName).then(signature => {
                if (manifest.resources[res] !== signature) {
                    manifest.resources[res] = signature;
                    changed = true;
                }
                return changed;
            });
        });
    }
    signPromise.then(changed => {
        if (changed) {
            if (bumpVersion) {
                manifest.version = manifest.version.replace(/\d+$/, v => +v + 1);
            }
            fs.writeFileSync(path.join(packageName, 'manifest.json'), JSON.stringify(manifest, null, 2));
            console.log('Done, package manifest updated');
        } else {
            console.log('No changes');
        }
    });
}

function signResource(packageName, fileName) {
    fileName = path.join(packageName, fileName);
    const data = fs.readFileSync(fileName);
    if (signerModule) {
        return require(signerModule)(data);
    } else {
        const privateKey = fs.readFileSync(privateKeyPath || path.join(packageName, 'private_key.pem'), 'binary');
        return Promise.resolve().then(() => {
            const sign = crypto.createSign('RSA-SHA256');
            sign.write(data);
            sign.end();
            return sign.sign(privateKey).toString('base64');
        });
    }
}

function watchSignPlugin() {
    const packageName = getPackageArg();
    let changed = {};
    let updateTimer;
    fs.watch(packageName, { persistent: true }, (eventType, fileName) => {
        if (fileName.lastIndexOf('manifest.json', 0) === 0) {
            return;
        }
        changed[fileName] = true;
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(() => {
            console.log('Changed:', Object.keys(changed).join(', '));
            signPlugin(packageName);
            updateTimer = null;
            changed = {};
        }, 1000);
    });
    console.log('Waiting for changes...');
}

function getPackageArg() {
    const packageName = args.shift();
    if (!packageName) {
        showHelp();
        return process.exit(1);
    }
    if (!fs.existsSync(packageName)) {
        console.error('Package folder does not exist');
        return process.exit(1);
    }
    if (!fs.existsSync(path.join(packageName, 'manifest.json'))) {
        console.error('Package manifest.json does not exist');
        return process.exit(1);
    }
    return packageName;
}

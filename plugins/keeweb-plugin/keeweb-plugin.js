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

showBanner();

switch (op) {
    case 'sign':
        signPlugin();
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
}

function signPlugin() {
    const packageName = args.shift();
    if (!packageName) {
        showHelp();
        return;
    }
    if (!fs.existsSync(packageName)) {
        console.error('Package folder does not exist');
        return process.exit(1);
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(packageName, 'manifest.json')));
    const privateKey = fs.readFileSync(path.join(packageName, 'private_key.pem'), 'binary');
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
        fileName = path.join(packageName, fileName);
        const sign = crypto.createSign('RSA-SHA256');
        sign.write(fs.readFileSync(fileName));
        sign.end();
        manifest.resources[res] = sign.sign(privateKey).toString('base64');
    }
    fs.writeFileSync(path.join(packageName, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('Done, package manifest updated');
}

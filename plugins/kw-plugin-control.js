/**
 * KeeWeb plugin creator
 * (C) Antelle 2017, MIT license https://github.com/keeweb/keeweb
 */

/* eslint-disable no-console */

const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const readline = require('readline');
const crypto = require('crypto');

const args = process.argv.splice(2);

const op = args.shift();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

showBanner();

switch (op) {
    case 'create':
        createPlugin();
        break;
    case 'sign':
        signPlugin();
        break;
    default:
        showHelp();
}

function showBanner() {
    console.log('KeeWeb plugin control');
}

function showHelp() {
    rl.close();
    console.log('Usage:');
    console.log(' - node kw-plugin-control.js create');
    console.log(' - node kw-plugin-control.js sign <plugin_name>');
}

function createPlugin() {
    gatherPluginData(data => {
        console.log('Creating plugin:', data.name);
        createPluginFolder(data);
        generateKeyPair(data);
        createManifest(data);
        createResources(data);
        console.log('Plugin created, now it\'s time to make something awesome!');
    });
}

function gatherPluginData(callback) {
    const data = {
        version: '0.0.1',
        manifestVersion: '0.1.0'
    };

    const questions = [{
        text: 'Plugin name',
        callback: name => {
            if (!name) {
                return true;
            }
            if (fs.existsSync(name)) {
                console.log(`Folder '${name}' already exists, please select another name`);
                return true;
            }
            data.name = name;
            next();
        }
    }, {
        text: 'Description',
        callback: description => {
            if (!description) {
                return true;
            }
            data.description = description;
            next();
        }
    }, {
        text: 'Author name',
        callback: authorName => {
            if (!authorName) {
                return true;
            }
            data.author = { name: authorName };
            next();
        }
    }, {
        text: 'Author email',
        callback: authorEmail => {
            if (!authorEmail || authorEmail.indexOf('@') < 0 || authorEmail.indexOf('.') < 0) {
                return true;
            }
            data.author.email = authorEmail;
            next();
        }
    }, {
        text: 'Author url',
        callback: authorUrl => {
            if (!authorUrl || authorUrl.indexOf('http://') < 0 && authorUrl.indexOf('https://') < 0) {
                return true;
            }
            data.author.url = authorUrl;
            next();
        }
    }, {
        text: 'License (default: MIT)',
        callback: licence => {
            data.licence = licence || 'MIT';
            next();
        }
    }, {
        text: 'Plugin page URL',
        callback: pluginUrl => {
            if (!pluginUrl || pluginUrl.indexOf('http://') < 0 && pluginUrl.indexOf('https://') < 0) {
                return true;
            }
            data.url = pluginUrl;
            next();
        }
    }, {
        text: 'There are different types of KeeWeb plugins:\n ' +
            '1: js only\n ' +
            '2: js + css\n ' +
            '3: css only\n ' +
            '4: locale\n' +
            'Your plugin type is',
        callback: res => {
            const placeholder = `<resource signature will be here, please run 'kw-plugin-control sign ${data.name}'>`;
            switch (res) {
                case '1':
                    data.resources = { js: placeholder };
                    break;
                case '2':
                    data.resources = { js: placeholder, css: placeholder };
                    break;
                case '3':
                    data.resources = { css: placeholder };
                    break;
                case '4':
                    data.resources = { loc: placeholder };
                    break;
                default:
                    console.error('Please enter number from 1 to 4');
                    return true;
            }
            next();
        }
    }, {
        text: 'Locale code (format: xx or xx-XX)',
        if: () => data.resources.loc,
        callback: loc => {
            if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(loc) || loc === 'en') {
                console.error('Invalid locale');
                return true;
            }
            data.locale = { name: loc };
            next();
        }
    }, {
        text: 'Locale name (human-readable)',
        if: () => data.resources.loc,
        callback: loc => {
            if (!loc || loc.toLowerCase() === 'english' || loc.toLowerCase() === 'default') {
                console.error('Invalid locale');
                return true;
            }
            data.locale.title = loc;
            next();
        }
    }];

    next();

    function next() {
        const question = questions.shift();
        if (!question) {
            callback(data);
            rl.close();
        } else {
            if (question.if && !question.if()) {
                return next();
            }
            ask(question.text, question.callback);
        }
    }
}

function ask(question, callback) {
    rl.question(`${question}: `, answer => {
        const res = callback(answer.trim());
        if (res) {
            ask(res.question || question, callback);
        }
    });
}

function createPluginFolder(data) {
    console.log('Creating plugin folder...');
    fs.mkdirSync(data.name);
}

function generateKeyPair(data) {
    console.log('Generating key pair...');
    const privateKeyPath = path.join(data.name, 'private_key.pem');
    const publicKeyPath = path.join(data.name, 'public_key.pem');
    childProcess.execSync(`openssl genpkey -algorithm RSA -out "${privateKeyPath}" -pkeyopt rsa_keygen_bits:2048`);
    childProcess.execSync(`openssl rsa -pubout -in "${privateKeyPath}" -out "${publicKeyPath}"`);
    data.publicKey = fs.readFileSync(path.join(data.name, 'public_key.pem'), 'utf8')
        .match(/-+BEGIN PUBLIC KEY-+([\s\S]+?)-+END PUBLIC KEY-+/)[1]
        .replace(/\n/g, '');
    fs.unlinkSync(publicKeyPath);
}

function createManifest(data) {
    console.log('Creating manifest...');
    fs.writeFileSync(path.join(data.name, 'manifest.json'), JSON.stringify(data, null, 2));
}

function createResources(data) {
    console.log('Adding default files...');
    if (data.resources.js) {
        fs.writeFileSync(path.join(data.name, 'plugin.js'), `/**
 * KeeWeb plugin: ${data.name}
 * @author ${data.author.name}
 * @license ${data.licence}
 */

/* global kw */
`);
    }
    if (data.resources.css) {
        fs.writeFileSync(path.join(data.name, 'plugin.css'), '');
    }
    if (data.resources.loc) {
        fs.writeFileSync(path.join(data.name, data.locale.name + '.json'), '{\n}');
    }
    fs.writeFileSync(path.join(data.name, '.gitignore'), ['.DS_Store', '*.log', '*.pem'].join('\n'));
}

function signPlugin() {
    rl.close();
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

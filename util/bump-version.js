#!/usr/bin/env node

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const releaseNotesContents = fs.readFileSync('release-notes.md', 'utf8');

const version = releaseNotesContents.match(/\d+\.\d+\.\d+/)[0];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Bad version');
    process.exit(1);
}

console.log('Change version to ' + version);

processFile('package.json');
processFile('package-lock.json');
processFile('desktop/package.json');

console.log('Done');

function processFile(name) {
    console.log('Replace: ' + name);
    name = path.join(__dirname, '..', name);
    const content = fs.readFileSync(name, 'utf8');
    const data = JSON.parse(content);
    if (!/\d+\.\d+\.\d+/.test(data.version)) {
        throw new Error('No match found!');
    }
    data.version = version;
    const newContent = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(name, newContent, 'utf8');
}

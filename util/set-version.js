/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Bad version. Usage: node set-version.js 1.2.3');
    process.exit(1);
}

console.log('Change version to ' + version);

processFile('package.json');
processFile('package-lock.json');
processFile('desktop/package.json');
processFile('desktop/package-lock.json');

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
    const numSpaces = name.endsWith('package-lock.json') ? 2 : 4;
    const newContent = JSON.stringify(data, null, numSpaces) + '\n';
    fs.writeFileSync(name, newContent, 'utf8');
}

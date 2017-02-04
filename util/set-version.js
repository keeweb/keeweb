/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error('Bad version. Usage: node set-version.js 1.2.3');
    process.exit(1);
}

console.log('Change version to ' + version);

// processFile('README.md', /\/download\/v[^\/]+/g);
processFile('package.json', /"version": "\d+\.\d+\.\d+"+/g);
processFile('desktop/package.json', /"version": "\d+\.\d+\.\d+"+/g);

console.log('Done');

function processFile(name, regex) {
    console.log('Replace: ' + name);
    name = path.join(__dirname, '..', name);
    let content = fs.readFileSync(name, 'utf8');
    let replCount = 0;
    content = content.replace(regex, match => {
        replCount++;
        return match.replace(/\d+\.\d+\.\d+/, version);
    });
    if (!replCount) {
        throw 'No match found!';
    }
    fs.writeFileSync(name, content, 'utf8');
}

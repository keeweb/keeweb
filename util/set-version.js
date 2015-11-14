'use strict';

var fs = require('fs'),
    path = require('path');

var version = process.argv[2];
if (!/\d+\.\d+\.\d+/.test(version)) {
    console.error('Bad version. Usage: node set-version.js 1.2.3');
}

console.log('Change version to ' + version);

//processFile('README.md', /\/download\/v[^\/]+/g);
processFile('package.json', /"version": "\d+\.\d+\.\d+"+/g);
processFile('electron/package.json', /"version": "\d+\.\d+\.\d+"+/g);

console.log('Done');

function processFile(name, regex) {
    console.log('Replace: ' + name);
    name = path.join(__dirname, '..', name);
    var content = fs.readFileSync(name, 'utf8');
    var replCount = 0;
    content = content.replace(regex, function(match) {
        replCount++;
        return match.replace(/\d+\.\d+\.\d+/, version);
    });
    if (!replCount) {
        throw 'No match found!';
    }
    fs.writeFileSync(name, content, 'utf8');
}

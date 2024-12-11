#!/usr/bin/env node

/*
    This script handles the following:
        - read package.json
        - create .env file
        - return uuid, guid, version

    can be called with the following external commands:
        - node keeweb.js
        - node keeweb.js generate
        - node keeweb.js uuid
        - node keeweb.js guid
        - node keeweb.js versiom

    can be called with the following KeeWeb commands:
        - npm run keeweb
        - npm run keeweb:generate
        - npm run env-keeweb
        - npm run env-uuid
        - npm run env-guid
        - npm run env-version
*/

const fs = require('fs');
const { v5: uid } = require('uuid');

/*
 *    declrations > package.json
 */

const { version, repository } = JSON.parse(fs.readFileSync('./package.json'));
const args = process.argv.slice(2, process.argv.length);
const action = args[0];

if (action === 'guid') {
    console.log(`${process.env.GUID}`);
} else if (action === 'setup') {
    fs.writeFileSync('.env', '', (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`Wrote to .env successfully`);
        }
    });
} else if (action === 'generate') {
    const buildGuid = uid(`${repository.url}`, uid.URL);
    const buildUuid = uid(version, buildGuid);

    const ids = `
VERSION=${version}
GUID=${buildGuid}
UUID=${buildUuid}
`;

    console.log(version);
    console.log(buildGuid);
    console.log(buildUuid);

    fs.writeFileSync('.env', ids, (err) => {
        if (err) {
            console.error(`Could not write env vars: ${err}`);
        } else {
            console.log(`Wrote env vars to .env`);
        }
    });
} else if (action === 'uuid') {
    console.log(`${process.env.UUID}`);
} else {
    console.log(version);
}

process.exit(0);

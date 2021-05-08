const fs = require('fs');
const path = require('path');

const version = process.argv
    .filter((arg) => arg.startsWith('--version='))
    .map((arg) => arg.replace('--version=', ''))[0];
if (!version) {
    throw new Error('No version, launch with --version=1.2.3');
}

const output = process.argv
    .filter((arg) => arg.startsWith('--output='))
    .map((arg) => arg.replace('--output=', ''))[0];
if (!output) {
    throw new Error('No output file, launch with --output=path/to/output-file.md');
}

// eslint-disable-next-line no-console
console.log(`Reading release notes for v${version}`);

const releaseNotesPath = path.join(__dirname, '../release-notes.md');
const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
const regex = new RegExp(`#####\\s+v${version.replace(/\./g, '\\.')}.*?\n([\\s\\S]*?)\n#####`);

const match = releaseNotes.match(regex);
if (!match) {
    throw new Error(`Release notes for v${version} not found`);
}

const bodyReleaseNotes = match[1].trim().replace(/\s*\n/g, '\n');

const body = `${bodyReleaseNotes}

Want to keep releases happening? Donate to KeeWeb on [OpenCollective](https://opencollective.com/keeweb) or [GitHub](https://github.com/sponsors/keeweb). Thank you!`;

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, body);

// eslint-disable-next-line no-console
console.log(`Saved release notes for v${version} to ${output}`);

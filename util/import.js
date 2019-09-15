/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const readdirSync = (p, a = []) => {
    if (fs.statSync(p).isDirectory()) {
        fs.readdirSync(p).map(f => readdirSync(a[a.push(path.join(p, f)) - 1], a));
    }
    return a;
};

console.log('Building file list...');

const files = readdirSync('app/scripts').filter(f => f.endsWith('.js'));

console.log(`Found ${files.length} files, working...`);

for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const imports = [];
    for (let ix = 0; ix < lines.length; ix++) {
        const match = lines[ix].match(/^const\s+(\w+)\s*=\s*require\('(.*)'\);$/);
        if (!match) {
            break;
        }
        let [, variable, modPath] = match;
        if (modPath.includes('/')) {
            modPath = path.join(path.dirname(file), modPath).replace('app/scripts/', '');
        }
        imports.push({
            variable,
            modPath
        });
    }
    imports.sort((a, b) => {
        const aModPath = a.modPath.includes('/') ? a.modPath : `_${a.modPath}`;
        const bModPath = b.modPath.includes('/') ? b.modPath : `_${b.modPath}`;
        return aModPath.localeCompare(bModPath);
    });
    for (let ix = 0; ix < imports.length; ix++) {
        const imp = imports[ix];
        lines[ix] = `import { ${imp.variable} } from '${imp.modPath}';`;
    }

    for (let ix = 0; ix < lines.length; ix++) {
        const match = lines[ix].match(/^module\.exports/);
        if (!match) {
            continue;
        }
        const simpleExportMatch = lines[ix].match(/^module.exports\s*=\s*(\w+);/);
        if (simpleExportMatch) {
            const varName = simpleExportMatch[1];
            lines[ix] = `export { ${varName} };`;
            continue;
        }
        console.log(lines[ix]);
    }
    // fs.writeFileSync(file, lines.join('\n'));
}

console.log('Done');

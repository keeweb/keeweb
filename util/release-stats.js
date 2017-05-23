/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const ps = require('child_process');

const cwd = path.resolve(__dirname, 'keeweb');

if (!fs.existsSync(cwd)) {
    console.log('Cloning...');
    ps.spawnSync('git', ['clone', 'git@github.com:keeweb/keeweb.git', '-b', 'gh-pages'], {cwd: __dirname});
}

console.log('Getting log...');

ps.spawnSync('git', ['reset', '--hard'], {cwd});
ps.spawnSync('git', ['checkout', 'gh-pages'], {cwd});
const gitLog = ps.spawnSync('git', ['log'], {cwd}).stdout.toString();

console.log('Gettings tags...');

const tags = ps.spawnSync('git', ['tag', '-l'], {cwd})
    .stdout.toString()
    .split('\n')
    .filter(tag => tag);

console.log(`Found ${tags.length} tags`);

const stats = [];
for (const tag of tags) {
    console.log(`Tag: ${tag}`);
    const match = new RegExp(`commit (\\w+)\\nAuthor[^\\n]+\\nDate:\\s*([^\\n]+)\\n\\n\\s*${tag}`).exec(gitLog);
    const [, rev, date] = match;
    const dt = new Date(date).getTime();
    const checkoutRes = ps.spawnSync('git', ['checkout', rev], {cwd});
    if (checkoutRes.error) {
        console.error('Checkout error', checkoutRes.error);
        throw 'Checkout error';
    }

    const size = {};

    const data = fs.readFileSync(path.join(cwd, 'index.html'));
    const html = data.toString();

    size.total = data.byteLength;
    size.favicons = /<link rel="shortcut icon"[^>]+>/.exec(html)[0].length +
        (/<link rel="apple-touch-icon"[^>]+>/.exec(html) || [''])[0].length;
    size.css = /<style>.*?<\/style>/.exec(html)[0].length;
    size.jsVendor = /<\/style><script>[\s\S]*?<\/script>/.exec(html)[0].length;
    size.jsApp = /<\/script><script>[\s\S]*?<\/script>/.exec(html)[0].length;

    stats.push({ tag, rev, dt, size });
}

// https://api.github.com/repos/keeweb/keeweb/issues?state=all&sort=created&direction=asc

console.log('Saving stats...');

fs.writeFileSync(path.resolve(__dirname, 'release-stats.json'), JSON.stringify(stats, null, 2));

console.log('Done');

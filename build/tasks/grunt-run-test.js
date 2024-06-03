module.exports = function (grunt) {
    grunt.registerMultiTask('run-test', 'Runs KeeWeb browser-tests', function () {
        const done = this.async();
        const opt = this.options();
        const file = this.files[0].src[0];
        const path = require('path');
        const puppeteer = require('puppeteer');
        (async function () {
            grunt.log.writeln('Running tests...');
            const fullPath = 'file://' + path.resolve(file);
            const browser = await puppeteer.launch({
                headless: opt.headless,
                executablePath: process.env.CHROME_BIN || null,
                args: ['--disable-dev-shm-usage']
            });
            grunt.log.writeln('puppeteer launched...');
            const page = await browser.newPage();
            await page.goto(fullPath);
            async function check() {
                const result = await page.evaluate(() => {
                    const { output, done } = window;
                    window.output = [];
                    return { output, done };
                });
                for (const out of result.output) {
                    if (!out.args.length) {
                        continue;
                    }
                    // eslint-disable-next-line no-console
                    console[out.method](...out.args);
                }
                if (result.done) {
                    await browser.close();
                    const { failures } = result.done;
                    if (failures) {
                        grunt.warn(`Failed ${failures} test${failures > 1 ? 's' : ''}.`);
                    } else {
                        grunt.log.writeln('All tests passed');
                        done();
                    }
                } else {
                    setTimeout(check, 100);
                }
            }

            check();
        })();
    });
};

module.exports = function (grunt) {
    grunt.registerMultiTask('virustotal', 'Checks if a file has issues on VirusTotal', function () {
        const done = this.async();
        const opt = this.options();

        const path = require('path');
        const fs = require('fs');
        const got = (...args) => import('got').then(({ default: got }) => got(...args));

        const FormData = require('form-data');

        Promise.all(
            this.files[0].src.map((file) =>
                checkFile(opt, file).catch((err) => {
                    grunt.warn('VirusTotal check failed: ' + err);
                })
            )
        ).then(done);

        /*
            convert to a more suitable time
        */

        function formatMilliseconds(ms) {
            const m = Math.floor(ms / 60000);
            const s = ((ms % 60000) / 1000).toFixed(0);
            return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
        }

        async function checkFile(opt, file) {
            grunt.log.writeln(`Uploading to VirusTotal: ${file}...`);

            const timeStarted = Date.now();

            const { apiKey, prefix, timeout = 60 * 1000 } = opt;
            const interval = 5000;

            const headers = { 'x-apikey': apiKey };

            const fileData = fs.readFileSync(file);
            const fileName = (prefix || '') + path.basename(file);

            const form = new FormData();
            form.append('file', fileData, fileName);

            const dataResp = await got('https://virustotal.com/api/v3/files', {
                method: 'POST',
                headers,
                body: form
            });

            const fileUploadResp = dataResp.body && JSON.parse(dataResp.body);

            if (!fileUploadResp) {
                throw new Error(`Failed to fetch report from VirusTotal`);
            }

            if (fileUploadResp.error) {
                const errStr = JSON.stringify(fileUploadResp.error);
                throw new Error(`File upload error: ${errStr}`);
            }

            const id = fileUploadResp.data.id;
            if (!id) {
                throw new Error('File upload error: empty id');
            }

            grunt.log.writeln(`\nUploaded ${file} to VirusTotal, id: ${id}`.grey.bold);

            let elapsed;
            do {
                const checkResp = await fetch(`https://www.virustotal.com/api/v3/analyses/${id}`, {
                    headers
                });

                const checkRespData = await checkResp.json();
                if (checkRespData.error) {
                    const errStr = JSON.stringify(checkRespData.error);
                    throw new Error(`File check error: ${errStr}`.red.bold);
                }

                const { attributes } = checkRespData.data;
                if (attributes.status === 'completed') {
                    const { stats } = attributes;
                    if (stats.malicious > 0) {
                        throw new Error(
                            `File ${file} reported as malicious ${stats.malicious} time(s)`.yellow.bold
                        );
                    }
                    if (stats.suspicious > 0) {
                        throw new Error(
                            `File ${file} reported as malicious ${stats.suspicious} time(s)`.red.bold
                        );
                    }
                    const statsStr = Object.entries(stats)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ');
                    grunt.log.writeln(`VirusTotal Check OK: ${file}, stats:`.green.bold, statsStr);
                    return;
                }

                elapsed = Date.now() - timeStarted;
                const elapsedHuman = formatMilliseconds(elapsed);
                grunt.log.writeln(
                    `VirusTotal Status: ${attributes.status}, ${elapsedHuman}`.grey.bold
                );

                await wait(interval);
            } while (elapsed < timeout);

            throw new Error(`VirusTotal timed out after ${timeout}ms`.red.bold);
        }

        function wait(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }
    });
};

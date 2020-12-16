module.exports = function (grunt) {
    grunt.registerMultiTask('virustotal', 'Checks if a file has issues on VirusTotal', function () {
        const done = this.async();
        const opt = this.options();

        const path = require('path');
        const fs = require('fs');
        const fetch = require('node-fetch');
        const FormData = require('form-data');

        Promise.all(
            this.files[0].src.map((file) =>
                checkFile(opt, file).catch((err) => {
                    grunt.warn('VirusTotal check failed: ' + err);
                })
            )
        ).then(done);

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
            const fileUploadResp = await fetch('https://www.virustotal.com/api/v3/files', {
                method: 'POST',
                headers,
                body: form
            });
            const fileUploadRespData = await fileUploadResp.json();
            if (fileUploadRespData.error) {
                const errStr = JSON.stringify(fileUploadRespData.error);
                throw new Error(`File upload error: ${errStr}`);
            }

            const id = fileUploadRespData.data.id;
            if (!id) {
                throw new Error('File upload error: empty id');
            }

            grunt.log.writeln(`Uploaded ${file} to VirusTotal, id: ${id}`);

            let elapsed;
            do {
                const checkResp = await fetch(`https://www.virustotal.com/api/v3/analyses/${id}`, {
                    headers
                });
                const checkRespData = await checkResp.json();
                if (checkRespData.error) {
                    const errStr = JSON.stringify(checkRespData.error);
                    throw new Error(`File check error: ${errStr}`);
                }
                const { attributes } = checkRespData.data;
                if (attributes.status === 'completed') {
                    const { stats } = attributes;
                    if (stats.malicious > 0) {
                        throw new Error(
                            `File ${file} reported as malicious ${stats.malicious} time(s)`
                        );
                    }
                    if (stats.suspicious > 0) {
                        throw new Error(
                            `File ${file} reported as malicious ${stats.suspicious} time(s)`
                        );
                    }
                    const statsStr = Object.entries(stats)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ');
                    grunt.log.writeln(`VirusTotal check OK: ${file}, stats:`, statsStr);
                    return;
                }

                elapsed = Date.now() - timeStarted;
                grunt.log.writeln(
                    `VirusTotal check status: ${attributes.status}, elapsed ${elapsed}ms`
                );

                await wait(interval);
            } while (elapsed < timeout);

            throw new Error(`Timed out after ${timeout}ms`);
        }

        function wait(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }
    });
};

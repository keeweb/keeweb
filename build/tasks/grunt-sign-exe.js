const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const AdmZip = require('adm-zip');
const { runRemoteTask } = require('run-remote-task');

module.exports = function(grunt) {
    grunt.registerMultiTask(
        'sign-exe',
        'Signs exe file with authenticode certificate',
        async function() {
            const done = this.async();
            const opt = this.options();

            for (const [file, name] of Object.entries(opt.files)) {
                await signFile(file, name, opt);
            }

            done();
        }
    );

    async function signFile(file, name, opt) {
        grunt.log.writeln(`Signing ${file}...`);

        const fileNameWithoutFolder = path.basename(file);

        const actionConfig = {
            exe: fileNameWithoutFolder,
            name: name || fileNameWithoutFolder,
            url: opt.url
        };

        const zip = new AdmZip();
        zip.addFile('action.json', Buffer.from(JSON.stringify(actionConfig)));
        zip.addLocalFile(file);
        const zipContents = zip.toBuffer();

        fs.writeFileSync('data.zip', zipContents);

        try {
            const taskResult = await runRemoteTask(opt.windows, zipContents);
            const signedFile = taskResult.file;

            const res = spawnSync('osslsigncode', ['verify', signedFile]);
            if (res.status) {
                const hasCertHash = res.stdout.includes(`Serial : ${opt.certHash}`);
                if (!hasCertHash) {
                    grunt.warn(
                        `Verify error ${file}: exit code ${res.status}.\n${res.stdout.toString()}`
                    );
                }
            }
            fs.renameSync(signedFile, file);
            grunt.log.writeln(`Signed ${file}: ${name}`);
        } catch (e) {
            grunt.warn(`Sign error ${file}: ${e}`);
        }
    }
};

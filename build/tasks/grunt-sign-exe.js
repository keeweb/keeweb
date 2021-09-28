const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const AdmZip = require('adm-zip');
const { runRemoteTask } = require('run-remote-task');

module.exports = function (grunt) {
    grunt.registerMultiTask(
        'sign-exe',
        'Signs exe file with authenticode certificate',
        async function () {
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

            const zip = new AdmZip(signedFile);
            const data = zip.readFile(fileNameWithoutFolder);

            fs.writeFileSync(signedFile, data);

            const signtool =
                'C:\\Program Files (x86)\\Windows Kits\\10\\App Certification Kit\\signtool.exe';
            const res = spawnSync(signtool, ['verify', '/pa', '/v', signedFile]);

            if (res.status) {
                grunt.warn(
                    `Verify error ${file}: exit code ${
                        res.status
                    }.\nSTDOUT:\n${res.stdout.toString()}\nSTDERR:\n${res.stderr.toString()}`
                );
            }

            if (!res.stdout.includes('Successfully verified')) {
                grunt.warn(
                    `Verify error ${file}.\nSTDOUT:\n${res.stdout.toString()}\nSTDERR:\n${res.stderr.toString()}`
                );
            }

            if (!res.stdout.includes(opt.certHash)) {
                grunt.warn(`Verify error ${file}: expected hash was not found`);
            }

            fs.unlinkSync(signedFile);
            fs.writeFileSync(file, data);
            grunt.log.writeln(`Signed ${file}: ${name}`);
        } catch (e) {
            grunt.warn(`Sign error ${file}: ${e}`);
        }
    }
};

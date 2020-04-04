const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

module.exports = function(grunt) {
    grunt.registerMultiTask('sign-exe', 'Signs exe file with authenticode certificate', function() {
        const opt = this.options();
        for (const [file, name] of Object.entries(opt.files)) {
            signFile(file, name, opt);
        }
    });

    function signFile(file, name, opt) {
        const fileNameWithoutFolder = path.basename(file);
        const sharePath = `${process.env.HOME}/VMShare/${fileNameWithoutFolder}`;
        fs.copyFileSync(file, sharePath);

        const timeServer = 'http://timestamp.verisign.com/scripts/timstamp.dll';

        const cmd = 'VBoxManage';
        const args = [
            'guestcontrol',
            opt.vm.name,
            '--username',
            opt.vm.user,
            '--password',
            opt.vm.pass,
            'run',
            opt.vm.exec,
            `sign /t ${timeServer} /d "${name}" /du ${opt.url} ${opt.vm.share}${fileNameWithoutFolder}`
        ];
        // the algo is not working: "/fd ${opt.algo}"
        let res = spawnSync(cmd, args);
        if (res.status) {
            args[5] = '*';
            const cmdStr = cmd + ' ' + args.join(' ');
            grunt.warn(`Sign error ${file}: exit code ${res.status}.\nCommand: ${cmdStr}`);
        }
        res = spawnSync('osslsigncode', ['verify', sharePath]);
        if (res.status) {
            const hasCertHash = res.stdout.includes(`Serial : ${opt.certHash}`);
            if (!hasCertHash) {
                grunt.warn(
                    `Verify error ${file}: exit code ${res.status}.\n${res.stdout.toString()}`
                );
            }
        }
        fs.renameSync(sharePath, file);
        grunt.log.writeln(`Signed ${file}: ${name}`);
    }
};

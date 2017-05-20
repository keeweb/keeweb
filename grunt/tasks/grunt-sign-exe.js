// https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Signing_an_executable_with_Authenticode

const fs = require('fs');

module.exports = function (grunt) {
    grunt.registerMultiTask('sign-exe', 'Signs exe file with authenticode certificate', function () {
        const keytar = require('keytar');
        const opt = this.options();
        const done = this.async();
        const password = keytar.getPassword(opt.keytarPasswordService, opt.keytarPasswordAccount);
        if (!password) {
            return grunt.warn('Code sign password not found');
        }
        const promises = Object.keys(opt.files).map(file => signFile(file, opt.files[file], opt, password));
        Promise.all(promises).then(done);
    });

    function signFile(file, name, opt, password) {
        const signedFile = file + '.sign';
        return new Promise((resolve, reject) => {
            const args = [
                '-spc', opt.spc,
                '-key', require('path').resolve(opt.pvk),
                '-h', opt.algo,
                '-n', name,
                '-i', opt.url,
                '-t', 'http://timestamp.verisign.com/scripts/timstamp.dll',
                '-pass', password,
                '-in', file,
                '-out', signedFile
            ];
            const spawned = grunt.util.spawn({
                cmd: 'osslsigncode',
                args: args
            }, (error, result, code) => {
                if (error || code) {
                    spawned.kill();
                    grunt.warn(`Cannot sign file ${file}, signtool error ${code}: ${error}`);
                    return reject();
                }
                if (fs.existsSync(file)) {
                    fs.renameSync(signedFile, file);
                }
                grunt.log.writeln(`Signed: ${file}: ${name}`);
                resolve();
            });
            // spawned.stdout.pipe(process.stdout);
            spawned.stderr.pipe(process.stderr);
            // spawned.stdin.setEncoding('utf-8');
            // spawned.stdin.write(password);
            // spawned.stdin.write('\n');
        });
    }
};

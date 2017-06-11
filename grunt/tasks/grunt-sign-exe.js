/**
 * This will require the latest (unreleased) version of `osslsigncode` with pkcs11 patch
 * Build it like this:
 *
 * curl -L http://sourceforge.net/projects/osslsigncode/files/osslsigncode/osslsigncode-1.7.1.tar.gz/download -o osslsigncode.tar.gz
 * tar -zxvf osslsigncode.tar.gz
 * git clone https://git.code.sf.net/p/osslsigncode/osslsigncode osslsigncode-master
 * cp osslsigncode-master/osslsigncode.c osslsigncode-1.7.1/osslsigncode.c
 * rm osslsigncode.tar.gz
 * rm -rf osslsigncode-master
 * cd osslsigncode-1.7.1/
 * export PKG_CONFIG_PATH=/usr/local/opt/openssl/lib/pkgconfig
 * ./configure
 * make
 * sudo cp osslsigncode /usr/local/bin/osslsigncode
 *
 * Install this:
 *  brew install opensc
 *  brew install engine_pkcs11
 *
 * https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Signing_an_executable_with_Authenticode
 */

const fs = require('fs');

module.exports = function (grunt) {
    grunt.registerMultiTask('sign-exe', 'Signs exe file with authenticode certificate', async function () {
        const opt = this.options();
        const done = this.async();
        if (opt.pvk) {
            const keytar = require('keytar');
            keytar.getPassword(opt.keytarPasswordService, opt.keytarPasswordAccount).then(password => {
                if (!password) {
                    return grunt.warn('Code sign password not found');
                }
                const promises = Object.keys(opt.files).map(file => signFile(file, opt.files[file], opt, password));
                Promise.all(promises).then(done);
            }).catch(e => {
                grunt.warn('Code sign error: ' + e);
            });
        } else {
            const sign = require('../lib/sign');
            const pin = await sign.getPin();
            for (const file of Object.keys(opt.files)) {
                await signFile(file, opt.files[file], opt, pin);
            }
            done();
        }
    });

    function signFile(file, name, opt, password) {
        const signedFile = file + '.sign';
        return new Promise((resolve, reject) => {
            const pkcsArgs = opt.pvk ? [] : [
                '-pkcs11engine', '/usr/local/lib/engines/engine_pkcs11.so',
                '-pkcs11module', '/usr/local/lib/opensc-pkcs11.so'
            ];
            const args = [
                '-spc', opt.spc,
                '-key', opt.pvk ? require('path').resolve(opt.pvk) : opt.key,
                '-pass', password,
                '-h', opt.algo,
                '-n', name,
                '-i', opt.url,
                '-t', 'http://timestamp.verisign.com/scripts/timstamp.dll',
                ...pkcsArgs,
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
                grunt.util.spawn({
                    cmd: 'osslsigncode',
                    args: ['verify', signedFile]
                }, (ex, result, code) => {
                    if (code) {
                        grunt.warn(`Verify error ${file}: \n${result.stdout.toString()}`);
                        return;
                    }
                    if (fs.existsSync(file)) {
                        fs.renameSync(signedFile, file);
                    }
                    grunt.log.writeln(`Signed ${file}: ${name}`);
                    resolve();
                });
            });
            // spawned.stdout.pipe(process.stdout);
            spawned.stderr.pipe(process.stderr);
            // spawned.stdin.setEncoding('utf-8');
            // spawned.stdin.write(password);
            // spawned.stdin.write('\n');
        });
    }
};

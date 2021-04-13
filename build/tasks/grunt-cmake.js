const path = require('path');
const fs = require('fs');

module.exports = function (grunt) {
    grunt.registerMultiTask('cmake', 'Builds with CMake', async function () {
        const done = this.async();
        const opt = this.options();

        for (const file of this.files) {
            const dest = file.dest;
            const src = file.src[0];

            const binPath = path.resolve(src, 'build', opt.outputName);
            if (fs.existsSync(binPath)) {
                fs.unlinkSync(binPath);
            }

            try {
                await spawnCmake(['-B', 'build', '.', ...(opt.cmakeConfigure || [])], src);
            } catch (e) {
                grunt.warn(`Configure error: ${e}`);
            }

            try {
                await spawnCmake(['--build', 'build', '--config', 'MinSizeRel'], src);
            } catch (e) {
                grunt.warn(`Build error: ${e}`);
            }

            grunt.file.copy(binPath, dest);
            fs.chmodSync(dest, 0o755);

            grunt.log.writeln(`Built ${dest}`);

            done();
        }
    });

    function spawnCmake(args, cwd) {
        return new Promise((resolve, reject) => {
            grunt.log.writeln(`cmake ${args.join(' ')}`);
            const child = grunt.util.spawn(
                { cmd: 'cmake', args, opts: { cwd } },
                (err, result, code) => {
                    if (code) {
                        reject(new Error(`CMake exit code ${code}`));
                    } else if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
        });
    }
};

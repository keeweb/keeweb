const { spawnSync } = require('child_process');

module.exports = function (grunt) {
    grunt.registerMultiTask(
        'osacompile',
        'Builds an executable .app package with osacompile',
        async function () {
            const done = this.async();
            const opt = this.options();

            for (const file of this.files) {
                const dest = file.dest;
                const src = file.src[0];

                const args = [];
                if (opt.language) {
                    args.push('-l', opt.language);
                }
                args.push('-o', dest);
                args.push(src);

                grunt.log.writeln(`Running: osacompile ${args.join(' ')}`);

                const res = spawnSync('osacompile', args);

                if (res.status) {
                    grunt.warn(
                        `osacompile exit code ${
                            res.status
                        }.\nSTDOUT:\n${res.stdout.toString()}\nSTDERR:\n${res.stderr.toString()}`
                    );
                }

                grunt.log.writeln(`Built ${dest}`);
            }

            done();
        }
    );
};

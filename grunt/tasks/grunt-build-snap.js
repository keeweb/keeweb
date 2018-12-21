module.exports = function (grunt) {
    /**
     * DOCS
     *
     * Task create image of package compatible with repository snapcraft
     * A universal app format for Linux
     *
     * SOURCES
     * discussion about this code - https://github.com/keeweb/keeweb/pull/1037
     * grunt plugin - https://github.com/electron-userland/electron-builder/issues/62
     * this feature request - https://github.com/keeweb/keeweb/issues/450
     * colors - https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
     * executing bash command in node - https://stackoverflow.com/questions/1880198/how-to-execute-shell-command-in-javascript
     * tutorial about building snap - https://docs.snapcraft.io/electron-apps/6748
     */
    grunt.registerTask('build-desktop-dist-snap', 'Build snap images. https://snapcraft.io/', () => {
        // const RED = '\x1b[31m%s\x1b[0m'; const GREEN = '\x1b[32m%s\x1b[0m'; // colors for linux console
        const exec = require('child_process').execSync; // https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options

        // console.log('Snap building, it can take about 25 seconds');

        // let out;
        try {
            // out =
            exec('./node_modules/.bin/build --linux snap --project desktop', {encoding: 'utf-8'});
        } catch (e) {
            // console.log(RED, e);
            process.exit();
        }

        // console.log(GREEN, out);
    });
};

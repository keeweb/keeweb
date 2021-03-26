module.exports = function (grunt) {
    grunt.registerMultiTask('electron-patch', 'Patches Electron executable', async function () {
        const patch = require('electron-evil-feature-patcher');

        for (const { src } of this.files) {
            for (const path of src) {
                grunt.log.writeln(`Patching ${path}...`);
                patch({ path });
            }
        }
    });
};

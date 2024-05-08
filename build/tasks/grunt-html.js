module.exports = function (grunt) {
    grunt.registerMultiTask('html-preload', 'Inject preloader for images', function () {
        /*
            options
        */

        const opt = this.options();

        /*
            requires
        */

        const fs = require('fs-extra');
        const path = require('path');

        /*
            Wallpapers
        */

        const wallpaperFolder = path.join(__dirname, '..', '..', opt.resources);
        const wallpaperFiles = fs.readdirSync(wallpaperFolder);
        let headerPreload = '';

        /*
            loop all wallpaper files, find path, concat new string for preload
        */

        wallpaperFiles.forEach((file) => {
            const fileStat = fs.statSync(wallpaperFolder + '/' + file).isDirectory();
            if (!fileStat) {
                headerPreload +=
                    "<link rel='preload' href='wallpapers/" + file + "' as='image'>\n\t";
            }
        });

        for (const file of this.files) {
            const html = grunt.file.read(file.src[0], { encoding: 'utf8' });
            const htmlUpdated = html.replace(/<!--{{PRELOADER}}-->/gim, headerPreload);

            grunt.log.writeln(
                `→ Injecting HTML preloader into ${file.src[0]} for images in ${wallpaperFolder}`
                    .green.bold
            );

            grunt.file.write(file.src[0], htmlUpdated);
        }
    });
};

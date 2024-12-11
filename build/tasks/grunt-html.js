const chalk = import('chalk').then((m) => m.default); // chalk v5 now uses ESM instead of CommonJS

module.exports = function (grunt) {
    /*
        Injects <link rel=''> where placeholder pattern is found.
        used prmarily for preloading assets.

        Example Gruntfile.js Config:

            'html-linkrel': {
                options: {
                    replacements: [
                        {
                            rel: 'preload',
                            pattern: /<!--{{PRELOAD_IMAGES}}-->/,
                            hrefPath: 'wallpapers',
                            searchPath: 'app/wallpapers',
                            as: 'image',
                            type: 'image/jpeg',
                            cors: 'anonymous'
                        },
                        {
                            rel: 'preload',
                            pattern: /<!--{{PRELOAD_CSS}}-->/,
                            hrefPath: 'css/app.css',
                            as: 'style',
                            cors: false
                        },
                        {
                            rel: 'preload',
                            pattern: /<!--{{PRELOAD_JS}}-->/,
                            hrefPath: 'js/app.js',
                            as: 'script',
                            cors: false
                        },
                        {
                            pattern: /<!--{{ICONS_APPLE}}-->/,
                            assets: [
                                {
                                    rel: 'apple-touch-startup-image',
                                    href: 'icons/splash-640x1136.png',
                                    media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)'
                                }
                            ]
                        }
                    ]
                },
                app: {
                    src: 'tmp/index.html'
                }
            }
    */

    grunt.registerMultiTask('htmlinkrel', 'Inject html rel tags', function () {
        /*
            options
        */

        const opt = this.options({
            replacements: []
        });

        /*
            requires
        */

        const fs = require('fs-extra');
        const path = require('path');

        /*
            Loop replacements
        */

        let i = 0;
        while (i < opt.replacements.length) {
            // option: name
            const name = opt.replacements[i].name || 'untitled';

            // option: rel
            const rel = opt.replacements[i].rel || 'preload';
            const relString = rel && typeof rel === 'string' ? ` rel="${rel}"` : ``;

            // option: href
            const hrefPath = opt.replacements[i].hrefPath || false;
            const hrefString =
                hrefPath && typeof hrefPath === 'string' ? ` href="${hrefPath}"` : ``;

            // option: general
            const searchPath = opt.replacements[i].searchPath || '';
            const pattern = opt.replacements[i].pattern;

            // option: as
            const as = opt.replacements[i].as || false;
            const asString = as && typeof as === 'string' ? ` as="${as}"` : ``;

            // option: media
            const media = opt.replacements[i].media || false;
            const mediaString = media && typeof media === 'string' ? ` media="${media}"` : ``;

            // option: type
            const type = opt.replacements[i].type || false;
            const typeString = type && typeof type === 'string' ? ` type="${type}"` : ``;

            // option: sizes
            const sizes = opt.replacements[i].sizes || false;
            const sizesString = sizes && typeof sizes === 'string' ? ` sizes="${sizes}"` : ``;

            // option: color
            const color = opt.replacements[i].color || false;
            const colorString = color && typeof color === 'string' ? ` color="${color}"` : ``;

            // option: class
            const classes = opt.replacements[i].class || false;
            const classString = classes && typeof classes === 'string' ? ` class="${classes}"` : ``;

            // option: cors
            const cors = opt.replacements[i].cors || false;
            const corsBool = typeof cors === 'boolean';
            const corsString =
                cors && corsBool
                    ? ` crossorigin`
                    : cors && !corsBool
                      ? ` crossorigin="${cors}"`
                      : ``;

            /*
                Assets

                assets allow for repeating link rel with various different attributes.
                requires assets: [] to be defined in Gruntfile.js.
                See example at top of file.
            */

            const assets = opt.replacements[i].assets || false;

            if (assets) {
                let assetsInclude = '';

                let a = 0;
                // loop assets
                while (a < assets.length) {
                    // option: rel
                    const relAsset = assets[a].rel || 'preload';
                    const relAssetString =
                        relAsset && typeof relAsset === 'string' ? ` rel="${relAsset}"` : ``;

                    // option: href
                    const hrefAssetPath = assets[a].hrefPath || false;
                    const hrefAssetString =
                        hrefAssetPath && typeof hrefAssetPath === 'string'
                            ? ` href="${hrefAssetPath}"`
                            : ``;

                    // option: as
                    const asAsset = assets[a].as || false;
                    const asAssetString =
                        asAsset && typeof asAsset === 'string' ? ` as="${asAsset}"` : ``;

                    // option: media
                    const mediaAsset = assets[a].media || false;
                    const mediaAssetString =
                        mediaAsset && typeof mediaAsset === 'string'
                            ? ` media="${mediaAsset}"`
                            : ``;

                    // option: type
                    const typeAsset = assets[a].type || false;
                    const typeAssetString =
                        typeAsset && typeof typeAsset === 'string' ? ` type="${typeAsset}"` : ``;

                    // option: sizes
                    const sizesAsset = assets[a].sizes || false;
                    const sizesAssetString =
                        sizesAsset && typeof sizesAsset === 'string'
                            ? ` sizes="${sizesAsset}"`
                            : ``;

                    // option: color
                    const colorAsset = assets[a].color || false;
                    const colorAssetString =
                        colorAsset && typeof colorAsset === 'string'
                            ? ` color="${colorAsset}"`
                            : ``;

                    // option: class
                    const classesAsset = assets[a].class || false;
                    const classAssetString =
                        classesAsset && typeof classesAsset === 'string'
                            ? ` class="${classesAsset}"`
                            : ``;

                    // option: cors
                    const corsAsset = assets[a].cors || false;
                    const corsAssetBool = typeof corsAsset === 'boolean';
                    const corsAssetString =
                        corsAsset && corsAssetBool
                            ? ` crossorigin`
                            : corsAsset && !corsAssetBool
                              ? ` crossorigin="${corsAsset}"`
                              : ``;

                    /*
                        Append link
                    */

                    assetsInclude += `<link${relAssetString}${hrefAssetString}${asAssetString}${mediaAssetString}${typeAssetString}${sizesAssetString}${corsAssetString}${colorAssetString}${classAssetString}>`;

                    // add spaces to beginning of each line just to keep formatting for non-minified html
                    if (a !== assets.length - 1) {
                        assetsInclude += `\n        `;
                    }

                    a++;
                }

                for (const file of opt.app) {
                    const html = grunt.file.read(file.src, { encoding: 'utf8' });
                    const regex = new RegExp(pattern, 'gim');
                    const htmlUpdated = html.replace(regex, assetsInclude);

                    chalk.then(async (c) =>
                        grunt.log.writeln(
                            c.green(`→ Htmlinkrel → Add Asset`),
                            c.gray(`→ ${name}`),
                            c.gray(`→ ${file.src}`)
                        )
                    );

                    grunt.file.write(file.src, htmlUpdated);

                    i++;
                }

                continue;
            }

            /*
                Missing required options
            */

            if (!pattern) {
                chalk.then(async (c) =>
                    grunt.log.writeln(
                        c.red(`Htmlinkrel → no regex pattern specified → `),
                        c.yellow(`Aborting`)
                    )
                );
                break;
            }

            if (!hrefPath) {
                chalk.then(async (c) =>
                    grunt.log.writeln(
                        c.red(`Htmlinkrel → no public path specified → `),
                        c.yellow(`Aborting`)
                    )
                );
                break;
            }

            /*
                Modified HTML output
            */

            let htmlInclude = '';

            if (!searchPath) {
                /*
                    Static Load

                    this route forces a specific static file to be preloaded.
                    Option 'searchPath' optional.
                */

                htmlInclude += `<link${relString}${hrefString}${asString}${mediaString}${typeString}${sizesString}${colorString}${classString}${corsString}>`;

                for (const file of opt.app) {
                    const html = grunt.file.read(file.src, { encoding: 'utf8' });
                    const regex = new RegExp(pattern, 'gim');
                    const htmlUpdated = html.replace(regex, htmlInclude);

                    const href = hrefString.match(/(?<=\")(.*?)(?=\")/gim) || hrefString;

                    chalk.then(async (c) =>
                        grunt.log.writeln(
                            c.green(`→ Htmlinkrel → Add Static`),
                            c.gray(`→ ${name}`),
                            c.gray(`→ ${href}`),
                            c.gray(`→ ${file.src}`)
                        )
                    );

                    grunt.file.write(file.src, htmlUpdated);
                }

                i++;
            } else {
                /*
                    Dynamic Load

                    this route forces a series of files to be preloaded.
                    Option 'searchPath' required.
                */

                const searchFolder = path.join(__dirname, '..', '..', searchPath);
                const files = fs.readdirSync(searchFolder);

                /*
                    loop all files, find path, concat new string for preload
                */

                let iCurrent = 1;
                files.forEach((file) => {
                    const bIsFile = fs.statSync(searchFolder + '/' + file).isDirectory();
                    if (!bIsFile) {
                        if (hrefString && typeof hrefString === 'string') {
                            // append file name before last quotation mark in href path
                            const n = hrefString.lastIndexOf('"');
                            if (n > 0) {
                                // append filename to end of hrefString for newly added file
                                // eslint-disable-next-line prettier/prettier
                                const hrefStringEach = hrefString.substring(0, n) + `/${file}` + hrefString.substring(n);
                                htmlInclude += `<link${relString}${hrefStringEach}${asString}${mediaString}${typeString}${sizesString}${colorString}${classString}${corsString}>`;

                                if (files.length !== iCurrent) {
                                    // add spaces to beginning of each line just to keep formatting for non-minified html
                                    htmlInclude += `\n        `;
                                }

                                iCurrent++;
                            }
                        }
                    }
                });

                for (const file of opt.app) {
                    const html = grunt.file.read(file.src, { encoding: 'utf8' });
                    const regex = new RegExp(pattern, 'gim');
                    const htmlUpdated = html.replace(regex, htmlInclude);

                    const folder = searchPath.match(/(?<=\")(.*?)(?=\")/gim) || searchPath;

                    chalk.then(async (c) =>
                        grunt.log.writeln(
                            c.green(`→ Htmlinkrel → Add Dynamic`),
                            c.gray(`→ ${name}`),
                            c.gray(`→ ${folder}`),
                            c.gray(`→ ${file.src}`)
                        )
                    );

                    grunt.file.write(file.src, htmlUpdated);
                }

                i++;
            }
        }
    });
};

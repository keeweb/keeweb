const fs = require('fs');
const path = require('path');

module.exports = function loadScss(scssSource) {
    const callback = this.async();
    const iconFontScssPath = path.resolve('app/styles/base/_icon-font.scss');

    this.addDependency(iconFontScssPath);

    fs.readFile(iconFontScssPath, 'utf-8', (err, iconFontScssSource) => {
        if (err) {
            return callback(err);
        }

        scssSource +=
            '\n' +
            [...iconFontScssSource.matchAll(/\n\$fa-var-([\w-]+):/g)]
                .map(([, name]) => {
                    // console.log(`name: ${name}`);
                    return name;
                })
                .map((icon) => {
                    // console.log(`$fa-var-${icon}`);
                    return `.fa-${icon}:before { content: $fa-var-${icon}; }`;
                })
                .join('\n');
        // console.log(scssSource);
        callback(null, scssSource);
    });
};

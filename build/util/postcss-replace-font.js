const fs = require('fs');

function replaceFont(css) {
    css.walkAtRules('font-face', rule => {
        const fontFamily = rule.nodes.filter(n => n.prop === 'font-family')[0];
        if (!fontFamily) {
            throw 'Bad font rule: ' + rule.toString();
        }
        const value = fontFamily.value.replace(/["']/g, '');
        const fontFiles = {
            FontAwesome: 'fontawesome-webfont.woff'
        };
        const fontFile = fontFiles[value];
        if (!fontFile) {
            throw 'Unsupported font ' + value + ': ' + rule.toString();
        }
        const data = fs.readFileSync('tmp/fonts/' + fontFile, 'base64');
        const src = 'url(data:application/font-woff;charset=utf-8;base64,{data}) format(\'woff\')'
            .replace('{data}', data);
        rule.nodes = rule.nodes.filter(n => n.prop !== 'src');
        rule.append({ prop: 'src', value: src });
    });
}

module.exports = replaceFont;

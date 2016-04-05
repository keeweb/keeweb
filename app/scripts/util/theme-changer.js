'use strict';

var ThemeChanger = {
    setTheme: function(theme) {
        _.forEach(document.body.classList, function(cls) {
            if (/^th\-/.test(cls)) {
                document.body.classList.remove(cls);
            }
        });
        document.body.classList.add('th-' + theme);
        var metaThemeColor = document.head.querySelector('meta[name=theme-color]');
        if (metaThemeColor) {
            metaThemeColor.content = window.getComputedStyle(document.body).backgroundColor;
        }
    }
};

module.exports = ThemeChanger;

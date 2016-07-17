'use strict';

var ThemeChanger = {
    setBySettings: function(settings) {
        if (settings.get('theme')) {
            this.setTheme(settings.get('theme'));
        }
        if (settings.get('fontSize')) {
            this.setFontSize(settings.get('fontSize'));
        }
    },

    setTheme: function(theme) {
        _.forEach(document.body.classList, cls => {
            if (/^th\-/.test(cls)) {
                document.body.classList.remove(cls);
            }
        });
        document.body.classList.add('th-' + theme);
        var metaThemeColor = document.head.querySelector('meta[name=theme-color]');
        if (metaThemeColor) {
            metaThemeColor.content = window.getComputedStyle(document.body).backgroundColor;
        }
    },

    setFontSize: function(fontSize) {
        document.documentElement.style.fontSize = fontSize ? (12 + fontSize * 2) + 'px' : '';
    }
};

module.exports = ThemeChanger;

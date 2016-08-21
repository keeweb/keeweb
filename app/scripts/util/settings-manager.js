'use strict';

const Locale = require('./locale');

const SettingsManager = {
    neutralLocale: null,

    setBySettings: function(settings) {
        if (settings.get('theme')) {
            this.setTheme(settings.get('theme'));
        }
        if (settings.get('fontSize')) {
            this.setFontSize(settings.get('fontSize'));
        }
        if (settings.get('locale') && settings.get('locale') !== 'en') {
            this.setLocale(settings.get('locale'));
        }
    },

    setTheme: function(theme) {
        _.forEach(document.body.classList, cls => {
            if (/^th\-/.test(cls)) {
                document.body.classList.remove(cls);
            }
        });
        document.body.classList.add(this.getThemeClass(theme));
        var metaThemeColor = document.head.querySelector('meta[name=theme-color]');
        if (metaThemeColor) {
            metaThemeColor.content = window.getComputedStyle(document.body).backgroundColor;
        }
    },

    getThemeClass: function(theme) {
        return 'th-' + theme;
    },

    setFontSize: function(fontSize) {
        document.documentElement.style.fontSize = fontSize ? (12 + fontSize * 2) + 'px' : '';
    },

    setLocale(locale) {
        if (!this.neutralLocale) {
            this.neutralLocale = _.clone(Locale);
        }
        _.extend(Locale, this.neutralLocale);
        if (locale && locale !== 'en') {
            let localeValues = require('../locales/' + locale + '.json');
            _.extend(Locale, localeValues);
        }
    }
};

module.exports = SettingsManager;

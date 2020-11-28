import { Events } from 'framework/events';
import { Features } from 'util/features';
import { Locale } from 'util/locale';

const SettingsManager = {
    neutralLocale: null,
    activeLocale: 'en-US',
    activeTheme: null,

    allLocales: {
        'en-US': 'English',
        'de-DE': 'Deutsch',
        'fr-FR': 'Français'
    },

    allThemes: {
        dark: 'setGenThemeDark',
        light: 'setGenThemeLight',
        fb: 'setGenThemeFb',
        db: 'setGenThemeDb',
        sd: 'setGenThemeSd',
        sl: 'setGenThemeSl',
        te: 'setGenThemeTe',
        hc: 'setGenThemeHc'
    },

    customLocales: {},

    setBySettings(settings) {
        this.setTheme(settings.theme);
        this.setFontSize(settings.fontSize);
        const locale = settings.locale;
        try {
            if (locale) {
                this.setLocale(settings.locale);
            } else {
                this.setLocale(this.getBrowserLocale());
            }
        } catch (ex) {}
    },

    getDefaultTheme() {
        return 'dark';
    },

    setTheme(theme) {
        if (!theme) {
            if (this.activeTheme) {
                return;
            }
            theme = this.getDefaultTheme();
        }
        for (const cls of document.body.classList) {
            if (/^th-/.test(cls)) {
                document.body.classList.remove(cls);
            }
        }
        document.body.classList.add(this.getThemeClass(theme));
        const metaThemeColor = document.head.querySelector('meta[name=theme-color]');
        if (metaThemeColor) {
            metaThemeColor.content = window.getComputedStyle(document.body).backgroundColor;
        }
        this.activeTheme = theme;
    },

    getThemeClass(theme) {
        return 'th-' + theme;
    },

    setFontSize(fontSize) {
        const defaultFontSize = Features.isMobile ? 14 : 12;
        document.documentElement.style.fontSize = defaultFontSize + (fontSize || 0) * 2 + 'px';
    },

    setLocale(loc) {
        if (!loc || loc === this.activeLocale) {
            return;
        }
        let localeValues;
        if (loc !== 'en-US') {
            if (this.customLocales[loc]) {
                localeValues = this.customLocales[loc];
            } else {
                localeValues = require('../../locales/' + loc + '.json');
            }
        }
        if (!this.neutralLocale) {
            this.neutralLocale = { ...Locale };
        }
        Object.assign(Locale, this.neutralLocale, localeValues);
        this.activeLocale = loc;
        Events.emit('set-locale', loc);
    },

    getBrowserLocale() {
        const language = (navigator.languages && navigator.languages[0]) || navigator.language;
        if (language && language.startsWith('en')) {
            return 'en-US';
        }
        return language;
    }
};

export { SettingsManager };

import { Events } from 'framework/events';

const ThemeWatcher = {
    dark: false,

    init() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery && mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', (e) => {
                const dark = e.matches;
                this.dark = dark;
                Events.emit('dark-mode-changed', { dark });
            });
        }
        this.dark = !!mediaQuery.matches;
    }
};

export { ThemeWatcher };

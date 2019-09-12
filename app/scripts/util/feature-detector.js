const MobileRegex = /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop|Windows Phone|webOS/i;
const MinDesktopScreenWidth = 800;

const isDesktop = !!(window.process && window.process.versions && window.process.versions.electron);

const FeatureDetector = {
    isDesktop,
    isMac: navigator.platform.indexOf('Mac') >= 0,
    isWindows: navigator.platform.indexOf('Win') >= 0,
    isiOS: /iPad|iPhone|iPod/i.test(navigator.userAgent),
    isMobile: MobileRegex.test(navigator.userAgent) || screen.width < MinDesktopScreenWidth,
    isPopup: !!(window.parent !== window.top || window.opener),
    isStandalone: !!navigator.standalone,
    isFrame: window.top !== window,
    isSelfHosted:
        !isDesktop &&
        !/^http(s?):\/\/((localhost:8085)|((app|beta)\.keeweb\.info))/.test(location.href),
    needFixClicks: /Edge\/14/.test(navigator.appVersion),

    actionShortcutSymbol(formatting) {
        return this.isMac ? '⌘' : formatting ? '<span class="thin">ctrl + </span>' : 'ctrl-';
    },
    altShortcutSymbol(formatting) {
        return this.isMac ? '⌥' : formatting ? '<span class="thin">alt + </span>' : 'alt-';
    },
    shiftShortcutSymbol(formatting) {
        return this.isMac ? '⇧' : formatting ? '<span class="thin">shift + </span>' : 'shift-';
    },
    globalShortcutSymbol(formatting) {
        return this.isMac
            ? '⌃⌥'
            : formatting
            ? '<span class="thin">shift+alt+</span>'
            : 'shift-alt-';
    },
    globalShortcutIsLarge() {
        return !this.isMac;
    },
    screenshotToClipboardShortcut() {
        if (this.isiOS) {
            return 'Sleep+Home';
        }
        if (this.isMobile) {
            return '';
        }
        if (this.isMac) {
            return 'Command-Shift-Control-4';
        }
        if (this.isWindows) {
            return 'Alt+PrintScreen';
        }
        return '';
    },
    supportsTitleBarStyles() {
        return this.isMac;
    },
    hasUnicodeFlags() {
        return this.isMac;
    },
    getBrowserCssClass() {
        if (window.chrome && window.navigator.userAgent.indexOf('Chrome/') > -1) {
            return 'chrome';
        }
        if (window.navigator.userAgent.indexOf('Edge/') > -1) {
            return 'edge';
        }
        if (navigator.standalone) {
            return 'standalone';
        }
        return '';
    }
};

module.exports = FeatureDetector;

const MobileRegex = /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop|Windows Phone|webOS/i;
const MinDesktopScreenWidth = 800;

const FeatureDetector = {
    isMac: navigator.platform.indexOf('Mac') >= 0,
    isWindows: navigator.platform.indexOf('Win') >= 0,
    isiOS: /iPad|iPhone|iPod/i.test(navigator.userAgent),
    isMobile: MobileRegex.test(navigator.userAgent) || screen.width < MinDesktopScreenWidth,
    isPopup: !!((window.parent !== window.top) || window.opener),
    isStandalone: !!navigator.standalone,
    isBeta: window.location.href.toLowerCase().indexOf('beta.') > 0,

    actionShortcutSymbol: function(formatting) {
        return this.isMac ? '⌘' : formatting ? '<span class="thin">ctrl + </span>' : 'ctrl-';
    },
    altShortcutSymbol: function(formatting) {
        return this.isMac ? '⌥' : formatting ? '<span class="thin">alt + </span>' : 'alt-';
    },
    globalShortcutSymbol: function(formatting) {
        return this.isMac ? '⌃⌥' : formatting ? '<span class="thin">shift+alt+</span>' : 'shift-alt-';
    },
    globalShortcutIsLarge: function() {
        return !this.isMac;
    },
    screenshotToClipboardShortcut: function() {
        if (this.isiOS) { return 'Sleep+Home'; }
        if (this.isMobile) { return ''; }
        if (this.isMac) { return 'Command-Shift-Control-4'; }
        if (this.isWindows) { return 'Alt+PrintScreen'; }
        return '';
    },
    supportsTitleBarStyles: function() {
        return this.isMac;
    },
    hasUnicodeFlags: function() {
        return this.isMac;
    },
    ensureCanRun: function() {
        if (/MSIE |Trident/.test(navigator.userAgent)) {
            throw 'IE detected';
        }
        if (!localStorage.length) {
            try {
                localStorage.appSettings = '';
            } catch (e) {
                throw 'localStorage not available';
            }
        }
    }
};

module.exports = FeatureDetector;

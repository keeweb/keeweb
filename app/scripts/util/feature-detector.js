const MobileRegex = /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop|Windows Phone|webOS/i;
const MinDesktopScreenWidth = 800;

const isDesktop = !!(window.process && window.process.versions && window.process.versions.electron);

const FeatureDetector = {
    isDesktop: isDesktop,
    isMac: navigator.platform.indexOf('Mac') >= 0,
    isWindows: navigator.platform.indexOf('Win') >= 0,
    isiOS: /iPad|iPhone|iPod/i.test(navigator.userAgent),
    isMobile: MobileRegex.test(navigator.userAgent) || screen.width < MinDesktopScreenWidth,
    isPopup: !!((window.parent !== window.top) || window.opener),
    isStandalone: !!navigator.standalone,
    isFrame: window.top !== window,
    isSelfHosted: !isDesktop && !/^http(s?):\/\/((localhost:8085)|((app|beta)\.keeweb\.info))/.test(location.href),
    needFixClicks: /Edge\/14/.test(navigator.appVersion),

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
    getBrowserCssClass: function() {
        if (window.chrome && window.chrome.webstore) {
            return 'chrome';
        }
        if (window.navigator.userAgent.indexOf('Edge/') > -1) {
            return 'edge';
        }
        return '';
    }
};

module.exports = FeatureDetector;

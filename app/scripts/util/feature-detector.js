'use strict';

const MobileRegex = /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop|Windows Phone|webOS/i;
const MinDesktopScreenWidth = 800;

const FeatureDetector = {
    isMac: navigator.platform.indexOf('Mac') >= 0,
    isWindows: navigator.platform.indexOf('Win') >= 0,
    isiOS: /iPad|iPhone|iPod/i.test(navigator.userAgent),
    isMobile: MobileRegex.test(navigator.userAgent) || screen.width < MinDesktopScreenWidth,

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
    shouldMoveHiddenInputToCopySource: function() {
        return this.isiOS && !/Version\/10/.test(navigator.userAgent);
    },
    canCopyReadonlyInput: function() {
        return !(/CriOS/i.test(navigator.userAgent));
    },
    supportsTitleBarStyles: function () {
        return this.isMac;
    }
};

module.exports = FeatureDetector;

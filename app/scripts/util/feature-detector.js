'use strict';

var FeatureDetector = {
    isMac: function() {
        return navigator.platform.indexOf('Mac') >= 0;
    },
    isWindows: function() {
        return navigator.platform.indexOf('Win') >= 0;
    },
    isiOS: function() {
        return /(iPad|iPhone)/i.test(navigator.userAgent);
    },
    isMobile: function() {
        return typeof window.orientation !== 'undefined';
    },
    isDesktop: function() {
        return !this.isMobile();
    },
    actionShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌘' : formatting ? '<span class="thin">ctrl + </span>' : 'ctrl-';
    },
    altShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌥' : formatting ? '<span class="thin">alt + </span>' : 'alt-';
    },
    globalShortcutSymbol: function(formatting) {
        return this.isMac() ? '⌃⌥' : formatting ? '<span class="thin">shift+alt+</span>' : 'shift-alt-';
    },
    globalShortcutIsLarge: function() {
        return !this.isMac();
    },
    screenshotToClipboardShortcut: function() {
        if (this.isiOS()) { return 'Sleep+Home'; }
        if (this.isMobile()) { return ''; }
        if (this.isMac()) { return 'Command-Shift-Control-4'; }
        if (this.isWindows()) { return 'Alt+PrintScreen'; }
        return '';
    },
    shouldMoveHiddenInputToCopySource: function() {
        return this.isiOS();
    },
    canCopyReadonlyInput: function() {
        return !(/CriOS/i.test(navigator.userAgent));
    },
    isBeta: function() {
        return window.location.href.toLowerCase().indexOf('beta.') > 0;
    }
};

module.exports = FeatureDetector;

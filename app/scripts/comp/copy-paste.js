'use strict';

var FeatureDetector = require('../util/feature-detector'),
    Launcher = require('./launcher'),
    AppSettingsModel = require('../models/app-settings-model');

var CopyPaste = {
    tryCopy: function() {
        try {
            var success = document.execCommand('copy');
            if (success) {
                this.copied();
            }
            return success;
        } catch (e) {
            return false;
        }
    },

    createHiddenInput: function(text, pos) {
        var hiddenInput = $('<input/>')
            .val(text)
            .attr({ type: 'text', 'class': pos ? '' : 'hide-by-pos' })
            .appendTo(document.body);
        if (FeatureDetector.canCopyReadonlyInput()) {
            hiddenInput.attr('readonly', true);
        }
        if (pos) {
            hiddenInput.css({ position: 'absolute', zIndex: 100, padding: '0 .6em',
                border: 'none', background: 'transparent', color: 'transparent',
                left: pos.left, top: pos.top, width: pos.width, height: pos.height });
        }
        hiddenInput[0].selectionStart = 0;
        hiddenInput[0].selectionEnd = text.length;
        hiddenInput.focus();
        hiddenInput.on({
            'copy cut paste': function() { setTimeout(function() { hiddenInput.blur(); }, 0); },
            blur: function() { hiddenInput.remove(); }
        });
    },

    copied: function() {
        if (Launcher) {
            var clipboardSeconds = AppSettingsModel.instance.get('clipboardSeconds');
            if (clipboardSeconds > 0) {
                setTimeout(function() {
                    setTimeout((function (prevText) {
                        if (Launcher.getClipboardText() === prevText) {
                            Launcher.clearClipboardText();
                        }
                    }).bind(null, Launcher.getClipboardText()), clipboardSeconds * 1000);
                }, 0);
            }
            return clipboardSeconds;
        }
    }
};

module.exports = CopyPaste;

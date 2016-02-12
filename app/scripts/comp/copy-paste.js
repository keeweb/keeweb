'use strict';

var FeatureDetector = require('../util/feature-detector'),
    Launcher = require('./launcher'),
    AppSettingsModel = require('../models/app-settings-model');

var CopyPaste = {
    simpleCopy: !!Launcher,

    copy: function(text) {
        if (Launcher) {
            Launcher.setClipboardText(text);
            var clipboardSeconds = AppSettingsModel.instance.get('clipboardSeconds');
            if (clipboardSeconds > 0) {
                setTimeout(function () {
                    if (Launcher.getClipboardText() === text) {
                        Launcher.clearClipboardText();
                    }
                }, clipboardSeconds * 1000);
            }
            return {success: true, seconds: clipboardSeconds};
        } else {
            try {
                if (document.execCommand('copy')) {
                    return {success: true};
                }
            } catch (e) { }
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
    }
};

module.exports = CopyPaste;

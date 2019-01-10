const Backbone = require('backbone');
const Launcher = require('./launcher');
const AppSettingsModel = require('../models/app-settings-model');

const CopyPaste = {
    simpleCopy: !!(Launcher && Launcher.clipboardSupported),

    copy: function(text) {
        if (this.simpleCopy) {
            Launcher.setClipboardText(text);
            const clipboardSeconds = AppSettingsModel.instance.get('clipboardSeconds');
            if (clipboardSeconds > 0) {
                const clearClipboard = () => {
                    if (Launcher.getClipboardText() === text) {
                        Launcher.clearClipboardText();
                    }
                };
                Backbone.on('main-window-will-close', clearClipboard);
                setTimeout(() => {
                    clearClipboard();
                    Backbone.off('main-window-will-close', clearClipboard);
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

    createHiddenInput: function(text) {
        const hiddenInput = $('<input/>')
            .val(text)
            .attr({ type: 'text', 'class': 'hide-by-pos' })
            .appendTo(document.body);
        hiddenInput[0].selectionStart = 0;
        hiddenInput[0].selectionEnd = text.length;
        hiddenInput.focus();
        hiddenInput.on({
            'copy cut paste': function() { setTimeout(() => hiddenInput.blur(), 0); },
            blur: function() { hiddenInput.remove(); }
        });
    }
};

module.exports = CopyPaste;

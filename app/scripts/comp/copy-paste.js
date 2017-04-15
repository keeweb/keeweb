const Launcher = require('./launcher');
const AppSettingsModel = require('../models/app-settings-model');

const CopyPaste = {
    simpleCopy: !!Launcher,

    copy: function(text) {
        if (Launcher) {
            Launcher.setClipboardText(text);
            const clipboardSeconds = AppSettingsModel.instance.get('clipboardSeconds');
            if (clipboardSeconds > 0) {
                setTimeout(() => {
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

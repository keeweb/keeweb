'use strict';

var CopyPaste = {
    tryCopy: function() {
        try {
            return document.execCommand('copy');
        } catch (e) {
            return false;
        }
    },

    createHiddenInput: function(text) {
        var hiddenInput = $('<input/>')
            .attr({ type: 'text', readonly: true, 'class': 'hide-by-pos' })
            .val(text)
            .appendTo(document.body)
            .focus();
        hiddenInput[0].select();
        hiddenInput.on({
            'copy': function() { setTimeout(function() { hiddenInput.blur(); }, 0); },
            blur: function() { hiddenInput.remove(); }
        });
    }
};

module.exports = CopyPaste;

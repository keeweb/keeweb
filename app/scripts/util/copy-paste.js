'use strict';

var FeatureDetector = require('./feature-detector');

var CopyPaste = {
    tryCopy: function() {
        try {
            return document.execCommand('copy');
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
    }
};

module.exports = CopyPaste;

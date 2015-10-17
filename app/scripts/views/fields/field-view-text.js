'use strict';

var FieldView = require('./field-view'),
    Keys = require('../../const/keys'),
    kdbxweb = require('kdbxweb');

var FieldViewText = FieldView.extend({
    renderValue: function(value) {
        return typeof value.byteLength === 'number' ? new Array(value.byteLength + 1).join('•') :
            _.escape(value).replace(/\n/g, '<br/>');
    },

    getEditValue: function(value) {
        return value && value.getText ? value.getText() : value || '';
    },

    startEdit: function() {
        var text = this.getEditValue(this.value);
        this.input = $(document.createElement(this.model.multiline ? 'textarea' : 'input'));
        this.valueEl.html('').append(this.input);
        this.input.attr({ autocomplete: 'off', spellcheck: 'false' })
            .val(text).focus()[0].setSelectionRange(text.length, text.length);
        this.input.bind({
            blur: this.fieldValueBlur.bind(this),
            input: this.fieldValueInput.bind(this),
            keydown: this.fieldValueKeydown.bind(this),
            keypress: this.fieldValueInput.bind(this)
        });
        if (this.model.multiline) {
            this.setInputHeight();
        }
    },

    setInputHeight: function() {
        var MinHeight = 20;
        this.input.height(MinHeight);
        var newHeight = this.input[0].scrollHeight;
        if (newHeight <= MinHeight) {
            newHeight = MinHeight;
        } else {
            newHeight += 2;
        }
        this.input.height(newHeight);
    },

    fieldValueBlur: function(e) {
        this.endEdit(e.target.value);
    },

    fieldValueInput: function(e) {
        e.stopPropagation();
        if (this.model.multiline) {
            this.setInputHeight();
        }
    },

    fieldValueKeydown: function(e) {
        e.stopPropagation();
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            if (!this.model.multiline || (!e.altKey && !e.shiftKey)) {
                $(e.target).unbind('blur');
                this.endEdit(e.target.value);
            }
        } else if (code === Keys.DOM_VK_ESCAPE) {
            $(e.target).unbind('blur');
            this.endEdit();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            $(e.target).unbind('blur');
            this.endEdit(e.target.value, { tab: { field: this.model.name, prev: e.shiftKey } });
        }
    },

    endEdit: function(newVal, extra) {
        if (!this.editing) {
            return;
        }
        delete this.input;
        if (typeof newVal === 'string' && this.value instanceof kdbxweb.ProtectedValue) {
            newVal = kdbxweb.ProtectedValue.fromString(newVal);
        }
        if (typeof newVal === 'string') {
            newVal = $.trim(newVal);
        }
        FieldView.prototype.endEdit.call(this, newVal, extra);
    }
});

module.exports = FieldViewText;

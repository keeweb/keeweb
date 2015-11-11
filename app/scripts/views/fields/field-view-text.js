'use strict';

var FieldView = require('./field-view'),
    GeneratorView = require('../generator-view'),
    Keys = require('../../const/keys'),
    PasswordGenerator = require('../../util/password-generator'),
    kdbxweb = require('kdbxweb');

var FieldViewText = FieldView.extend({
    renderValue: function(value) {
        return value && typeof value.byteLength === 'number' ? PasswordGenerator.present(value.byteLength) :
            _.escape(value || '').replace(/\n/g, '<br/>');
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
            keypress: this.fieldValueInput.bind(this),
            click: this.fieldValueInputClick.bind(this)
        });
        if (this.model.multiline) {
            this.setInputHeight();
        }
        if (this.model.canGen) {
            $('<div/>').addClass('details__field-value-btn details__field-value-btn-gen').appendTo(this.valueEl)
                .click(this.showGeneratorClick.bind(this))
                .mousedown(this.showGenerator.bind(this));
        }
    },

    showGeneratorClick: function(e) {
        e.stopPropagation();
        if (!this.gen) {
            this.input.focus();
        }
    },

    showGenerator: function() {
        if (this.gen) {
            this.hideGenerator();
        } else {
            var fieldRect = this.input[0].getBoundingClientRect();
            this.gen = new GeneratorView({model: {pos: {left: fieldRect.left, top: fieldRect.bottom}}}).render();
            this.gen.once('remove', this.generatorClosed.bind(this));
            this.gen.once('result', this.generatorResult.bind(this));
        }
    },

    hideGenerator: function() {
        if (this.gen) {
            var gen = this.gen;
            delete this.gen;
            gen.remove();
        }
    },

    generatorClosed: function() {
        if (this.gen) {
            delete this.gen;
            this.endEdit();
        }
    },

    generatorResult: function(password) {
        if (this.gen) {
            delete this.gen;
            this.endEdit(password);
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
        if (!this.gen) {
            this.endEdit(e.target.value);
        }
    },

    fieldValueInput: function(e) {
        e.stopPropagation();
        if (this.model.multiline) {
            this.setInputHeight();
        }
    },

    fieldValueInputClick: function() {
        if (this.gen) {
            this.hideGenerator();
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
        if (this.gen) {
            this.hideGenerator();
        }
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
    },

    render: function() {
        FieldView.prototype.render.call(this);
    }
});

module.exports = FieldViewText;

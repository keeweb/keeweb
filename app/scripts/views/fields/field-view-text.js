'use strict';

var Backbone = require('backbone'),
    FieldView = require('./field-view'),
    GeneratorView = require('../generator-view'),
    KeyHandler = require('../../comp/key-handler'),
    Keys = require('../../const/keys'),
    PasswordGenerator = require('../../util/password-generator'),
    kdbxweb = require('kdbxweb');

var FieldViewText = FieldView.extend({
    renderValue: function(value) {
        return value && value.isProtected ? PasswordGenerator.present(value.textLength) :
            _.escape(value || '').replace(/\n/g, '<br/>');
    },

    getEditValue: function(value) {
        return value && value.isProtected ? value.getText() : value || '';
    },

    startEdit: function() {
        var text = this.getEditValue(this.value);
        var isProtected = !!(this.value && this.value.isProtected);
        this.$el.toggleClass('details__field--protected', isProtected);
        this.input = $(document.createElement(this.model.multiline ? 'textarea' : 'input'));
        this.valueEl.html('').append(this.input);
        this.input.attr({ autocomplete: 'off', spellcheck: 'false' })
            .val(text).focus()[0].setSelectionRange(text.length, text.length);
        this.input.bind({
            input: this.fieldValueInput.bind(this),
            keydown: this.fieldValueKeydown.bind(this),
            keypress: this.fieldValueInput.bind(this),
            click: this.fieldValueInputClick.bind(this),
            mousedown: this.fieldValueInputMouseDown.bind(this)
        });
        this.listenTo(Backbone, 'click', this.fieldValueBlur);
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
        var MinHeight = 18;
        this.input.height(MinHeight);
        var newHeight = this.input[0].scrollHeight;
        if (newHeight <= MinHeight) {
            newHeight = MinHeight;
        } else {
            newHeight += 2;
        }
        this.input.height(newHeight);
    },

    fieldValueBlur: function() {
        if (!this.gen && this.input) {
            this.endEdit(this.input.val());
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

    fieldValueInputMouseDown: function(e) {
        e.stopPropagation();
    },

    fieldValueKeydown: function(e) {
        KeyHandler.reg();
        e.stopPropagation();
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            if (!this.model.multiline || (!e.altKey && !e.shiftKey)) {
                this.stopListening(Backbone, 'click', this.fieldValueBlur);
                this.endEdit(e.target.value);
            }
        } else if (code === Keys.DOM_VK_ESCAPE) {
            this.stopListening(Backbone, 'click', this.fieldValueBlur);
            this.endEdit();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            this.stopListening(Backbone, 'click', this.fieldValueBlur);
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
        this.stopListening(Backbone, 'click', this.fieldValueBlur);
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

'use strict';

var FieldViewText = require('./field-view-text'),
    FieldView = require('./field-view'),
    Keys = require('../../const/keys'),
    kdbxweb = require('kdbxweb');

var FieldViewCustom = FieldViewText.extend({
    events: {
        'mousedown .details__field-label': 'fieldLabelMousedown'
    },

    initialize: function() {
        _.extend(this.events, FieldViewText.prototype.events);
        this.model.newFieldInitial = this.model.newField;
    },

    startEdit: function() {
        FieldViewText.prototype.startEdit.call(this);
        if (this.model.newField) {
            this.$el.find('.details__field-label').text(this.model.newField);
        }
        this.$el.addClass('details__field--can-edit-title');
        if (this.isProtected === undefined) {
            this.isProtected = this.value instanceof kdbxweb.ProtectedValue;
        }
        this.protectBtn = $('<div/>').addClass('details__field-value-btn details__field-value-btn-protect')
            .toggleClass('details__field-value-btn-protect--protected', this.isProtected)
            .appendTo(this.valueEl)
            .mousedown(this.protectBtnClick.bind(this));
    },

    endEdit: function(newVal, extra) {
        if (this.model.newField && !newVal) {
            this.model.newField = this.model.newFieldInitial;
            this.$el.find('.details__field-label').text(this.model.title);
            this.$el.find('.details__field-value').text('');
            this.value = '';
        }
        if (!this.model.newField) {
            this.$el.removeClass('details__field--can-edit-title');
        }
        extra = _.extend({}, extra, { newField: this.model.newField });
        if (!this.editing) {
            return;
        }
        delete this.input;
        if (typeof newVal === 'string') {
            newVal = $.trim(newVal);
            if (this.isProtected) {
                newVal = kdbxweb.ProtectedValue.fromString(newVal);
            }
        }
        FieldView.prototype.endEdit.call(this, newVal, extra);
    },

    startEditTitle: function() {
        var text = this.model.newField ? this.model.newField !== this.model.newFieldInitial ? this.model.newField : '' : this.model.title;
        this.labelInput = $('<input/>');
        this.labelEl.html('').append(this.labelInput);
        this.labelInput.attr({ autocomplete: 'off', spellcheck: 'false' })
            .val(text).focus()[0].setSelectionRange(text.length, text.length);
        this.labelInput.bind({
            blur: this.fieldLabelBlur.bind(this),
            input: this.fieldLabelInput.bind(this),
            keydown: this.fieldLabelKeydown.bind(this),
            keypress: this.fieldLabelInput.bind(this),
            mousedown: this.fieldLabelInputClick.bind(this),
            click: this.fieldLabelInputClick.bind(this)
        });
    },

    endEditTitle: function(newTitle) {
        if (this.model.newField) {
            if (newTitle) {
                this.model.newField = newTitle;
                this.edit();
            } else {
                this.endEdit();
            }
        } else {
            this.$el.find('.details__field-label').text(this.model.title);
            this.endEdit();
            if (newTitle && newTitle !== this.model.title) {
                this.trigger('change', { field: this.model.name, title: newTitle, val: this.model.value() });
            }
        }
    },

    fieldLabelClick: function(e) {
        e.stopImmediatePropagation();
        if (this.model.newField || this.editing) {
            this.startEditTitle();
        } else {
            FieldViewText.prototype.fieldLabelClick.call(this, e);
        }
    },

    fieldLabelMousedown: function() {
        if (this.editing || this.model.newField) {
            if (this.editing) {
                this.editing = false;
                this.value = this.input.val();
                this.input.unbind('blur');
                delete this.input;
                this.valueEl.html(this.renderValue(this.value));
                this.$el.removeClass('details__field--edit');
            }
            _.delay(this.startEditTitle.bind(this));
        }
    },

    fieldValueBlur: function(e) {
        if (this.protectJustChanged) {
            this.protectJustChanged = false;
            e.target.focus();
            return;
        }
        this.endEdit(e.target.value);
    },

    fieldLabelBlur: function(e) {
        this.endEditTitle(e.target.value);
    },

    fieldLabelInput: function(e) {
        e.stopPropagation();
    },

    fieldLabelInputClick: function(e) {
        e.stopPropagation();
    },

    fieldLabelKeydown: function(e) {
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            $(e.target).unbind('blur');
            this.endEditTitle(e.target.value);
        } else if (code === Keys.DOM_VK_ESCAPE) {
            $(e.target).unbind('blur');
            this.endEditTitle();
        } else if (code === Keys.DOM_VK_TAB) {
            e.preventDefault();
            $(e.target).unbind('blur');
            this.endEditTitle(e.target.value);
        }
    },

    protectBtnClick: function(e) {
        e.stopPropagation();
        this.isProtected = !this.isProtected;
        this.protectBtn.toggleClass('details__field-value-btn-protect--protected', this.isProtected);
        this.protectJustChanged = true;
    }
});

module.exports = FieldViewCustom;

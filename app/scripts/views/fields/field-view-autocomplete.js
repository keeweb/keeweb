'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewAutocomplete = FieldViewText.extend({
    endEdit: function(newVal, extra) {
        if (this.autocomplete) {
            this.autocomplete.remove();
            this.autocomplete = null;
        }
        FieldViewText.prototype.endEdit.call(this, newVal, extra);
    },

    startEdit: function() {
        FieldViewText.prototype.startEdit.call(this);
        var fieldRect = this.input[0].getBoundingClientRect();
        this.autocomplete = $('<div class="details__field-autocomplete"></div>').appendTo('body');
        this.autocomplete.css({
            top: fieldRect.bottom,
            left: fieldRect.left,
            width: fieldRect.width - 2
        });
        this.autocomplete.mousedown(this.autocompleteClick.bind(this));
        if (this.input.val()) {
            this.autocomplete.hide();
        } else {
            this.updateAutocomplete();
        }
    },

    fieldValueInput: function(e) {
        e.stopPropagation();
        this.updateAutocomplete();
        FieldViewText.prototype.fieldValueInput.call(this, e);
    },

    updateAutocomplete: function() {
        var completions = this.model.getCompletions(this.input.val());
        var completionsHtml = completions.map(item => {
            return '<div class="details__field-autocomplete-item">' + _.escape(item) + '</div>';
        }).join('');
        this.autocomplete.html(completionsHtml);
        this.autocomplete.toggle(!!completionsHtml);
    },

    autocompleteClick: function(e) {
        e.stopPropagation();
        if (e.target.classList.contains('details__field-autocomplete-item')) {
            var selectedItem = $(e.target).text();
            this.input.val(selectedItem);
            this.endEdit(selectedItem);
        } else {
            this.afterPaint(function () { this.input.focus(); });
        }
    }
});

module.exports = FieldViewAutocomplete;

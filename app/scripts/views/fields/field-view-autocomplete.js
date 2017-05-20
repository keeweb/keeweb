const FieldViewText = require('./field-view-text');
const Keys = require('../../const/keys');

const FieldViewAutocomplete = FieldViewText.extend({
    endEdit: function(newVal, extra) {
        if (this.autocomplete) {
            this.autocomplete.remove();
            this.autocomplete = null;
        }
        delete this.selectedCopmletionIx;
        FieldViewText.prototype.endEdit.call(this, newVal, extra);
    },

    startEdit: function() {
        FieldViewText.prototype.startEdit.call(this);
        const fieldRect = this.input[0].getBoundingClientRect();
        this.autocomplete = $('<div class="details__field-autocomplete"></div>').appendTo('body');
        this.autocomplete.css({
            top: fieldRect.bottom,
            left: fieldRect.left,
            width: fieldRect.width - 2
        });
        delete this.selectedCopmletionIx;
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

    fieldValueKeydown: function(e) {
        switch (e.which) {
            case Keys.DOM_VK_UP:
                this.moveAutocomplete(false);
                e.preventDefault();
                break;
            case Keys.DOM_VK_DOWN:
                this.moveAutocomplete(true);
                e.preventDefault();
                break;
            case Keys.DOM_VK_RETURN:
                const selectedItem = this.autocomplete.find('.details__field-autocomplete-item--selected').text();
                if (selectedItem) {
                    this.input.val(selectedItem);
                    this.endEdit(selectedItem);
                }
                break;
            default:
                delete this.selectedCopmletionIx;
        }
        FieldViewText.prototype.fieldValueKeydown.call(this, e);
    },

    moveAutocomplete: function(next) {
        const completions = this.model.getCompletions(this.input.val());
        if (typeof this.selectedCopmletionIx === 'number') {
            this.selectedCopmletionIx = (completions.length + this.selectedCopmletionIx + (next ? 1 : -1)) % completions.length;
        } else {
            this.selectedCopmletionIx = next ? 0 : completions.length - 1;
        }
        this.updateAutocomplete();
    },

    updateAutocomplete: function() {
        const completions = this.model.getCompletions(this.input.val());
        const completionsHtml = completions.map((item, ix) => {
            const sel = ix === this.selectedCopmletionIx ? 'details__field-autocomplete-item--selected' : '';
            return '<div class="details__field-autocomplete-item ' + sel + '">' + _.escape(item) + '</div>';
        }).join('');
        this.autocomplete.html(completionsHtml);
        this.autocomplete.toggle(!!completionsHtml);
    },

    autocompleteClick: function(e) {
        e.stopPropagation();
        if (e.target.classList.contains('details__field-autocomplete-item')) {
            const selectedItem = $(e.target).text();
            this.input.val(selectedItem);
            this.endEdit(selectedItem);
        } else {
            this.afterPaint(function () { this.input.focus(); });
        }
    }
});

module.exports = FieldViewAutocomplete;

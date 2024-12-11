import { Keys } from 'const/keys';
import { FieldViewText } from 'views/fields/field-view-text';
import completionsTemplate from 'templates/details/fields/completions.hbs';

class FieldViewAutocomplete extends FieldViewText {
    hasOptions = true;

    endEdit(newVal, extra) {
        if (this.autocomplete) {
            this.autocomplete.remove();
            this.autocomplete = null;
        }
        delete this.selectedCompletionIx;
        super.endEdit(newVal, extra);
    }

    startEdit() {
        super.startEdit();
        const fieldRect = this.input[0].getBoundingClientRect();
        const shadowSpread = parseInt(this.input.css('--focus-shadow-spread')) || 0;
        this.autocomplete = $('<div class="details__field-autocomplete"></div>').appendTo('body');
        this.autocomplete.css({
            top: fieldRect.bottom + shadowSpread,
            left: fieldRect.left,
            width: fieldRect.width - 2
        });
        delete this.selectedCompletionIx;
        this.autocomplete.mousedown(this.autocompleteClick.bind(this));
        if (this.input.val()) {
            this.autocomplete.hide();
        } else {
            this.updateAutocomplete();
        }
    }

    fieldValueInput(e) {
        e.stopPropagation();
        this.updateAutocomplete();
        super.fieldValueInput.call(this, e);
    }

    fieldValueKeydown(e) {
        switch (e.which) {
            case Keys.DOM_VK_UP:
                this.moveAutocomplete(false);
                e.preventDefault();
                break;
            case Keys.DOM_VK_DOWN:
                this.moveAutocomplete(true);
                e.preventDefault();
                break;
            case Keys.DOM_VK_RETURN: {
                const selectedItem = this.autocomplete
                    .find('.details__field-autocomplete-item--selected')
                    .text();
                if (selectedItem) {
                    this.input.val(selectedItem);
                    this.endEdit(selectedItem);
                }
                break;
            }
            default:
                delete this.selectedCompletionIx;
        }
        super.fieldValueKeydown(e);
    }

    moveAutocomplete(next) {
        const completions = this.model.getCompletions(this.input.val());
        if (typeof this.selectedCompletionIx === 'number') {
            this.selectedCompletionIx =
                (completions.length + this.selectedCompletionIx + (next ? 1 : -1)) %
                completions.length;
        } else {
            this.selectedCompletionIx = next ? 0 : completions.length - 1;
        }
        this.updateAutocomplete();
    }

    updateAutocomplete() {
        const completions = this.model.getCompletions(this.input.val());
        const completionsHtml = completionsTemplate({
            completions,
            selectedIx: this.selectedCompletionIx
        });
        this.autocomplete.html(completionsHtml);
        this.autocomplete.toggle(!!completionsHtml);
    }

    autocompleteClick(e) {
        e.stopPropagation();
        if (e.target.classList.contains('details__field-autocomplete-item')) {
            const selectedItem = $(e.target).text();
            this.input.val(selectedItem);
            this.endEdit(selectedItem);
        } else {
            this.afterPaint(() => {
                this.input.trigger('focus');
            });
        }
    }
}

export { FieldViewAutocomplete };

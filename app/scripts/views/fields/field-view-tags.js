import { FieldViewText } from 'views/fields/field-view-text';
import { escape } from 'util/fn';
import tagsTemplate from 'templates/details/fields/tags.hbs';

class FieldViewTags extends FieldViewText {
    hasOptions = false;

    renderValue(value) {
        return value ? escape(value.join(', ')) : '';
    }

    getEditValue(value) {
        return value ? value.join(', ') : '';
    }

    getTextValue() {
        return this.value ? this.value.join(', ') : '';
    }

    valueToTags(val) {
        const allTags = {};
        this.model.tags.forEach((tag) => {
            allTags[tag.toLowerCase()] = tag;
        });
        const valueTags = {};
        val.split(/\s*[;,:]\s*/)
            .filter((tag) => tag)
            .map((tag) => allTags[tag.toLowerCase()] || tag)
            .forEach((tag) => {
                valueTags[tag] = tag;
            });
        return Object.keys(valueTags);
    }

    endEdit(newVal, extra) {
        if (newVal !== undefined) {
            newVal = this.valueToTags(newVal);
        }
        if (this.tagsAutocomplete) {
            this.tagsAutocomplete.remove();
            this.tagsAutocomplete = null;
        }
        super.endEdit(newVal, extra);
    }

    startEdit() {
        super.startEdit();
        const fieldRect = this.input[0].getBoundingClientRect();
        const shadowSpread = parseInt(this.input.css('--focus-shadow-spread')) || 0;
        this.tagsAutocomplete = $('<div class="details__field-autocomplete"></div>').appendTo(
            'body'
        );
        this.tagsAutocomplete.css({
            top: fieldRect.bottom + shadowSpread,
            left: fieldRect.left,
            width: fieldRect.width - 2
        });
        this.tagsAutocomplete.mousedown(this.tagsAutocompleteClick.bind(this));
        this.setTags();
    }

    fieldValueInput(e) {
        e.stopPropagation();
        this.setTags();
        super.fieldValueInput(e);
    }

    getAvailableTags() {
        const tags = this.valueToTags(this.input.val());
        const last = tags[tags.length - 1];
        const isLastPart = last && this.model.tags.indexOf(last) < 0;
        return this.model.tags.filter((tag) => {
            return (
                tags.indexOf(tag) < 0 &&
                (!isLastPart || tag.toLowerCase().indexOf(last.toLowerCase()) >= 0)
            );
        });
    }

    setTags() {
        const availableTags = this.getAvailableTags();
        const tagsHtml = tagsTemplate({ tags: availableTags });
        this.tagsAutocomplete.html(tagsHtml);
        this.tagsAutocomplete.toggle(!!tagsHtml);
    }

    tagsAutocompleteClick(e) {
        e.stopPropagation();
        if (e.target.classList.contains('details__field-autocomplete-item')) {
            const selectedTag = $(e.target).text();
            let newVal = this.input.val();
            if (newVal) {
                const tags = this.valueToTags(newVal);
                const last = tags[tags.length - 1];
                const isLastPart = last && this.model.tags.indexOf(last) < 0;
                if (isLastPart) {
                    newVal = newVal.substr(0, newVal.lastIndexOf(last)) + selectedTag;
                } else {
                    newVal += ', ' + selectedTag;
                }
            } else {
                newVal = selectedTag;
            }
            this.input.val(newVal);
            this.input.focus();
            this.setTags();
        }
        this.afterPaint(() => {
            this.input.focus();
        });
    }
}

export { FieldViewTags };

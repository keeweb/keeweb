const FieldViewText = require('./field-view-text');

const FieldViewTags = FieldViewText.extend({
    renderValue(value) {
        return value ? _.escape(value.join(', ')) : '';
    },

    getEditValue(value) {
        return value ? value.join(', ') : '';
    },

    valueToTags(val) {
        const allTags = {};
        this.model.tags.forEach(tag => {
            allTags[tag.toLowerCase()] = tag;
        });
        return _.unique(
            val
                .split(/\s*[;,:]\s*/)
                .filter(_.identity)
                .map(tag => {
                    return allTags[tag.toLowerCase()] || tag;
                })
        );
    },

    endEdit(newVal, extra) {
        if (newVal !== undefined) {
            newVal = this.valueToTags(newVal);
        }
        if (this.tagsAutocomplete) {
            this.tagsAutocomplete.remove();
            this.tagsAutocomplete = null;
        }
        FieldViewText.prototype.endEdit.call(this, newVal, extra);
    },

    startEdit() {
        FieldViewText.prototype.startEdit.call(this);
        const fieldRect = this.input[0].getBoundingClientRect();
        this.tagsAutocomplete = $('<div class="details__field-autocomplete"></div>').appendTo(
            'body'
        );
        this.tagsAutocomplete.css({
            top: fieldRect.bottom,
            left: fieldRect.left,
            width: fieldRect.width - 2
        });
        this.tagsAutocomplete.mousedown(this.tagsAutocompleteClick.bind(this));
        this.setTags();
    },

    fieldValueInput(e) {
        e.stopPropagation();
        this.setTags();
        FieldViewText.prototype.fieldValueInput.call(this, e);
    },

    getAvailableTags() {
        const tags = this.valueToTags(this.input.val());
        const last = tags[tags.length - 1];
        const isLastPart = last && this.model.tags.indexOf(last) < 0;
        return this.model.tags.filter(tag => {
            return (
                tags.indexOf(tag) < 0 &&
                (!isLastPart || tag.toLowerCase().indexOf(last.toLowerCase()) >= 0)
            );
        });
    },

    setTags() {
        const availableTags = this.getAvailableTags();
        const tagsHtml = availableTags
            .map(tag => {
                return '<div class="details__field-autocomplete-item">' + _.escape(tag) + '</div>';
            })
            .join('');
        this.tagsAutocomplete.html(tagsHtml);
        this.tagsAutocomplete.toggle(!!tagsHtml);
    },

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
        this.afterPaint(function() {
            this.input.focus();
        });
    }
});

module.exports = FieldViewTags;

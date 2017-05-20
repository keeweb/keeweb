const FieldViewText = require('./field-view-text');

const FieldViewTags = FieldViewText.extend({
    renderValue: function(value) {
        return value ? _.escape(value.join(', ')) : '';
    },

    getEditValue: function(value) {
        return value ? value.join(', ') : '';
    },

    valueToTags: function(val) {
        const allTags = {};
        this.model.tags.forEach(tag => {
            allTags[tag.toLowerCase()] = tag;
        });
        return _.unique(val.split(/\s*[;,:]\s*/).filter(_.identity).map(tag => {
            return allTags[tag.toLowerCase()] || tag;
        }));
    },

    endEdit: function(newVal, extra) {
        if (newVal !== undefined) {
            newVal = this.valueToTags(newVal);
        }
        if (this.tagsAutocomplete) {
            this.tagsAutocomplete.remove();
            this.tagsAutocomplete = null;
        }
        FieldViewText.prototype.endEdit.call(this, newVal, extra);
    },

    startEdit: function() {
        FieldViewText.prototype.startEdit.call(this);
        const fieldRect = this.input[0].getBoundingClientRect();
        this.tagsAutocomplete = $('<div class="details__field-autocomplete"></div>').appendTo('body');
        this.tagsAutocomplete.css({
            top: fieldRect.bottom,
            left: fieldRect.left,
            width: fieldRect.width - 2
        });
        this.tagsAutocomplete.mousedown(this.tagsAutocompleteClick.bind(this));
        this.setTags();
    },

    fieldValueInput: function(e) {
        e.stopPropagation();
        this.setTags();
        FieldViewText.prototype.fieldValueInput.call(this, e);
    },

    getAvailableTags: function() {
        const tags = this.valueToTags(this.input.val());
        const last = tags[tags.length - 1];
        const isLastPart = last && this.model.tags.indexOf(last) < 0;
        return this.model.tags.filter(tag => {
            return tags.indexOf(tag) < 0 && (!isLastPart || tag.toLowerCase().indexOf(last.toLowerCase()) >= 0);
        });
    },

    setTags: function() {
        const availableTags = this.getAvailableTags();
        const tagsHtml = availableTags.map(tag => {
            return '<div class="details__field-autocomplete-item">' + _.escape(tag) + '</div>';
        }).join('');
        this.tagsAutocomplete.html(tagsHtml);
        this.tagsAutocomplete.toggle(!!tagsHtml);
    },

    tagsAutocompleteClick: function(e) {
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
        this.afterPaint(function() { this.input.focus(); });
    }
});

module.exports = FieldViewTags;

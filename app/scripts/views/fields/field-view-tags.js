'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewTags = FieldViewText.extend({
    renderValue: function(value) {
        return value ? _.escape(value.join(', ')) : '';
    },

    getEditValue: function(value) {
        return value ? value.join(', ') : '';
    },

    valueToTags: function(val) {
        var allTags = {};
        this.model.tags.forEach(function(tag) {
            allTags[tag.toLowerCase()] = tag;
        });
        return _.unique(val.split(/\s*[;,:]\s*/).filter(_.identity).map(function (tag) {
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
        var fieldRect = this.input[0].getBoundingClientRect();
        this.tagsAutocomplete = $('<div class="details__tags-autocomplete"></div>').appendTo('body');
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
        var tags = this.valueToTags(this.input.val());
        var last = tags[tags.length - 1];
        var isLastPart = last && this.model.tags.indexOf(last) < 0;
        return this.model.tags.filter(function(tag) {
            return tags.indexOf(tag) < 0 && (!isLastPart || tag.toLowerCase().indexOf(last.toLowerCase()) >= 0);
        });
    },

    setTags: function() {
        var availableTags = this.getAvailableTags();
        var tagsHtml = availableTags.map(function(tag) {
            return '<div class="details__tags-autocomplete-tag">' + _.escape(tag) + '</div>';
        }).join('');
        this.tagsAutocomplete.html(tagsHtml);
        this.tagsAutocomplete.toggle(!!tagsHtml);
    },

    tagsAutocompleteClick: function(e) {
        e.stopPropagation();
        if (e.target.classList.contains('details__tags-autocomplete-tag')) {
            var selectedTag = $(e.target).text(), newVal = this.input.val();
            if (newVal) {
                var tags = this.valueToTags(newVal);
                var last = tags[tags.length - 1];
                var isLastPart = last && this.model.tags.indexOf(last) < 0;
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

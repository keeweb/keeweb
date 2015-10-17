'use strict';

var FieldViewText = require('./field-view-text');

var FieldViewTags = FieldViewText.extend({
    renderValue: function(value) {
        return value ? _.escape(value.join(', ')) : '';
    },

    getEditValue: function(value) {
        return value ? value.join(', ') : '';
    },

    endEdit: function(newVal, extra) {
        if (newVal !== undefined) {
            var allTags = {};
            this.model.tags.forEach(function(tag) {
                allTags[tag.toLowerCase()] = tag;
            });
            newVal = _.unique(newVal.split(/\s*[;,:]\s*/).filter(_.identity).map(function (tag) {
                return allTags[tag.toLowerCase()] || tag;
            }));
        }
        FieldViewText.prototype.endEdit.call(this, newVal, extra);
    }
});

module.exports = FieldViewTags;

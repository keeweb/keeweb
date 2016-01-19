
'use strict';

var Backbone = require('backbone'),
    FeatureDetector = require('../../util/feature-detector');

var DetailsAttachmentView = Backbone.View.extend({
    template: require('templates/details/details-attachment.hbs'),

    events: {
    },

    render: function(complete) {
        this.renderTemplate({}, true);
        var shortcut = this.$el.find('.details__attachment-preview-download-text-shortcut');
        shortcut.html(FeatureDetector.actionShortcutSymbol(false));
        var blob = new Blob([this.model.getBinary()], {type: this.model.mimeType});
        var dataEl = this.$el.find('.details__attachment-preview-data');
        switch ((this.model.mimeType || '').split('/')[0]) {
            case 'text':
                var reader = new FileReader();
                reader.addEventListener('loadend', (function() {
                    $('<pre/>').text(reader.result).appendTo(dataEl);
                    complete();
                }).bind(this));
                reader.readAsText(blob);
                return this;
            case 'image':
                $('<img/>').attr('src', URL.createObjectURL(blob)).appendTo(dataEl);
                complete();
                return this;
        }
        this.$el.addClass('details__attachment-preview--empty');
        this.$el.find('.details__attachment-preview-icon').addClass('fa-' + this.model.icon);
        complete();
        return this;
    }
});

module.exports = DetailsAttachmentView;

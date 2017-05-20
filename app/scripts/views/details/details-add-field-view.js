const Backbone = require('backbone');

const DetailsAddFieldView = Backbone.View.extend({
    template: require('templates/details/details-add-field.hbs'),

    events: {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick'
    },

    render: function () {
        this.renderTemplate();
        this.labelEl = this.$el.find('.details__field-label');
        return this;
    },

    fieldLabelClick: function() {
        this.trigger('more-click');
    },

    fieldValueClick: function() {
        this.trigger('add-field');
    }
});

module.exports = DetailsAddFieldView;

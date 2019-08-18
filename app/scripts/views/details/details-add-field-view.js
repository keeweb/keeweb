const Backbone = require('backbone');

const DetailsAddFieldView = Backbone.View.extend({
    template: require('templates/details/details-add-field.hbs'),

    events: {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick'
    },

    render() {
        this.renderTemplate();
        this.labelEl = this.$el.find('.details__field-label');
        return this;
    },

    fieldLabelClick() {
        this.trigger('more-click');
    },

    fieldValueClick() {
        this.trigger('add-field');
    }
});

module.exports = DetailsAddFieldView;

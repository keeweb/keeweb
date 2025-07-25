import { View } from 'framework/views/view';
import template from 'templates/details/details-add-field.hbs';

class DetailsAddFieldView extends View {
    parent = '.details__body-fields';

    template = template;

    events = {
        'click .details__field-label': 'fieldLabelClick',
        'click .details__field-value': 'fieldValueClick'
    };

    render() {
        super.render();
        this.labelEl = this.$el.find('.details__field-label');
    }

    fieldLabelClick() {
        this.emit('more-click');
    }

    fieldValueClick() {
        this.emit('add-field');
    }
}

export { DetailsAddFieldView };

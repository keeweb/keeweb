import { FieldView } from 'views/fields/field-view';
import { escape } from 'util/fn';

class FieldViewSelect extends FieldView {
    readonly = true;

    renderValue(value) {
        return (
            '<select>' +
            value
                .map((opt) => {
                    return (
                        '<option ' +
                        'value="' +
                        escape(opt.id) +
                        '" ' +
                        (opt.selected ? 'selected ' : '') +
                        '>' +
                        escape(opt.value) +
                        '</option>'
                    );
                })
                .join('') +
            '</select>'
        );
    }

    render() {
        super.render();
        this.valueEl.addClass('details__field-value--select');
        this.valueEl.find('select:first').change((e) => {
            this.triggerChange({ val: e.target.value, field: this.model.name });
        });
    }

    fieldLabelClick() {}

    fieldValueClick() {}

    edit() {}

    startEdit() {}

    endEdit(newVal, extra) {
        if (!this.editing) {
            return;
        }
        delete this.input;
        super.endEdit(newVal, extra);
    }
}

export { FieldViewSelect };

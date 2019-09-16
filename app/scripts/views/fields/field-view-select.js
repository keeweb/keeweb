import { FieldView } from 'views/fields/field-view';

class FieldViewSelect extends FieldView {
    readonly = true;

    renderValue(value) {
        return (
            '<select>' +
            value
                .map(opt => {
                    return (
                        '<option ' +
                        'value="' +
                        _.escape(opt.id) +
                        '" ' +
                        (opt.selected ? 'selected ' : '') +
                        '>' +
                        _.escape(opt.value) +
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
        this.valueEl.find('select:first').change(e => {
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

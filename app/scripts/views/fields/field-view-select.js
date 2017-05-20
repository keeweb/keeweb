const FieldView = require('./field-view');

const FieldViewSelect = FieldView.extend({
    readonly: true,

    renderValue: function(value) {
        return '<select>' +
            value.map(opt => {
                return '<option ' + 'value="' + _.escape(opt.id) + '" ' + (opt.selected ? 'selected ' : '') + '>' +
                    _.escape(opt.value) +
                    '</option>';
            }).join('') +
            '</select>';
    },

    render: function() {
        FieldView.prototype.render.call(this);
        this.valueEl.addClass('details__field-value--select');
        this.valueEl.find('select:first').change(e => {
            this.triggerChange({ val: e.target.value, field: this.model.name });
        });
    },

    fieldLabelClick: function() {},

    fieldValueClick: function() {},

    edit: function() {},

    startEdit: function() {},

    endEdit: function(newVal, extra) {
        if (!this.editing) {
            return;
        }
        delete this.input;
        FieldView.prototype.endEdit.call(this, newVal, extra);
    }
});

module.exports = FieldViewSelect;

import Backbone from 'backbone';
import { Keys } from 'const/keys';
import { Locale } from 'util/locale';

const OpenConfigView = Backbone.View.extend({
    template: require('templates/open-config.hbs'),

    events: {
        'click .open__config-btn-cancel': 'cancel',
        'click .open__config-btn-ok': 'apply',
        'input input': 'changeInput',
        'keyup input': 'keyup'
    },

    render() {
        this.renderTemplate(this.model);
        this.$el.find(':input:first').focus();
        this.checkValidity();
        return this;
    },

    cancel() {
        this.trigger('cancel');
    },

    apply() {
        const data = this.getData();
        if (data) {
            this.trigger('apply', data);
        }
    },

    changeInput() {
        this.checkValidity();
    },

    keyup(e) {
        if (e.which === Keys.DOM_VK_RETURN) {
            this.apply();
        }
    },

    checkValidity() {
        const isValid = this.getData();
        this.$el.find('.open__config-btn-ok').prop('disabled', !isValid);
    },

    getData() {
        let data = { storage: this.model.id };
        this.model.fields.every(function(field) {
            const input = this.$el.find('#open__config-field-' + field.id)[0];
            if (data && input.checkValidity()) {
                data[field.id] = input.value;
            } else {
                data = null;
                return false;
            }
            return true;
        }, this);
        return data;
    },

    setDisabled(disabled) {
        disabled = !!disabled;
        this.$el.find(':input:not(.open__config-btn-cancel)').prop('disabled', disabled);
        this.$el.toggleClass('open__config--disabled', disabled);
        if (disabled) {
            this.$el.find('.open__config-error').text('');
        }
    },

    setError(err) {
        const errText =
            err && err.notFound
                ? Locale.openConfigErrorNotFound
                : Locale.openConfigError.replace('{}', err);
        this.$el.find('.open__config-error').text(errText);
    }
});

export { OpenConfigView };

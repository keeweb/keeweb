'use strict';

var Backbone = require('backbone'),
    Locale = require('../util/locale'),
    Keys = require('../const/keys');

var OpenConfigView = Backbone.View.extend({
    template: require('templates/open-config.hbs'),

    events: {
        'click .open__config-btn-cancel': 'cancel',
        'click .open__config-btn-ok': 'apply',
        'input input': 'changeInput',
        'keyup input': 'keyup'
    },

    render: function() {
        this.renderTemplate(this.model);
        this.$el.find(':input:first').focus();
        this.checkValidity();
        return this;
    },

    cancel: function() {
        this.trigger('cancel');
    },

    apply: function() {
        var data = this.getData();
        if (data) {
            this.trigger('apply', data);
        }
    },

    changeInput: function() {
        this.checkValidity();
    },

    keyup: function(e) {
        if (e.which === Keys.DOM_VK_RETURN) {
            this.apply();
        }
    },

    checkValidity: function() {
        var isValid = this.getData();
        this.$el.find('.open__config-btn-ok').prop('disabled', !isValid);
    },

    getData: function() {
        var data = { storage: this.model.id };
        this.model.fields.every(function(field) {
            var input = this.$el.find('#open__config-field-' + field.id)[0];
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

    setDisabled: function(disabled) {
        disabled = !!disabled;
        this.$el.find(':input:not(.open__config-btn-cancel)').prop('disabled', disabled);
        this.$el.toggleClass('open__config--disabled', disabled);
        if (disabled) {
            this.$el.find('.open__config-error').text('');
        }
    },

    setError: function(err) {
        this.$el.find('.open__config-error').text(Locale.openConfigError.replace('{}', err));
    }
});

module.exports = OpenConfigView;

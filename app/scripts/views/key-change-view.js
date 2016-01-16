'use strict';

var Backbone = require('backbone'),
    SecureInput = require('../comp/secure-input'),
    Alerts = require('../comp/alerts'),
    Locale = require('../util/locale'),
    Keys = require('../const/keys');

var KeyChangeView = Backbone.View.extend({
    template: require('templates/key-change.hbs'),

    events: {
        'keydown .key-change__pass': 'inputKeydown',
        'click .key-change__keyfile': 'keyFileClicked',
        'change .key-change__file': 'keyFileSelected',
        'click .key-change__btn-ok': 'accept',
        'click .key-change__btn-cancel': 'cancel'
    },

    passwordInput: null,
    inputEl: null,

    initialize: function() {
        this.passwordInput = new SecureInput();
    },

    render: function() {
        this.keyFileName = this.model.get('keyFileName') || null;
        this.keyFileData = null;
        this.renderTemplate({
            fileName: this.model.get('name'),
            keyFileName: this.model.get('keyFileName')
        });
        this.$el.find('.key-change__keyfile-name').text(this.keyFileName ? ': ' + this.keyFileName : '');
        this.inputEl = this.$el.find('.key-change__pass');
        this.passwordInput.reset();
        this.passwordInput.setElement(this.inputEl);
    },

    remove: function() {
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    inputKeydown: function(e) {
        var code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            this.accept();
        } else if (code === Keys.DOM_VK_A) {
            e.stopImmediatePropagation();
        }
    },

    keyFileClicked: function() {
        if (this.keyFileName) {
            this.keyFileName = null;
            this.keyFile = null;
            this.$el.find('.key-change__keyfile-name').html('');
        }
        this.$el.find('.key-change__file').val(null).click();
        this.inputEl.focus();
    },

    keyFileSelected: function(e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = (function(e) {
                this.keyFileName = file.name;
                this.keyFileData = e.target.result;
                this.$el.find('.key-change__keyfile-name').text(': ' + this.keyFileName);
            }).bind(this);
            reader.onerror = function() {
                Alerts.error({ header: Locale.openFailedRead });
            };
            reader.readAsArrayBuffer(file);
        } else {
            this.$el.find('.key-change__keyfile-name').html('');
        }
        this.inputEl.focus();
    },

    accept: function() {
        this.trigger('accept', {
            file: this.model,
            password: this.passwordInput.value,
            keyFileName: this.keyFileName,
            keyFileData: this.keyFileData
        });
    },

    cancel: function() {
        this.trigger('cancel');
    }
});

module.exports = KeyChangeView;

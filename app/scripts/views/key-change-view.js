const Backbone = require('backbone');
const SecureInput = require('../comp/secure-input');
const Alerts = require('../comp/alerts');
const Locale = require('../util/locale');
const InputFx = require('../util/input-fx');
const Keys = require('../const/keys');

const KeyChangeView = Backbone.View.extend({
    template: require('templates/key-change.hbs'),

    events: {
        'keydown .key-change__pass': 'inputKeydown',
        'keydown .key-change__pass-repeat': 'inputKeydown',
        'click .key-change__keyfile': 'keyFileClicked',
        'change .key-change__file': 'keyFileSelected',
        'click .key-change__btn-ok': 'accept',
        'click .key-change__btn-cancel': 'cancel'
    },

    passwordInput: null,
    passwordRepeatInput: null,
    inputEl: null,

    initialize: function() {
        this.passwordInput = new SecureInput();
    },

    render: function() {
        this.keyFileName = this.model.file.get('keyFileName') || null;
        this.keyFileData = null;
        const repeat = this.model.expired;
        this.renderTemplate({
            fileName: this.model.file.get('name'),
            keyFileName: this.model.file.get('keyFileName'),
            title: this.model.expired ? Locale.keyChangeTitleExpired : Locale.keyChangeTitleRemote,
            message: this.model.expired ? Locale.keyChangeMessageExpired : Locale.keyChangeMessageRemote,
            repeat: repeat
        });
        this.$el.find('.key-change__keyfile-name').text(this.keyFileName ? ': ' + this.keyFileName : '');
        this.inputEl = this.$el.find('.key-change__pass');
        this.passwordInput.reset();
        this.passwordInput.setElement(this.inputEl);
        this.inputEl.focus();
        if (repeat) {
            this.passwordRepeatInput = new SecureInput();
            this.passwordRepeatInput.reset();
            this.passwordRepeatInput.setElement(this.$el.find('.key-change__pass-repeat'));
        }
    },

    remove: function() {
        Backbone.View.prototype.remove.apply(this, arguments);
    },

    inputKeydown: function(e) {
        const code = e.keyCode || e.which;
        if (code === Keys.DOM_VK_RETURN) {
            this.accept();
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
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                this.keyFileName = file.name;
                this.keyFileData = e.target.result;
                this.$el.find('.key-change__keyfile-name').text(': ' + this.keyFileName);
            };
            reader.onerror = () => {
                Alerts.error({ header: Locale.openFailedRead });
            };
            reader.readAsArrayBuffer(file);
        } else {
            this.$el.find('.key-change__keyfile-name').html('');
        }
        this.inputEl.focus();
    },

    accept: function() {
        if (!this.passwordInput.value.byteLength) {
            this.passwordInput.el.focus();
            this.passwordRepeatInput.el.addClass('input--error');
            InputFx.shake(this.passwordInput.el);
            return;
        } else {
            this.passwordInput.el.removeClass('input--error');
        }
        if (this.passwordRepeatInput) {
            if (!this.passwordRepeatInput.value.equals(this.passwordInput.value)) {
                this.passwordRepeatInput.el.addClass('input--error');
                this.passwordRepeatInput.el.focus();
                InputFx.shake(this.passwordRepeatInput.el);
                return;
            }
        }
        this.trigger('accept', {
            file: this.model.file,
            expired: this.model.expired,
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

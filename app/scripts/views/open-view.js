'use strict';

var Backbone = require('backbone'),
    Keys = require('../const/keys'),
    Alerts = require('../comp/alerts'),
    SecureInput = require('../comp/secure-input'),
    FileModel = require('../models/file-model'),
    Launcher = require('../comp/launcher'),
    DropboxLink = require('../comp/dropbox-link');

var OpenView = Backbone.View.extend({
    template: require('templates/open.html'),

    events: {
        'change .open__file-ctrl': 'fileSelected',

        'click .open__icon-open': 'openFile',
        'click .open__icon-new': 'createNew',
        'click .open__icon-dropbox': 'openFromDropbox',
        'click .open__icon-demo': 'createDemo',

        'click .open__pass-input[readonly]': 'openFile',
        'input .open__pass-input': 'inputInput',
        'keydown .open__pass-input': 'inputKeydown',
        'keypress .open__pass-input': 'inputKeypress',

        'click .open__settings-key-file': 'openKeyFile',
        'change .open__settings-check-offline': 'changeOffline',

        'dragover': 'dragover',
        'dragleave': 'dragleave',
        'drop': 'drop'
    },

    fileData: null,
    keyFileData: null,
    passwordInput: null,
    dropboxLoading: null,

    initialize: function () {
        this.file = new FileModel();
        this.fileData = null;
        this.keyFileData = null;
        this.passwordInput = new SecureInput();
        this.listenTo(this.file, 'change:open', this.fileOpened);
    },

    render: function () {
        if (this.dragTimeout) {
            clearTimeout(this.dragTimeout);
        }
        this.renderTemplate({
            supportsDropbox: !Launcher,
            dropboxLoading: this.dropboxLoading
        });
        this.inputEl = this.$el.find('.open__pass-input');
        this.passwordInput.setElement(this.inputEl);
        return this;
    }
});

module.exports = OpenView;

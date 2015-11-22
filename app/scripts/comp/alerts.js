'use strict';

var ModalView = require('../views/modal-view');

var Alerts = {
    alertDisplayed: false,

    buttons: {
        ok: {result: 'yes', title: 'OK'},
        yes: {result: 'yes', title: 'Yes'},
        no: {result: '', title: 'No'}
    },

    alert: function(config) {
        Alerts.alertDisplayed = true;
        var view = new ModalView({ model: config });
        view.render();
        view.on('result', function(res, check) {
            Alerts.alertDisplayed = false;
            if (res && config.success) {
                config.success(res, check);
            }
            if (!res && config.cancel) {
                config.cancel();
            }
            if (config.complete) {
                config.complete(res, check);
            }
        });
    },

    notImplemented: function() {
        this.alert({
            header: 'Not Implemented',
            body: '',
            icon: 'exclamation-triangle',
            buttons: [this.buttons.ok],
            esc: '',
            click: '',
            enter: ''
        });
    },

    info: function(config) {
        this.alert(_.extend({
            header: '',
            body: '',
            icon: 'info',
            buttons: [this.buttons.ok],
            esc: '',
            click: '',
            enter: ''
        }, config));
    },

    error: function(config) {
        this.alert(_.extend({
            header: '',
            body: '',
            icon: 'exclamation-circle',
            buttons: [this.buttons.ok],
            esc: '',
            click: '',
            enter: ''
        }, config));
    },

    yesno: function(config) {
        this.alert(_.extend({
            header: '',
            body: '',
            icon: 'question',
            buttons: [this.buttons.yes, this.buttons.no],
            esc: '',
            click: '',
            enter: 'yes'
        }, config));
    }
};

module.exports = Alerts;

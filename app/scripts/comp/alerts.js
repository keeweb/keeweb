const ModalView = require('../views/modal-view');
const Locale = require('../util/locale');

const Alerts = {
    alertDisplayed: false,

    buttons: {
        ok: {result: 'yes', get title() { return Locale.alertOk; }},
        yes: {result: 'yes', get title() { return Locale.alertYes; }},
        no: {result: '', get title() { return Locale.alertNo; }},
        cancel: {result: '', get title() { return Locale.alertCancel; }}
    },

    alert: function(config) {
        if (config.skipIfAlertDisplayed && Alerts.alertDisplayed) {
            return null;
        }
        Alerts.alertDisplayed = true;
        const view = new ModalView({ model: config });
        view.render();
        view.on('result', (res, check) => {
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
        return view;
    },

    notImplemented: function() {
        this.alert({
            header: Locale.notImplemented,
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

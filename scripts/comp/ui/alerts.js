import { Locale } from 'util/locale';
import { ModalView } from 'views/modal-view';

const Alerts = {
    alertDisplayed: false,

    buttons: {
        ok: {
            result: 'yes',
            get title() {
                return Locale.alertOk;
            }
        },
        yes: {
            result: 'yes',
            get title() {
                return Locale.alertYes;
            }
        },
        allow: {
            result: 'yes',
            get title() {
                return Locale.alertAllow;
            }
        },
        no: {
            result: '',
            get title() {
                return Locale.alertNo;
            }
        },
        cancel: {
            result: '',
            get title() {
                return Locale.alertCancel;
            }
        },
        deny: {
            result: '',
            get title() {
                return Locale.alertDeny;
            }
        }
    },

    alert(config) {
        if (config.skipIfAlertDisplayed && Alerts.alertDisplayed) {
            return null;
        }
        Alerts.alertDisplayed = true;
        const view = new ModalView(config);
        view.render();
        view.once('result', (res, check) => {
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
        view.on('will-close', () => {
            Alerts.alertDisplayed = false;
        });
        return view;
    },

    notImplemented() {
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

    info(config) {
        this.alert({
            header: '',
            body: '',
            icon: 'info',
            buttons: [this.buttons.ok],
            esc: '',
            click: '',
            enter: '',
            ...config
        });
    },

    error(config) {
        this.alert({
            header: '',
            body: '',
            icon: 'exclamation-circle',
            buttons: [this.buttons.ok],
            esc: '',
            click: '',
            enter: '',
            ...config
        });
    },

    yesno(config) {
        this.alert({
            header: '',
            body: '',
            icon: 'question',
            buttons: [this.buttons.yes, this.buttons.no],
            esc: '',
            click: '',
            enter: 'yes',
            ...config
        });
    }
};

export { Alerts };

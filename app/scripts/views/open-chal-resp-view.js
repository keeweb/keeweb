import { View } from 'framework/views/view';
import { YubiKey } from 'comp/app/yubikey';
import { Locale } from 'util/locale';
import template from 'templates/open-chal-resp.hbs';

class OpenChalRespView extends View {
    template = template;

    events = {
        'click .open-chal-resp__item': 'itemClick'
    };

    constructor() {
        super();

        YubiKey.checkToolStatus().then(status => {
            if (this.removed) {
                return;
            }
            if (status === 'ok') {
                YubiKey.list((err, yubiKeys) => {
                    this.error = err;
                    this.yubiKeys = [];
                    for (const { fullName, serial } of yubiKeys) {
                        for (const slot of [1, 2]) {
                            this.yubiKeys.push({
                                fullName,
                                serial,
                                slot
                            });
                        }
                    }
                    this.render();
                });
            } else {
                this.render();
            }
        });
    }

    render() {
        let error = this.error;

        if (YubiKey.ykmanStatus === 'error') {
            error = Locale.openChalRespErrorNotInstalled.replace('{}', 'ykman');
        }
        if (this.yubiKeys && !this.yubiKeys.length) {
            error = Locale.openChalRespErrorEmpty;
        }

        super.render({
            error,
            yubiKeys: this.yubiKeys,
            loading: !YubiKey.ykmanStatus || YubiKey.ykmanStatus === 'checking'
        });
    }

    itemClick(e) {
        const el = e.target.closest('[data-serial]');
        const { serial, slot } = el.dataset;
        this.emit('select', { serial, slot });
    }
}

export { OpenChalRespView };

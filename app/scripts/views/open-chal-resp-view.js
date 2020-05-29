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

        YubiKey.list((err, yubiKeys) => {
            this.error = err;
            this.yubiKeys = [];
            if (yubiKeys) {
                for (const { fullName, serial, slot1, slot2 } of yubiKeys) {
                    for (const slot of [slot1 ? 1 : 0, slot2 ? 2 : 0].filter(s => s)) {
                        this.yubiKeys.push({
                            fullName,
                            serial,
                            slot
                        });
                    }
                }
            }
            this.render();
        });
    }

    render() {
        let error = this.error;

        if (this.yubiKeys && !this.yubiKeys.length) {
            error = Locale.openChalRespErrorEmpty;
        }

        super.render({
            error,
            yubiKeys: this.yubiKeys,
            loading: !this.yubiKeys && !this.error
        });
    }

    itemClick(e) {
        const el = e.target.closest('[data-serial]');
        const { serial, slot } = el.dataset;
        this.emit('select', { serial, slot });
    }
}

export { OpenChalRespView };

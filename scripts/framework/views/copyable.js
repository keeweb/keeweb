import { Events } from 'framework/events';
import { AppSettingsModel } from 'models/app-settings-model';
import { Locale } from 'util/locale';
import { Tip } from 'util/ui/tip';
import { Timeouts } from 'const/timeouts';

const Copyable = {
    hideFieldCopyTip() {
        if (this.fieldCopyTip) {
            this.fieldCopyTip.hide();
            this.fieldCopyTip = null;
        }
    },

    fieldCopied(e) {
        this.hideFieldCopyTip();
        const fieldLabel = e.source.labelEl;
        const clipboardTime = e.copyRes.seconds;
        const msg = clipboardTime
            ? Locale.detFieldCopiedTime.replace('{}', clipboardTime)
            : Locale.detFieldCopied;
        let tip;
        if (!this.isHidden()) {
            tip = Tip.createTip(fieldLabel[0], {
                title: msg,
                placement: 'right',
                fast: true,
                force: true,
                noInit: true
            });
            this.fieldCopyTip = tip;
            tip.show();
        }
        setTimeout(() => {
            if (tip) {
                tip.hide();
            }
            this.fieldCopyTip = null;
            if (e.source.model.name === '$Password' && AppSettingsModel.lockOnCopy) {
                setTimeout(() => {
                    Events.emit('lock-workspace');
                }, Timeouts.BeforeAutoLock);
            }
        }, Timeouts.CopyTip);
    }
};

export { Copyable };

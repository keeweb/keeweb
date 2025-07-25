import QrCode from 'jsqrcode';
import { Events } from 'framework/events';
import { Shortcuts } from 'comp/app/shortcuts';
import { Alerts } from 'comp/ui/alerts';
import { Otp } from 'util/data/otp';
import { Features } from 'util/features';
import { Locale } from 'util/locale';
import { Logger } from 'util/logger';

const logger = new Logger('otp-qr-reader');

class OtpQrReader {
    alert = null;

    fileInput = null;

    constructor() {
        this.pasteEvent = this.pasteEvent.bind(this);
    }

    read() {
        let screenshotKey = Shortcuts.screenshotToClipboardShortcut();
        if (screenshotKey) {
            screenshotKey = Locale.detSetupOtpAlertBodyWith.replace('{}', screenshotKey);
        }
        const pasteKey = Features.isMobile
            ? ''
            : Locale.detSetupOtpAlertBodyWith.replace('{}', Shortcuts.actionShortcutSymbol() + 'V');
        this.startListenClipoard();
        const buttons = [
            { result: 'manually', title: Locale.detSetupOtpManualButton, silent: true },
            Alerts.buttons.cancel
        ];
        if (Features.isMobile) {
            buttons.unshift({ result: 'select', title: Locale.detSetupOtpScanButton });
        }
        const line3 = Features.isMobile
            ? Locale.detSetupOtpAlertBody3Mobile
            : Locale.detSetupOtpAlertBody3.replace('{}', pasteKey || '');
        this.alert = Alerts.alert({
            icon: 'qrcode',
            header: Locale.detSetupOtpAlert,
            body: [
                Locale.detSetupOtpAlertBody,
                Locale.detSetupOtpAlertBody1,
                Locale.detSetupOtpAlertBody2.replace('{}', screenshotKey || ''),
                line3,
                Locale.detSetupOtpAlertBody4
            ].join('\n'),
            esc: '',
            click: '',
            enter: '',
            buttons,
            complete: (res) => {
                this.alert = null;
                this.stopListenClipboard();
                if (res === 'select') {
                    this.selectFile();
                } else if (res === 'manually') {
                    this.enterManually();
                }
            }
        });
    }

    selectFile() {
        if (!this.fileInput) {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('capture', 'camera');
            input.setAttribute('accept', 'image/*');
            input.setAttribute('class', 'hide-by-pos');
            this.fileInput = input;
            this.fileInput.onchange = this.fileSelected;
        }
        this.fileInput.click();
    }

    fileSelected() {
        const file = this.fileInput.files[0];
        if (!file || file.type.indexOf('image') < 0) {
            return;
        }
        this.readFile(file);
    }

    startListenClipoard() {
        document.addEventListener('paste', this.pasteEvent);
    }

    stopListenClipboard() {
        document.removeEventListener('paste', this.pasteEvent);
    }

    pasteEvent(e) {
        const item = [...e.clipboardData.items].find(
            (item) => item.kind === 'file' && item.type.indexOf('image') !== -1
        );
        if (!item) {
            logger.debug('Paste without file');
            return;
        }
        logger.info('Reading pasted image', item.type);
        if (this.alert) {
            this.alert.change({
                header: Locale.detOtpImageReading
            });
        }
        this.readFile(item.getAsFile());
    }

    readFile(file) {
        const reader = new FileReader();
        reader.onload = () => {
            logger.debug('Image data loaded');
            this.readQr(reader.result);
        };
        reader.readAsDataURL(file);
    }

    readQr(imageData) {
        const image = new Image();
        image.onload = () => {
            logger.debug('Image format loaded');
            try {
                const ts = logger.ts();
                const url = new QrCode(image).decode();
                logger.info('QR code read', logger.ts(ts));
                this.removeAlert();
                try {
                    const otp = Otp.parseUrl(url);
                    Events.emit('qr-read', otp);
                } catch (err) {
                    logger.error('Error parsing QR code', err);
                    Alerts.error({
                        header: Locale.detOtpQrWrong,
                        body: Locale.detOtpQrWrongBody,
                        pre: err.toString()
                    });
                }
            } catch (e) {
                logger.error('Error reading QR code', e);
                this.removeAlert();
                Alerts.error({
                    header: Locale.detOtpQrError,
                    body: Locale.detOtpQrErrorBody
                });
            }
        };
        image.onerror = () => {
            logger.debug('Image load error');
            this.removeAlert();
            Alerts.error({
                header: Locale.detOtpImageError,
                body: Locale.detOtpImageErrorBody
            });
        };
        image.src = imageData;
    }

    enterManually() {
        Events.emit('qr-enter-manually');
    }

    removeAlert() {
        if (this.alert) {
            this.alert.closeImmediate();
        }
    }
}

const instance = new OtpQrReader();

export { instance as OtpQrReader };

const Backbone = require('backbone');
const Alerts = require('./alerts');
const Locale = require('../util/locale');
const Logger = require('../util/logger');
const FeatureDetector = require('../util/feature-detector');
const Otp = require('../util/otp');
const QrCode = require('jsqrcode');

const logger = new Logger('otp-qr-reader');

const OtpQrReader = {
    alert: null,

    fileInput: null,

    read: function() {
        let screenshotKey = FeatureDetector.screenshotToClipboardShortcut();
        if (screenshotKey) {
            screenshotKey = Locale.detSetupOtpAlertBodyWith.replace('{}', '<code>' + screenshotKey + '</code>');
        }
        const pasteKey = FeatureDetector.isMobile ? ''
            : Locale.detSetupOtpAlertBodyWith.replace('{}',
                '<code>' + FeatureDetector.actionShortcutSymbol() + 'V</code>');
        OtpQrReader.startListenClipoard();
        const buttons = [{result: 'manually', title: Locale.detSetupOtpManualButton, silent: true},
            Alerts.buttons.cancel];
        if (FeatureDetector.isMobile) {
            buttons.unshift({result: 'select', title: Locale.detSetupOtpScanButton});
        }
        const line3 = FeatureDetector.isMobile ? Locale.detSetupOtpAlertBody3Mobile
            : Locale.detSetupOtpAlertBody3.replace('{}', pasteKey || '');
        OtpQrReader.alert = Alerts.alert({
            icon: 'qrcode',
            header: Locale.detSetupOtpAlert,
            body: [Locale.detSetupOtpAlertBody,
                Locale.detSetupOtpAlertBody1,
                Locale.detSetupOtpAlertBody2.replace('{}', screenshotKey || ''),
                line3,
                Locale.detSetupOtpAlertBody4
            ].join('<br/>'),
            esc: '',
            click: '',
            enter: '',
            buttons: buttons,
            complete: function(res) {
                OtpQrReader.alert = null;
                OtpQrReader.stopListenClipboard();
                if (res === 'select') {
                    OtpQrReader.selectFile();
                } else if (res === 'manually') {
                    OtpQrReader.enterManually();
                }
            }
        });
        // transparent window with QR scanner - is it better? check usability of this
        // var BrowserWindow = require('../../comp/launcher').remReq('browser-window');
        // new BrowserWindow({ width: 800, height: 600, show: false, alwaysOnTop: true, backgroundColor: '#80FFFFFF',
        //     transparent: true }).show();
    },

    selectFile: function() {
        if (!OtpQrReader.fileInput) {
            const input = document.createElement('input');
            input.setAttribute('type', 'file');
            input.setAttribute('capture', 'camera');
            input.setAttribute('accept', 'image/*');
            input.setAttribute('class', 'hide-by-pos');
            OtpQrReader.fileInput = input;
            OtpQrReader.fileInput.onchange = OtpQrReader.fileSelected;
        }
        OtpQrReader.fileInput.click();
    },

    fileSelected: function() {
        const file = OtpQrReader.fileInput.files[0];
        if (!file || file.type.indexOf('image') < 0) {
            return;
        }
        OtpQrReader.readFile(file);
    },

    startListenClipoard: function() {
        document.addEventListener('paste', OtpQrReader.pasteEvent);
    },

    stopListenClipboard: function() {
        document.removeEventListener('paste', OtpQrReader.pasteEvent);
    },

    pasteEvent: function(e) {
        const item = _.find(e.clipboardData.items, item => item.kind === 'file' && item.type.indexOf('image') !== -1);
        if (!item) {
            logger.debug('Paste without file');
            return;
        }
        logger.info('Reading pasted image', item.type);
        if (OtpQrReader.alert) {
            OtpQrReader.alert.change({
                header: Locale.detOtpImageReading
            });
        }
        OtpQrReader.readFile(item.getAsFile());
    },

    readFile: function(file) {
        const reader = new FileReader();
        reader.onload = function() {
            logger.debug('Image data loaded');
            OtpQrReader.readQr(reader.result);
        };
        reader.readAsDataURL(file);
    },

    readQr: function(imageData) {
        const image = new Image();
        image.onload = function() {
            logger.debug('Image format loaded');
            try {
                const ts = logger.ts();
                const url = new QrCode(image).decode();
                logger.info('QR code read', logger.ts(ts));
                OtpQrReader.removeAlert();
                try {
                    const otp = Otp.parseUrl(url);
                    OtpQrReader.trigger('qr-read', otp);
                } catch (err) {
                    logger.error('Error parsing QR code', err);
                    Alerts.error({
                        header: Locale.detOtpQrWrong,
                        body: Locale.detOtpQrWrongBody + '<pre class="modal__pre">' + _.escape(err.toString()) + '</pre>'
                    });
                }
            } catch (e) {
                logger.error('Error reading QR code', e);
                OtpQrReader.removeAlert();
                Alerts.error({
                    header: Locale.detOtpQrError,
                    body: Locale.detOtpQrErrorBody
                });
            }
        };
        image.onerror = function() {
            logger.debug('Image load error');
            OtpQrReader.removeAlert();
            Alerts.error({
                header: Locale.detOtpImageError,
                body: Locale.detOtpImageErrorBody
            });
        };
        image.src = imageData;
    },

    enterManually: function() {
        OtpQrReader.trigger('enter-manually');
    },

    removeAlert: function() {
        if (OtpQrReader.alert) {
            OtpQrReader.alert.closeImmediate();
        }
    }
};

_.extend(OtpQrReader, Backbone.Events);

module.exports = OtpQrReader;

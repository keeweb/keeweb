'use strict';

var Backbone = require('backbone'),
    Alerts = require('./alerts'),
    Locale = require('../util/locale'),
    Logger = require('../util/logger'),
    FeatureDetector = require('../util/feature-detector'),
    Otp = require('../util/otp'),
    QrCode = require('qrcode');

var logger = new Logger('otp-qr-reader');

var OtpQrReader = {
    alert: null,

    read: function() {
        var screenshotKey = FeatureDetector.screenshotToClipboardShortcut();
        if (screenshotKey) {
            screenshotKey = Locale.detSetupOtpAlertBodyWith.replace('{}', '<code>' + screenshotKey + '</code>');
        }
        var pasteKey = FeatureDetector.isMobile() ? '' :
            Locale.detSetupOtpAlertBodyWith.replace('{}',
                '<code>' + FeatureDetector.actionShortcutSymbol() + 'V</code>');
        OtpQrReader.startListenClipoard();
        OtpQrReader.alert = Alerts.alert({
            icon: 'qrcode',
            header: Locale.detSetupOtpAlert,
            body: [Locale.detSetupOtpAlertBody,
                Locale.detSetupOtpAlertBody1,
                Locale.detSetupOtpAlertBody2.replace('{}', screenshotKey || ''),
                Locale.detSetupOtpAlertBody3.replace('{}', pasteKey || '')
            ].join('<br/>'),
            esc: '',
            click: '',
            enter: '',
            buttons: [Alerts.buttons.cancel],
            complete: function() {
                OtpQrReader.alert = null;
                OtpQrReader.stopListenClipboard();
            }
        });
        // var BrowserWindow = require('../../comp/launcher').remReq('browser-window');
        // var win = new BrowserWindow({ width: 800, height: 600, show: false, alwaysOnTop: true, backgroundColor: '#80FFFFFF',
        //     transparent: true });
        // win.on('closed', function() { win = null; });
        // win.loadURL('https://github.com');
        // win.show();
    },

    startListenClipoard: function() {
        document.addEventListener('paste', OtpQrReader.pasteEvent);
    },

    stopListenClipboard: function() {
        document.removeEventListener('paste', OtpQrReader.pasteEvent);
    },

    pasteEvent: function(e) {
        logger.debug('Paste event');
        var item = _.find(e.clipboardData.items, function(item) {
            return item.kind === 'file' && item.type.indexOf('image') !== -1;
        });
        if (!item) {
            return;
        }
        logger.info('Reading image', item.type);
        if (OtpQrReader.alert) {
            OtpQrReader.alert.change({
                header: Locale.detOtpImageReading
            });
        }
        var blob = item.getAsFile();
        var reader = new FileReader();
        reader.onload = function() {
            logger.debug('Image data loaded');
            OtpQrReader.readQr(reader.result);
        };
        reader.readAsDataURL(blob);
    },

    readQr: function(imageData) {
        var image = new Image();
        image.onload = function() {
            logger.debug('Image format loaded');
            try {
                var ts = logger.ts();
                var url = new QrCode(image).decode();
                logger.info('QR code read', logger.ts(ts));
                OtpQrReader.alert.remove();
                OtpQrReader.stopListenClipboard();
                try {
                    var otp = Otp.parseUrl(url);
                    OtpQrReader.trigger('qr-read', otp);
                } catch (err) {
                    logger.error('Error parsing QR code', err);
                    Alerts.error({
                        header: Locale.detOtpQrWrong,
                        body: Locale.detOtpQrWrongBody + '<pre class="modal__pre">' + _.escape(err.toString()) +'</pre>'
                    });
                }
            } catch (e) {
                logger.error('Error reading QR code', e);
                OtpQrReader.alert.remove();
                OtpQrReader.stopListenClipboard();
                Alerts.error({
                    header: Locale.detOtpQrError,
                    body: Locale.detOtpQrErrorBody
                });
            }
        };
        image.onerror = function() {
            logger.debug('Image load error');
            OtpQrReader.alert.remove();
            OtpQrReader.stopListenClipboard();
            Alerts.error({
                header: Locale.detOtpImageError,
                body: Locale.detOtpImageErrorBody
            });
        };
        image.src = imageData;
    }
};

_.extend(OtpQrReader, Backbone.Events);

module.exports = OtpQrReader;

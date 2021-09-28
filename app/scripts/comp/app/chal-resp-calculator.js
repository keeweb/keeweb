import { Events } from 'framework/events';
import { Logger } from 'util/logger';
import { YubiKey } from 'comp/app/yubikey';
import { UsbListener } from 'comp/app/usb-listener';
import { Alerts } from 'comp/ui/alerts';
import { Locale } from 'util/locale';
import { Timeouts } from 'const/timeouts';
import { Launcher } from 'comp/launcher';
import { AppSettingsModel } from 'models/app-settings-model';

const logger = new Logger('chal-resp');

const ChalRespCalculator = {
    cache: {},

    getCacheKey(params) {
        return `${params.vid}:${params.pid}:${params.serial}:${params.slot}`;
    },

    build(params) {
        if (!params) {
            return null;
        }
        return (challenge) => {
            return new Promise((resolve, reject) => {
                challenge = Buffer.from(challenge);
                const hexChallenge = challenge.toString('hex');

                const cacheKey = this.getCacheKey(params);
                const respFromCache = this.cache[cacheKey]?.[hexChallenge];
                if (respFromCache) {
                    logger.debug('Found ChalResp in cache');
                    return resolve(Buffer.from(respFromCache, 'hex'));
                }

                if (!AppSettingsModel.enableUsb) {
                    logger.debug('USB is disabled');
                    Alerts.error({
                        header: Locale.yubiKeyDisabledErrorHeader,
                        body: Locale.yubiKeyDisabledErrorBody,
                        complete() {
                            const err = new Error(Locale.yubiKeyDisabledErrorHeader);
                            err.userCanceled = true;
                            err.ykError = true;

                            reject(err);
                        }
                    });
                    return;
                }

                logger.debug('Calculating ChalResp using a YubiKey', params);

                this._calc(params, challenge, (err, response) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(response);
                });
            });
        };
    },

    _calc(params, challenge, callback) {
        let touchAlert = null;
        let userCanceled = false;

        YubiKey.calculateChalResp(params, challenge, (err, response) => {
            if (userCanceled) {
                userCanceled = false;
                return;
            }
            if (touchAlert) {
                touchAlert.closeWithoutResult();
                touchAlert = null;
            }
            if (err) {
                if (err.noKey) {
                    logger.info('YubiKey ChalResp: no key');
                    this._showNoKeyAlert(params.serial, (err) => {
                        if (err) {
                            return callback(err);
                        }
                        this._calc(params, challenge, callback);
                    });
                    return;
                } else if (err.touchRequested) {
                    logger.info('YubiKey ChalResp: touch requested');
                    touchAlert = this._showTouchAlert(params.serial, (err) => {
                        touchAlert = null;
                        userCanceled = true;

                        logger.info('YubiKey ChalResp canceled');
                        YubiKey.cancelChalResp();

                        callback(err);
                    });
                    return;
                } else {
                    logger.error('YubiKey ChalResp error', err);
                }
                return callback(err);
            }

            const cacheKey = this.getCacheKey(params);
            if (!this.cache[cacheKey]) {
                this.cache[cacheKey] = {};
            }

            const hexChallenge = challenge.toString('hex');
            this.cache[cacheKey][hexChallenge] = response.toString('hex');

            logger.info('Calculated YubiKey ChalResp');
            callback(null, response);
        });
    },

    _showNoKeyAlert(serial, callback) {
        Launcher.showMainWindow();

        let noKeyAlert = null;
        let deviceEnumerationTimer;

        const onUsbDevicesChanged = () => {
            if (!UsbListener.attachedYubiKeys) {
                return;
            }
            deviceEnumerationTimer = setTimeout(() => {
                YubiKey.list((err, list) => {
                    if (err) {
                        logger.error('YubiKey list error', err);
                        return;
                    }
                    const isAttached = list.some((yk) => yk.serial === serial);
                    logger.info(isAttached ? 'YubiKey found' : 'YubiKey not found');
                    if (isAttached) {
                        Events.off('usb-devices-changed', onUsbDevicesChanged);
                        if (noKeyAlert) {
                            noKeyAlert.closeWithoutResult();
                        }
                        callback();
                    }
                });
            }, Timeouts.ExternalDeviceAfterReconnect);
        };

        Events.on('usb-devices-changed', onUsbDevicesChanged);

        noKeyAlert = Alerts.alert({
            header: Locale.yubiKeyNoKeyHeader,
            body: Locale.yubiKeyNoKeyBody.replace('{}', serial),
            buttons: [Alerts.buttons.cancel],
            icon: 'usb-token',
            cancel: () => {
                logger.info('No key alert closed');

                clearTimeout(deviceEnumerationTimer);
                Events.off('usb-devices-changed', onUsbDevicesChanged);

                const err = new Error('User canceled the YubiKey no key prompt');
                err.userCanceled = true;
                err.ykError = true;

                return callback(err);
            }
        });
    },

    _showTouchAlert(serial, callback) {
        Launcher.showMainWindow();

        return Alerts.alert({
            header: Locale.yubiKeyTouchRequestedHeader,
            body: Locale.yubiKeyTouchRequestedBody.replace('{}', serial),
            buttons: [Alerts.buttons.cancel],
            icon: 'usb-token',
            cancel: () => {
                logger.info('Touch alert closed');

                const err = new Error('User canceled the YubiKey touch prompt');
                err.userCanceled = true;
                err.ykError = true;

                return callback(err);
            }
        });
    },

    clearCache(params) {
        delete this.cache[this.getCacheKey(params)];
    }
};

export { ChalRespCalculator };

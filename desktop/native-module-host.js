const { readXoredValue, makeXoredValue } = require('./scripts/util/byte-utils');
const { reqNative } = require('./scripts/util/req-native');

const YubiKeyVendorIds = [0x1050];
const attachedYubiKeys = [];
let usbListenerRunning = false;
let autoType;

startListener();

const messageHandlers = {
    startUsbListener() {
        if (usbListenerRunning) {
            return;
        }

        const usb = reqNative('usb');

        fillAttachedYubiKeys();

        usb.on('attach', usbDeviceAttached);
        usb.on('detach', usbDeviceDetached);

        usb._enableHotplugEvents();

        usbListenerRunning = true;
    },

    stopUsbListener() {
        if (!usbListenerRunning) {
            return;
        }

        const usb = reqNative('usb');

        usb.off('attach', usbDeviceAttached);
        usb.off('detach', usbDeviceDetached);

        usb._disableHotplugEvents();

        usbListenerRunning = false;
        attachedYubiKeys.length = 0;
    },

    getYubiKeys(config) {
        return new Promise((resolve, reject) => {
            const ykChapResp = reqNative('yubikey-chalresp');
            ykChapResp.getYubiKeys(config, (err, yubiKeys) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(yubiKeys);
                }
            });
        });
    },

    yubiKeyChallengeResponse(yubiKey, challenge, slot, callbackId) {
        const ykChalResp = reqNative('yubikey-chalresp');
        challenge = Buffer.from(challenge);
        ykChalResp.challengeResponse(yubiKey, challenge, slot, (error, result) => {
            if (error) {
                if (error.code === ykChalResp.YK_ENOKEY) {
                    error.noKey = true;
                }
                if (error.code === ykChalResp.YK_ETIMEOUT) {
                    error.timeout = true;
                }
            }
            if (result) {
                result = [...result];
            }
            return callback('yubiKeyChallengeResponseResult', { callbackId, error, result });
        });
    },

    yubiKeyCancelChallengeResponse() {
        const ykChalResp = reqNative('yubikey-chalresp');
        ykChalResp.cancelChallengeResponse();
    },

    argon2(password, salt, options) {
        const argon2 = reqNative('argon2');

        password = readXoredValue(password);
        salt = readXoredValue(salt);

        return new Promise((resolve, reject) => {
            try {
                argon2.hash(password, salt, options, (err, res) => {
                    password.fill(0);
                    salt.fill(0);

                    if (err) {
                        reject(err);
                    } else {
                        resolve(makeXoredValue(res));
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    },

    kbdGetActiveWindow(options) {
        return getAutoType().activeWindow(options);
    },

    kbdGetActivePid() {
        return getAutoType().activePid();
    },

    kbdShowWindow(win) {
        return getAutoType().showWindow(win);
    },

    kbdText(str) {
        return getAutoType().text(str);
    },

    kbdKeyPress(code, modifiers) {
        return getAutoType().keyPress(kbdKeyCode(code), kbdModifier(modifiers));
    },

    kbdShortcut(code) {
        return getAutoType().shortcut(kbdKeyCode(code));
    },

    kbdKeyMoveWithCode(down, code, modifiers) {
        return getAutoType().keyMoveWithCode(down, kbdKeyCode(code), kbdModifier(modifiers));
    },

    kbdKeyMoveWithModifier(down, modifiers) {
        return getAutoType().keyMoveWithModifier(down, kbdModifier(modifiers));
    },

    kbdKeyMoveWithCharacter(down, character, code, modifiers) {
        return getAutoType().keyMoveWithCharacter(down, character, code, kbdModifier(modifiers));
    },

    kbdEnsureModifierNotPressed() {
        return getAutoType().ensureModifierNotPressed();
    }
};

function isYubiKey(device) {
    return YubiKeyVendorIds.includes(device.deviceDescriptor.idVendor);
}

function usbDeviceAttached(device) {
    if (isYubiKey(device)) {
        attachedYubiKeys.push(device);
        reportYubiKeys();
    }
}

function usbDeviceDetached(device) {
    if (isYubiKey(device)) {
        const index = attachedYubiKeys.findIndex((yk) => yk.deviceAddress === device.deviceAddress);
        if (index >= 0) {
            attachedYubiKeys.splice(index, 1);
        }
        reportYubiKeys();
    }
}

function fillAttachedYubiKeys() {
    const usb = reqNative('usb');
    attachedYubiKeys.push(...usb.getDeviceList().filter(isYubiKey));
    reportYubiKeys();
}

function reportYubiKeys() {
    callback('yubikeys', attachedYubiKeys.length);
}

function getAutoType() {
    if (!autoType) {
        const keyboardAutoType = reqNative('keyboard-auto-type');
        autoType = new keyboardAutoType.AutoType();
    }
    return autoType;
}

function kbdKeyCode(code) {
    const { KeyCode } = reqNative('keyboard-auto-type');
    const kbdCode = KeyCode[code];
    if (!kbdCode) {
        throw new Error(`Bad code: ${code}`);
    }
    return kbdCode;
}

function kbdModifier(modifiers) {
    const { Modifier } = reqNative('keyboard-auto-type');
    let modifier = Modifier.None;
    if (modifiers) {
        for (const mod of modifiers) {
            if (!Modifier[mod]) {
                throw new Error(`Bad modifier: ${mod}`);
            }
            modifier |= Modifier[mod];
        }
    }
    return modifier;
}

function startListener() {
    process.on('message', ({ callId, cmd, args }) => {
        Promise.resolve()
            .then(() => {
                const handler = messageHandlers[cmd];
                if (handler) {
                    return handler(...args);
                } else {
                    throw new Error(`Handler not found: ${cmd}`);
                }
            })
            .then((result) => {
                callback('result', { callId, result });
            })
            .catch((error) => {
                error = {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code
                };
                callback('result', { callId, error });
            });
    });

    process.on('disconnect', () => {
        process.exit(0);
    });
}

function callback(cmd, ...args) {
    try {
        process.send({ cmd, args });
    } catch {}
}

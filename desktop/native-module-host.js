const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');

let appMainRoot;
const nativeModules = {};

const YubiKeyVendorIds = [0x1050];
const attachedYubiKeys = [];
let usbListenerRunning = false;

startListener();

const messageHandlers = {
    init(root) {
        appMainRoot = root;
    },

    'start-usb'() {
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

    'stop-usb'() {
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

    'get-yubikeys'(config) {
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

    'yk-chal-resp'(yubiKey, challenge, slot, callbackId) {
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
            return callback('yk-chal-resp-result', { callbackId, error, result });
        });
    },

    'yk-cancel-chal-resp'() {
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
                        const xoredRes = makeXoredValue(res);
                        res.fill(0);

                        resolve(xoredRes);

                        setTimeout(() => {
                            xoredRes.data.fill(0);
                            xoredRes.random.fill(0);
                        }, 0);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }
};

const moduleInit = {
    usb(binding) {
        Object.keys(EventEmitter.prototype).forEach((key) => {
            binding[key] = EventEmitter.prototype[key];
        });
        return binding;
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

function reqNative(mod) {
    if (nativeModules[mod]) {
        return nativeModules[mod];
    }

    const fileName = `${mod}-${process.platform}-${process.arch}.node`;

    const modulePath = `../node_modules/@keeweb/keeweb-native-modules/${fileName}`;
    const fullPath = path.join(appMainRoot, modulePath);

    let binding = require(fullPath);

    if (moduleInit[mod]) {
        binding = moduleInit[mod](binding);
    }

    nativeModules[mod] = binding;
    return binding;
}

function readXoredValue(val) {
    const data = Buffer.from(val.data);
    const random = Buffer.from(val.random);

    val.data.fill(0);
    val.random.fill(0);

    for (let i = 0; i < data.length; i++) {
        data[i] ^= random[i];
    }

    random.fill(0);

    return data;
}

function makeXoredValue(val) {
    const data = Buffer.from(val);
    const random = crypto.randomBytes(data.length);
    for (let i = 0; i < data.length; i++) {
        data[i] ^= random[i];
    }
    const result = { data: [...data], random: [...random] };
    data.fill(0);
    random.fill(0);
    return result;
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

// https://support.yubico.com/support/solutions/articles/15000028104-yubikey-usb-id-values
// https://github.com/Yubico/yubikey-personalization/blob/master/ykcore/ykdef.h#L274

const YubiKeyVendorId = 0x1050;

const YubiKeyProductIds = {
    Gen1: [0x0010],
    NEO: [0x0110, 0x0112, 0x0113, 0x0114, 0x0115, 0x0116],
    YK4: [0x0401, 0x0402, 0x0403, 0x0404, 0x0405, 0x0406, 0x0407]
};

const YubiKeyChallengeSize = 64;

export { YubiKeyVendorId, YubiKeyProductIds, YubiKeyChallengeSize };

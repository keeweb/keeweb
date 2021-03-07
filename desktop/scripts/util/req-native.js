const { EventEmitter } = require('events');
const nativeModules = {};

const moduleInit = {
    usb(binding) {
        Object.keys(EventEmitter.prototype).forEach((key) => {
            binding[key] = EventEmitter.prototype[key];
        });
        return binding;
    }
};

module.exports.reqNative = function reqNative(mod) {
    if (nativeModules[mod]) {
        return nativeModules[mod];
    }

    const fileName = `${mod}-${process.platform}-${process.arch}.node`;
    const modulePath = `@keeweb/keeweb-native-modules/${fileName}`;

    let binding = require(modulePath);

    if (moduleInit[mod]) {
        binding = moduleInit[mod](binding);
    }

    nativeModules[mod] = binding;
    return binding;
};

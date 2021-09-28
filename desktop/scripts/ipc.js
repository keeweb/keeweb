module.exports.setupIpcHandlers = () => {
    require('./ipc-handlers/browser-extension-connector');
    require('./ipc-handlers/hardware-crypto');
    require('./ipc-handlers/native-module-host-proxy');
    require('./ipc-handlers/spawn-process');
    require('./ipc-handlers/set-locale');
};

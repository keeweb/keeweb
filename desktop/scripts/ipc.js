const { ipcMain } = require('electron');
const { hardwareEncrypt, hardwareDecrypt } = require('./ipc-handlers/hardware-crypto');
const { nativeModuleCall } = require('./ipc-handlers/native-module-host-proxy');

module.exports.setupIpcHandlers = () => {
    ipcMain.handle('hardwareEncrypt', hardwareEncrypt);
    ipcMain.handle('hardwareDecrypt', hardwareDecrypt);
    ipcMain.on('nativeModuleCall', nativeModuleCall);
};

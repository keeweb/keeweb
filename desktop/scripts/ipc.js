const { ipcMain } = require('electron');
const {
    hardwareCryptoDeleteKey,
    hardwareEncrypt,
    hardwareDecrypt
} = require('./ipc-handlers/hardware-crypto');
const { spawnProcess } = require('./ipc-handlers/spawn-process');
const { nativeModuleCall } = require('./ipc-handlers/native-module-host-proxy');

module.exports.setupIpcHandlers = () => {
    ipcMain.handle('hardwareCryptoDeleteKey', hardwareCryptoDeleteKey);
    ipcMain.handle('hardwareEncrypt', hardwareEncrypt);
    ipcMain.handle('hardwareDecrypt', hardwareDecrypt);
    ipcMain.handle('spawnProcess', spawnProcess);
    ipcMain.on('nativeModuleCall', nativeModuleCall);
};

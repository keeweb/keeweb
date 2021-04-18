const { ipcMain } = require('electron');

ipcMain.handle('browserExtensionConnectorStart', () => {});
ipcMain.handle('browserExtensionConnectorStop', () => {});

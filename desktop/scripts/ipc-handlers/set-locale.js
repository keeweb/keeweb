const { ipcMain } = require('electron');
const { setLocale } = require('../locale');

ipcMain.handle('setLocale', (e, values) => setLocale(values));

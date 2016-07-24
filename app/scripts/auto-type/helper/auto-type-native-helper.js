'use strict';

const Launcher = require('../../comp/launcher');

const AutoTypeNativeHelper = {
    getHelperPath() {
        let ext = process.platform === 'win32' ? '.exe' : '';
        let path = `helper/${process.platform}/KeeWebHelper${ext}`;
        return Launcher.getAppPath(path);
    }
};

module.exports = AutoTypeNativeHelper;

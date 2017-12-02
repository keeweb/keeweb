const Launcher = require('../../comp/launcher');
const Logger = require('../../util/logger');

const logger = new Logger('auto-type');

const AutoTypeNativeHelper = {
    getHelperPath() {
        if (this._helperPath) {
            return this._helperPath;
        }
        const ext = process.platform === 'win32' ? '.exe' : '';
        const helperRelPath = `helper/${process.platform}/KeeWebHelper${ext}`;
        const helperPath = Launcher.getAppPath(helperRelPath);
        Launcher.ensureRunnable(helperPath);
        logger.debug('Using auto-type helper', helperPath);
        this._helperPath = helperPath;
        return helperPath;
    }
};

module.exports = AutoTypeNativeHelper;

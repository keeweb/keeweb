const Launcher = require('../../comp/launcher');
const Logger = require('../../util/logger');

const logger = new Logger('auto-type');

const AutoTypeNativeHelper = {
    getHelperPath() {
        if (this._helperPath) {
            return this._helperPath;
        }
        const ext = process.platform === 'win32' ? '.exe' : '';
        const part = `helper/${process.platform}/KeeWebHelper${ext}`;
        const possiblePaths = [
            Launcher.getAppPath(part),
            Launcher.getUserDataPath(part),
            Launcher.getWorkDirPath(part)
        ];
        let helperPath;
        const helperCTime = -1;
        possiblePaths.forEach(possiblePath => {
            try {
                const ctime = Launcher.statFileSync(possiblePath).ctime;
                if (ctime > helperCTime) {
                    helperPath = possiblePath;
                }
            } catch (e) {}
        });
        if (!helperPath) {
            logger.error('Helper not found. Searched paths:', possiblePaths.join(', '));
            throw 'Helper not found';
        }
        Launcher.ensureRunnable(helperPath);
        logger.debug('Using auto-type helper', helperPath);
        this._helperPath = helperPath;
        return helperPath;
    }
};

module.exports = AutoTypeNativeHelper;

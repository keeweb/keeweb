import Launcher from '../comp/launcher';

const AutoTypeHelperFactory = {
    create: function() {
        if (Launcher && Launcher.autoTypeSupported) {
            const AutoTypeHelper = require('./helper/auto-type-helper-' + Launcher.platform()).default;
            return new AutoTypeHelper();
        }
        return null;
    }
};

export default AutoTypeHelperFactory;

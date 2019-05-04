import Launcher from '../comp/launcher';

const IoCache = Launcher ? require('./io-file-cache').default : require('./io-browser-cache').default;

export default IoCache;

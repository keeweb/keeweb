const Launcher = require('../comp/launcher');

const IoCache = Launcher ? require('./io-file-cache') : require('./io-browser-cache');

module.exports = IoCache;

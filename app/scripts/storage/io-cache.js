'use strict';

const Launcher = require('../comp/launcher');

const IoCache = Launcher ? require('./io-browser-cache') : require('./io-browser-cache'); // TODO: use file cache

module.exports = IoCache;

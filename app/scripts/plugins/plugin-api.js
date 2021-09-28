/* eslint-disable import/no-commonjs */

const Libs = {
    kdbxweb: require('kdbxweb'),
    hbs: require('hbs'),
    pikaday: require('pikaday'),
    qrcode: require('jsqrcode')
};

const PluginApi = {
    require(module) {
        return Libs[module] || require('../' + module);
    }
};

export { PluginApi };

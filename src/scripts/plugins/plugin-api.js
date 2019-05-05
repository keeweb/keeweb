const Libs = {
    backbone: require('backbone'),
    _: require('underscore'),
    underscore: require('underscore'),
    $: require('jquery'),
    jquery: require('jquery'),
    kdbxweb: require('kdbxweb'),
    hbs: require('handlebars/runtime'),
    pikaday: require('pikaday'),
    qrcode: require('jsqrcode')
};

const PluginApi = {
    require(module) {
        return Libs[module] || require('../' + module);
    }
};

export default PluginApi;

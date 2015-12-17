'use strict';

var Handlebars = require('hbs'),
    Locale = require('../util/locale');

Handlebars.registerHelper('res', function(key, options) {
    var value = Locale[key];
    if (value) {
        var ix = value.indexOf('{}');
        if (ix >= 0) {
            value = value.replace('{}', options.fn(this));
        }
    }
    return value;
});

Handlebars.registerHelper('Res', function(key) {
    var value = Locale[key];
    if (value) {
        value = value[0].toUpperCase() + value.substr(1);
    }
    return value;
});

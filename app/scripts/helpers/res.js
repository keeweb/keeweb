const Handlebars = require('hbs');
const Locale = require('../util/locale');

Handlebars.registerHelper('res', function(key, options) {
    let value = Locale[key];
    if (value) {
        const ix = value.indexOf('{}');
        if (ix >= 0) {
            value = value.replace('{}', options.fn(this));
        }
    }
    return value;
});

Handlebars.registerHelper('Res', function(key) { // eslint-disable-line prefer-arrow-callback
    let value = Locale[key];
    if (value) {
        value = value[0].toUpperCase() + value.substr(1);
    }
    return value;
});

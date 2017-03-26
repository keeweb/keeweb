'use strict';

const Handlebars = require('hbs');

Handlebars.registerHelper('platform', function() { // eslint-disable-line prefer-arrow-callback
    return process.platform;
});

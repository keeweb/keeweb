const Handlebars = require('hbs');

Handlebars.registerHelper('ifneq', function(lvalue, rvalue, options) {
    return lvalue !== rvalue ? options.fn(this) : options.inverse(this);
});

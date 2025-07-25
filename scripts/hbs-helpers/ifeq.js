import Handlebars from 'hbs';

Handlebars.registerHelper('ifeq', function (lvalue, rvalue, options) {
    return lvalue === rvalue ? options.fn(this) : options.inverse(this);
});

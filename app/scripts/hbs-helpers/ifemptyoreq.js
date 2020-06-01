import Handlebars from 'hbs';

Handlebars.registerHelper('ifemptyoreq', function (lvalue, rvalue, options) {
    return !lvalue || lvalue === rvalue ? options.fn(this) : options.inverse(this);
});

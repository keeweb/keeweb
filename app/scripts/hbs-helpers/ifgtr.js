import Handlebars from 'hbs';

Handlebars.registerHelper('ifgtr', function (lvalue, rvalue, options) {
    return lvalue > rvalue ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifgeq', function (lvalue, rvalue, options) {
    return lvalue >= rvalue ? options.fn(this) : options.inverse(this);
});

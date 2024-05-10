import Handlebars from 'hbs';

Handlebars.registerHelper('iflss', function (lvalue, rvalue, options) {
    return lvalue < rvalue ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifleq', function (lvalue, rvalue, options) {
    return lvalue <= rvalue ? options.fn(this) : options.inverse(this);
});

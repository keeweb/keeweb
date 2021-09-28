import Handlebars from 'hbs';

Handlebars.registerHelper('cmp', function (lvalue, rvalue, op, options) {
    let cond;
    switch (op) {
        case '<':
            cond = lvalue < rvalue;
            break;
        case '>':
            cond = lvalue > rvalue;
            break;
        case '>=':
            cond = lvalue >= rvalue;
            break;
        case '<=':
            cond = lvalue <= rvalue;
            break;
        case '===':
        case '==':
            cond = lvalue === rvalue;
            break;
        case '!==':
        case '!=':
            cond = lvalue !== rvalue;
            break;
    }
    return cond ? options.fn(this) : options.inverse(this);
});

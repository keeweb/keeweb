'use strict';

var Handlebars = require('hbs');

Handlebars.registerHelper('cmp', function(lvalue, rvalue, op, options) {
    var cond;
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

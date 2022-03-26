import Handlebars from 'hbs';

Handlebars.registerHelper('lookupfield', function (array, field, value) {
    return array.find(elem => elem[field] == value);
});


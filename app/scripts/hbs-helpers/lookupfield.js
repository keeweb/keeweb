import Handlebars from 'hbs';

Handlebars.registerHelper('lookupfield', (array, field, value) => {
    return array.find((elem) => elem[field] === value);
});

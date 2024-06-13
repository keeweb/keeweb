import Handlebars from 'hbs';
import { Locale } from 'util/locale';

Handlebars.registerHelper('res', function (key, options) {
    let value = Locale[key];
    if (value) {
        const ix = value.indexOf('{}');
        if (ix >= 0) {
            value = value.replace('{}', options.fn(this));
        }
    }
    return value;
});

Handlebars.registerHelper('Res', (key, options) => {
    let value = Locale[key];
    if (value) {
        value = value[0].toUpperCase() + value.slice(1);
        const ix = value.indexOf('{}');
        if (ix >= 0) {
            value = value.replace('{}', options.fn(this));
        }
    }
    return value;
});

import Handlebars from 'hbs';

Handlebars.registerHelper('svg', (name, cls) => {
    const icon = require(`svg/${name}.svg`).default;
    if (typeof cls === 'string') {
        return `<svg class="${cls}"` + icon.substr(4);
    }
    return icon;
});

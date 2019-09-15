import Handlebars from 'hbs';

// inspired by https://stackoverflow.com/questions/22103989/adding-offset-to-index-when-looping-through-items-in-handlebars/39588001#39588001
Handlebars.registerHelper('add', (lvalue, rvalue) => parseInt(lvalue) + parseInt(rvalue));

// This file is here for smart IDE's who configure the resolve rules based on webpack.config.js
// This config is never used for building. The real thing is in build/webpack.config.js

const path = require('path');

module.exports = {
    resolve: {
        modules: [
            path.join(__dirname, 'app/scripts'),
            path.join(__dirname, 'app/styles'),
            path.join(__dirname, 'app/resources'),
            path.join(__dirname, 'node_modules')
        ],
        alias: {
            templates: path.join(__dirname, 'app/templates'),
            tests: path.join(__dirname, 'tests')
        }
    }
};

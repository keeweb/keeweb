const { spawn } = require('child_process');

function reg(...args) {
    spawn('REG', args);
}

module.exports.createKey = function (key, value) {
    return reg('ADD', key, '/ve', '/d', value, '/f');
};

module.exports.deleteKey = function (key) {
    return reg('DELETE', key, '/f');
};
